import { FC } from 'react';

type Props = {
  prompt: string;
  setPrompt: (v: string) => void;
  images: string[];
  setImages: (v: string[]) => void;
  lint: { issues: string[]; suggestions: string[] };
  onGenerate: () => void;
  loading: boolean;
  genUrl: string;
};

const PromptForm: FC<Props> = ({ prompt, setPrompt, images, setImages, lint, onGenerate, loading, genUrl }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-3">
        <label className="text-sm font-medium">Prompt</label>
        <textarea
          className="w-full min-h-[220px] rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />

        <label className="text-sm font-medium">Reference Images (URLs, comma-separated)</label>
        <input
          className="w-full rounded-xl border p-2"
          placeholder="https://... , https://..."
          onChange={e => setImages(
            e.target.value
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          )}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={onGenerate}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm disabled:opacity-60"
            disabled={loading}
          >{loading ? 'Opening Lovable…' : 'Generate with Lovable'}</button>

          {genUrl && (
            <a href={genUrl} target="_blank" className="text-sm text-blue-600 hover:underline">Open last link</a>
          )}
        </div>
      </div>

      <aside className="bg-gray-50 rounded-xl border p-4">
        <h3 className="text-sm font-semibold mb-2">Prompt Analyzer (Heuristic)</h3>
        {lint.issues.length === 0 ? (
          <p className="text-sm text-emerald-700">No obvious gaps found. You can still add more specifics below.</p>
        ) : (
          <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
            {lint.issues.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        )}
        {lint.suggestions.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold">Suggestions</h4>
            <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
              {lint.suggestions.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
};

export default PromptForm;
