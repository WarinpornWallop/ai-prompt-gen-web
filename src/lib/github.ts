import unzipper from 'unzipper';

const OWNER = process.env.GITHUB_OWNER!;
const REPO  = process.env.GITHUB_REPO!;
const TOKEN = process.env.GITHUB_TOKEN!; // needs: actions:read

async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      ...(init.headers || {}),
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res;
}

export async function getLatestRun(): Promise<{ id: number; html_url?: string } | undefined> {
  const res = await gh(`/repos/${OWNER}/${REPO}/actions/runs?per_page=1`);
  const json = (await res.json()) as unknown;
  if (!json || typeof json !== 'object' || !('workflow_runs' in json)) return undefined;
  const wr = (json as { workflow_runs?: unknown[] }).workflow_runs; // local-only narrow
  if (Array.isArray(wr) && wr.length > 0) {
    const first = wr[0];
    if (first && typeof first === 'object' && 'id' in first && typeof (first as { id: unknown }).id === 'number') {
      // html_url is optional and may be undefined
      return {
        id: (first as { id: number }).id,
        html_url: (first as { html_url?: string }).html_url
      };
    }
  }
  return undefined;
}

export async function getArtifacts(runId: number) {
  const res = await gh(`/repos/${OWNER}/${REPO}/actions/runs/${runId}/artifacts`);
  const j = (await res.json()) as unknown;
  if (!j || typeof j !== 'object' || !('artifacts' in j)) return [];
  const arts = (j as { artifacts?: unknown[] }).artifacts;
  return Array.isArray(arts) ? arts as Array<{ id:number; name:string; archive_download_url:string }> : [];
}

async function downloadArtifactZip(url: string): Promise<Buffer> {
  const res = await gh(url, { headers: { 'Accept': 'application/octet-stream' } });
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// helpers to safely read nested scores
function readScore(obj: unknown, path: string[]): number | undefined {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else return undefined;
  }
  return typeof cur === 'number' ? cur : undefined;
}

export async function parseQualityReports(
  arts: Array<{ name:string; archive_download_url:string }>
) {
  let lighthouse: { performance?: number; accessibility?: number; seo?: number; best?: number; raw?: unknown } | undefined;
  let pa11y: { errors: number; warnings: number; notices: number; raw?: unknown } | undefined;
  let semgrep: { findings: number; raw?: unknown } | undefined;
  let bearer: { findings: number; categories?: Record<string, number>; raw?: unknown } | undefined;
  let psi: { performance?: number; raw?: unknown } | undefined;

  for (const a of arts) {
    if (a.name !== 'quality-reports') continue;
    const buf = await downloadArtifactZip(a.archive_download_url);
    const directory = await unzipper.Open.buffer(buf);

    for (const entry of directory.files) {
      if (!entry.path) continue;
      const lower = entry.path.toLowerCase();
      if (!lower.endsWith('.json') && !lower.endsWith('.sarif')) continue;

      const content = await entry.buffer();
      let json: unknown;
      try { json = JSON.parse(content.toString('utf-8')); } catch { continue; }

      if (lower.includes('.lighthouseci') || (json && typeof json === 'object' && ('lighthouseResult' in json || 'categories' in json))) {
  const root = (json as { lighthouseResult?: unknown })?.lighthouseResult ?? json;
        lighthouse = {
          performance: (readScore(root, ['categories','performance','score']) ?? 0) * 100,
          accessibility: (readScore(root, ['categories','accessibility','score']) ?? 0) * 100,
          seo: (readScore(root, ['categories','seo','score']) ?? 0) * 100,
          best: (readScore(root, ['categories','best-practices','score']) ?? 0) * 100,
          raw: root,
        };
      } else if (lower.includes('pa11y')) {
        const arr = Array.isArray(json) ? json as Array<{ issues?: Array<{ type?: string }> }> : [];
        const tally = (type: string): number =>
          arr.reduce((acc: number, r) => {
            if (!r || typeof r !== 'object' || !('issues' in r)) return acc;
            const issues = (r as { issues?: Array<{ type?: string }> }).issues;
            if (!Array.isArray(issues)) return acc;
            return acc + issues.filter((i) => i && i.type === type).length;
          }, 0);
        pa11y = { errors: tally('error'), warnings: tally('warning'), notices: tally('notice'), raw: json };
      } else if (lower.endsWith('.sarif')) {
  const runs = (json && typeof json === 'object' && 'runs' in json) ? (json as { runs?: Array<{ results?: unknown[] }> }).runs : [];
  const results = Array.isArray(runs) && runs[0] && Array.isArray(runs[0].results) ? runs[0].results : [];
  semgrep = { findings: Array.isArray(results) ? results.length : 0, raw: json };
      } else if (lower.includes('bearer')) {
        const findings = (json && typeof json === 'object' && 'findings' in json && Array.isArray((json as { findings?: unknown[] }).findings))
          ? (json as { findings: unknown[] }).findings.length
          : ((json as { summary?: { total_findings?: number } })?.summary?.total_findings ?? 0);
        const categories: Record<string, number> = {};
        if (json && typeof json === 'object' && 'findings' in json && Array.isArray((json as { findings?: unknown[] }).findings)) {
          for (const f of (json as { findings: Array<{ rule?: { title?: string }; type?: string }> }).findings) {
            const cat: unknown = f?.rule?.title ?? f?.type ?? 'other';
            const key = typeof cat === 'string' ? cat : 'other';
            categories[key] = (categories[key] || 0) + 1;
          }
        }
        bearer = { findings, categories, raw: json };
      } else if (lower.includes('psi')) {
        const s = readScore(json, ['lighthouseResult','categories','performance','score']);
        psi = { performance: s ? s * 100 : undefined, raw: json };
      }
    }
  }

  return { lighthouse, pa11y, semgrep, bearer, psi };
}
