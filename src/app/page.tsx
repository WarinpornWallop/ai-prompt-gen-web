'use client';
import { useEffect, useMemo, useState } from 'react';
import PromptForm from '@/components/PromptForm';
import ReportTabs from '@/components/ReportTabs';
import { analyzePrompt } from '@/lib/analyze';

export default function HomePage() {
  const [prompt, setPrompt] = useState<string>(
    'Create a responsive landing page for a recycling project called "GreenLoop" with hero, features, CTA. Enforce semantic HTML, accessible navigation, keyboard focus states, high color contrast, alt text for images. Optimize CWV (LCP<2.5s, CLS<0.1, INP<200ms). Avoid heavy client JS, use lazy-loading. No inline event handlers. No third-party trackers. Include cookie consent and privacy link.'
  );
  const [images, setImages] = useState<string[]>([]);
  const [genUrl, setGenUrl] = useState<string>('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const lint = useMemo(() => analyzePrompt(prompt), [prompt]);

  const handleGenerate = async () => {
    setLoadingLink(true);
    try {
      const res = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageUrls: images }),
      });
      const data = await res.json();
      setGenUrl(data.url);
      window.open(data.url, '_blank');
    } finally {
      setLoadingLink(false);
    }
  };

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReport(data);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Citizen Dev – AI Web Builder + Quality Checker</h1>
          <a href="https://lovable.dev" target="_blank" className="text-sm text-blue-600 hover:underline">Lovable</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">1) Compose Prompt</h2>
          <PromptForm
            prompt={prompt}
            setPrompt={setPrompt}
            images={images}
            setImages={setImages}
            lint={lint}
            onGenerate={handleGenerate}
            loading={loadingLink}
            genUrl={genUrl}
          />
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">2) Quality Report</h2>
            <button
              onClick={loadReport}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-50"
              disabled={loadingReport}
            >{loadingReport ? 'Loading…' : 'Fetch Latest from CI'}</button>
          </div>
          <p className="text-sm text-gray-500">Tip: push/change in your repo to trigger CI, then click fetch.</p>
          <div className="mt-4">
            <ReportTabs report={report} />
          </div>
        </section>
      </main>
    </div>
  );
}
