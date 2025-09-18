import { FC } from 'react';

export type Report = {
  lighthouse?: { performance?: number; accessibility?: number; seo?: number; best?: number; raw?: unknown };
  pa11y?: { errors: number; warnings: number; notices: number; raw?: unknown };
  semgrep?: { findings: number; raw?: unknown };
  bearer?: { findings: number; categories?: Record<string, number>; raw?: unknown };
  psi?: { performance?: number; raw?: unknown };
  meta?: { runId?: number; url?: string; updatedAt?: string };
};

const Score: FC<{ label: string; value?: number; suffix?: string }> = ({ label, value, suffix='%' }) => (
  <div className="rounded-xl border p-3">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold">{value==null ? '—' : Math.round(value) + suffix}</div>
  </div>
);

const ReportTabs: FC<{ report: Report | null }> = ({ report }) => {
  if (!report) return <p className="text-sm text-gray-500">No data yet. Click “Fetch Latest from CI”.</p>;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Score label="Lighthouse Perf" value={report.lighthouse?.performance} />
        <Score label="Lighthouse A11y" value={report.lighthouse?.accessibility} />
        <Score label="SEO" value={report.lighthouse?.seo} />
        <Score label="Best Practices" value={report.lighthouse?.best} />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Accessibility (Pa11y)</div>
          <div className="text-sm">Errors: <b>{report.pa11y?.errors ?? '—'}</b></div>
          <div className="text-sm">Warnings: <b>{report.pa11y?.warnings ?? '—'}</b></div>
          <div className="text-sm">Notices: <b>{report.pa11y?.notices ?? '—'}</b></div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Security (Semgrep)</div>
          <div className="text-sm">Findings: <b>{report.semgrep?.findings ?? '—'}</b></div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2">Privacy (Bearer)</div>
          <div className="text-sm">Findings: <b>{report.bearer?.findings ?? '—'}</b></div>
          {report.bearer?.categories && (
            <div className="text-xs text-gray-600 mt-2">
              {Object.entries(report.bearer.categories).map(([k,v]) => (
                <div key={k}>{k}: <b>{v}</b></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-3 text-sm text-gray-600">
        <div className="font-semibold">Meta</div>
        <div>URL: <a className="text-blue-600" href={report.meta?.url} target="_blank" rel="noreferrer">{report.meta?.url || '—'}</a></div>
        <div>Updated: {report.meta?.updatedAt || '—'}</div>
      </div>
    </div>
  );
};

export default ReportTabs;
