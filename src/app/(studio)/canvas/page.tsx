'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

type ComplexityMode = 'foundation' | 'kitchen' | 'riff';

const FINGERPRINTS = [
  { id: 'matty-matheson', name: 'Matty Matheson' },
  { id: 'brad-leone', name: 'Brad Leone' },
  { id: 'ottolenghi', name: 'Ottolenghi' },
  { id: 'samin-nosrat', name: 'Samin Nosrat' },
  { id: 'claire-saffitz', name: 'Claire Saffitz' },
];

const MODES: { value: ComplexityMode; label: string; desc: string }[] = [
  { value: 'foundation', label: 'Foundation', desc: 'Extra explanation and doneness cues' },
  { value: 'kitchen', label: 'Kitchen', desc: 'Professional but approachable' },
  { value: 'riff', label: 'Riff', desc: 'Architecture only — experienced cooks' },
];

export default function CanvasPage() {
  const [dish, setDish] = useState('');
  const [fpId, setFpId] = useState(FINGERPRINTS[2].id); // Ottolenghi default
  const [mode, setMode] = useState<ComplexityMode>('kitchen');
  const [servings, setServings] = useState(4);
  const [showMore, setShowMore] = useState(false);
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  const [season, setSeason] = useState('');
  const [constraints, setConstraints] = useState('');

  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!dish.trim()) return;
    setGenerating(true);
    setContent('');
    setError(null);
    setDone(false);

    try {
      const body: Record<string, unknown> = {
        dishDescription: dish.trim(), fingerprintId: fpId,
        complexityMode: mode, servings,
      };
      if (occasion.trim()) body.occasion = occasion.trim();
      if (mood.trim()) body.mood = mood.trim();
      if (season.trim()) body.season = season.trim();
      if (constraints.trim()) body.constraints = constraints.split(',').map(c => c.trim()).filter(Boolean);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Generation failed (${res.status}).`);
        return;
      }

      if (!res.body) { setError('No response.'); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        text += decoder.decode(value, { stream: true });
        setContent(text);
      }

      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [dish, fpId, mode, servings, occasion, mood, season, constraints]);

  const fp = FINGERPRINTS.find(f => f.id === fpId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold">Recipe Canvas</h1>
      <p className="mb-8 text-sm text-gray-500">Describe your dish and MISE will generate a structured, restaurant-quality recipe.</p>

      {/* Form */}
      <div className="mb-8 space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="dish" className="mb-1 block text-sm font-medium text-gray-700">What would you like to cook?</label>
          <textarea id="dish" value={dish} onChange={e => setDish(e.target.value)} disabled={generating}
            placeholder="e.g. A hearty lamb shoulder braise with preserved lemon and olives, something that fills the house with warmth..."
            rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="fp" className="mb-1 block text-sm font-medium text-gray-700">Chef Fingerprint</label>
            <select id="fp" value={fpId} onChange={e => setFpId(e.target.value)} disabled={generating}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
              {FINGERPRINTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mode" className="mb-1 block text-sm font-medium text-gray-700">Complexity</label>
            <select id="mode" value={mode} onChange={e => setMode(e.target.value as ComplexityMode)} disabled={generating}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900">
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">{MODES.find(m => m.value === mode)?.desc}</p>
          </div>
          <div>
            <label htmlFor="srv" className="mb-1 block text-sm font-medium text-gray-700">Servings</label>
            <input id="srv" type="number" min={1} value={servings} disabled={generating}
              onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) setServings(v); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" />
          </div>
        </div>

        <div>
          <button type="button" onClick={() => setShowMore(!showMore)} className="text-sm font-medium text-gray-500 hover:text-gray-700">
            {showMore ? '▾ Fewer options' : '▸ More options'}
          </button>
          {showMore && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { id: 'occ', label: 'Occasion', val: occasion, set: setOccasion, ph: 'weeknight, dinner party' },
                { id: 'mood', label: 'Mood', val: mood, set: setMood, ph: 'comfort, impressive' },
                { id: 'ssn', label: 'Season', val: season, set: setSeason, ph: 'winter, summer' },
                { id: 'cst', label: 'Constraints', val: constraints, set: setConstraints, ph: 'dairy-free, no nuts' },
              ].map(f => (
                <div key={f.id}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{f.label}</label>
                  <input type="text" value={f.val} onChange={e => f.set(e.target.value)} disabled={generating} placeholder={f.ph}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none" />
                </div>
              ))}
            </div>
          )}
        </div>

        {fp && <p className="text-xs text-gray-400">Active fingerprint: <span className="font-medium text-gray-600">{fp.name}</span></p>}

        <button type="button" onClick={handleGenerate} disabled={generating || !dish.trim()}
          className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50">
          {generating ? 'Generating…' : 'Generate Recipe'}
        </button>
      </div>

      {/* Loading */}
      {generating && !content && (
        <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-blue-700">Assembling your recipe…</p>
          <p className="text-xs text-blue-500">Building components, flavour architecture, and thinking through the dish.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm text-red-700">{error}</p>
          <button type="button" onClick={handleGenerate} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Try Again</button>
        </div>
      )}

      {/* Streamed Recipe — renders markdown live as it arrives */}
      {content && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Header bar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
            <div className="flex items-center gap-2">
              {generating && <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />}
              <span className="text-sm font-medium text-gray-700">{done ? 'Recipe ready' : 'Generating…'}</span>
            </div>
            {done && (
              <div className="flex gap-2">
                <button type="button" onClick={() => { navigator.clipboard.writeText(content); }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Copy
                </button>
                <button type="button" onClick={() => {
                  const blob = new Blob([content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'recipe.md'; a.click();
                  URL.revokeObjectURL(url);
                }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Download .md
                </button>
              </div>
            )}
          </div>

          {/* Rendered markdown */}
          <div className="prose prose-gray max-w-none px-6 py-6 prose-headings:font-semibold prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4 prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-h3:mt-6 prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-strong:text-gray-900 prose-em:text-gray-500">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
