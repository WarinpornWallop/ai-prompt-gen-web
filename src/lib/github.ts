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
      ...init.headers,
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res;
}

export async function getLatestRun(): Promise<any> {
  const res = await gh(`/repos/${OWNER}/${REPO}/actions/runs?per_page=1`);
  const json = await res.json();
  return json.workflow_runs?.[0];
}

export async function getArtifacts(runId: number) {
  const res = await gh(`/repos/${OWNER}/${REPO}/actions/runs/${runId}/artifacts`);
  const j = await res.json();
  return j.artifacts as Array<{ id:number; name:string; archive_download_url:string }>;
}

async function downloadArtifactZip(url: string): Promise<Buffer> {
  const res = await gh(url, { headers: { 'Accept': 'application/octet-stream' }});
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseQualityReports(arts: Array<{ name:string; archive_download_url:string }>) {
  let lighthouse: any | undefined;
  let pa11y: any | undefined;
  let semgrep: any | undefined;
  let bearer: any | undefined;
  let psi: any | undefined;

  for (const a of arts) {
    if (a.name !== 'quality-reports') continue; // from workflow name
    const buf = await downloadArtifactZip(a.archive_download_url);
    const directory = await unzipper.Open.buffer(buf);

    for (const entry of directory.files) {
      if (!entry.path) continue;
      const lower = entry.path.toLowerCase();
      if (!lower.endsWith('.json') && !lower.endsWith('.sarif')) continue;
      const content = await entry.buffer();
      try {
        const json = JSON.parse(content.toString('utf-8'));
        if (lower.includes('.lighthouseci') || json.lighthouseResult || json.categories) {
          const root = json.lighthouseResult ? json.lighthouseResult : json;
          if (root.categories) {
            lighthouse = {
              performance: (root.categories.performance?.score ?? 0) * 100,
              accessibility: (root.categories.accessibility?.score ?? 0) * 100,
              seo: (root.categories.seo?.score ?? 0) * 100,
              best: (root.categories["best-practices"]?.score ?? 0) * 100,
              raw: root,
            };
          }
        } else if (lower.includes('pa11y')) {
          const errors = json.reduce((acc: number, r: any)=> acc + r.issues.filter((i:any)=> i.type === 'error').length, 0);
          const warnings = json.reduce((acc: number, r: any)=> acc + r.issues.filter((i:any)=> i.type === 'warning').length, 0);
          const notices = json.reduce((acc: number, r: any)=> acc + r.issues.filter((i:any)=> i.type === 'notice').length, 0);
          pa11y = { errors, warnings, notices, raw: json };
        } else if (lower.endsWith('.sarif')) {
          const findings = json.runs?.[0]?.results?.length ?? 0;
          semgrep = { findings, raw: json };
        } else if (lower.includes('bearer')) {
          const findings = json?.findings?.length ?? json?.summary?.total_findings ?? 0;
          const categories: Record<string, number> = {};
          if (Array.isArray(json?.findings)) {
            for (const f of json.findings) {
              const cat = f?.rule?.title || f?.type || 'other';
              categories[cat] = (categories[cat] || 0) + 1;
            }
          }
          bearer = { findings, categories, raw: json };
        } else if (lower.includes('psi')) {
          const perf = json?.lighthouseResult?.categories?.performance?.score;
          psi = { performance: perf ? perf * 100 : undefined, raw: json };
        }
      } catch (e) {
        // skip invalid json
      }
    }
  }

  return { lighthouse, pa11y, semgrep, bearer, psi };
}
