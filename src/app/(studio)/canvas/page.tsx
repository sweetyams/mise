'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import DisplayModeSwitcher from '@/components/display-mode-switcher';
import type { Recipe } from '@/lib/types/recipe';

type ComplexityMode = 'foundation' | 'kitchen' | 'riff';
type View = 'markdown' | 'structured';

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
  { value: 'riff', label: 'Riff', desc: 'Architecture only' },
];

export default function CanvasPage() {
  const [dish, setDish] = useState('');
  const [fpId, setFpId] = useState('ottolenghi');
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
  const [copied, setCopied] = useState(false);

  // Structured recipe (parsed from markdown after generation)
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<View>('markdown');

  const generate = useCallback(async () => {
    if (!dish.trim()) return;
    setGenerating(true);
    setContent('');
    setError(null);
    setDone(false);
    setRecipe(null);
    setSaved(false);
    setView('markdown');

    try {
      const b: Record<string, unknown> = { dishDescription: dish.trim(), fingerprintId: fpId, complexityMode: mode, servings };
      if (occasion.trim()) b.occasion = occasion.trim();
      if (mood.trim()) b.mood = mood.trim();
      if (season.trim()) b.season = season.trim();
      if (constraints.trim()) b.constraints = constraints.split(',').map(c => c.trim()).filter(Boolean);

      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
      if (!res.ok) { const d = await res.json().catch(() => null); setError(d?.error ?? 'Generation failed.'); return; }
      if (!res.body) { setError('No response.'); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        text += decoder.decode(value, { stream: true });
        setContent(text);
      }
      setDone(true);

      // Auto-parse into structured recipe in background
      setParsing(true);
      try {
        const parseRes = await fetch('/api/parse-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: text, fingerprintId: fpId }),
        });
        const parseData = await parseRes.json();
        if (parseData.recipe) {
          setRecipe(parseData.recipe);
          setSaved(true);
        }
      } catch {
        // Parse failed — markdown view still works
      } finally {
        setParsing(false);
      }
    } catch { setError('Something went wrong.'); } finally { setGenerating(false); }
  }, [dish, fpId, mode, servings, occasion, mood, season, constraints]);

  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const download = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `recipe-${Date.now()}.md`; a.click();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Recipe Canvas</h1>
      <p className="mb-6 text-sm text-gray-500">Describe your dish. MISE generates a structured, restaurant-quality recipe.</p>

      {/* Form */}
      <div className="mb-8 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <textarea value={dish} onChange={e => setDish(e.target.value)} disabled={generating} rows={2}
          placeholder="A hearty lamb shoulder braise with preserved lemon and olives…"
          className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none" />
        <div className="grid grid-cols-3 gap-3">
          <select value={fpId} onChange={e => setFpId(e.target.value)} disabled={generating}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none">
            {FINGERPRINTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={mode} onChange={e => setMode(e.target.value as ComplexityMode)} disabled={generating}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none">
            {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input type="number" min={1} value={servings} disabled={generating}
            onChange={e => { const v = parseInt(e.target.value); if (v > 0) setServings(v); }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
        </div>
        <button type="button" onClick={() => setShowMore(!showMore)} className="text-xs text-gray-400 hover:text-gray-600">
          {showMore ? '▾ fewer options' : '▸ more options'}
        </button>
        {showMore && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: occasion, s: setOccasion, p: 'Occasion' }, { v: mood, s: setMood, p: 'Mood' },
              { v: season, s: setSeason, p: 'Season' }, { v: constraints, s: setConstraints, p: 'Constraints' },
            ].map((f, i) => (
              <input key={i} type="text" value={f.v} onChange={e => f.s(e.target.value)} disabled={generating} placeholder={f.p}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-400 focus:outline-none" />
            ))}
          </div>
        )}
        <button onClick={generate} disabled={generating || !dish.trim()}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40">
          {generating ? 'Generating…' : 'Generate Recipe'}
        </button>
      </div>

      {/* Loading */}
      {generating && !content && (
        <div className="mb-6 flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
          <p className="text-sm text-gray-600">Building your recipe…</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error} <button onClick={generate} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Recipe output */}
      {content && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {generating && <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />}
              {parsing ? '⏳ Saving…' : saved ? '✓ Saved to library' : done ? '✓ Ready' : 'Streaming…'}
              <span className="text-gray-300">·</span>
              <span>{FINGERPRINTS.find(f => f.id === fpId)?.name}</span>
            </div>
            {done && (
              <div className="flex gap-1.5">
                {recipe && (
                  <>
                    <button onClick={() => setView('markdown')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ${view === 'markdown' ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}>
                      Article
                    </button>
                    <button onClick={() => setView('structured')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium shadow-sm ring-1 ${view === 'structured' ? 'bg-gray-900 text-white ring-gray-900' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}>
                      Display Modes
                    </button>
                  </>
                )}
                <button onClick={copy} className="rounded-md bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">
                  {copied ? '✓' : 'Copy'}
                </button>
                <button onClick={download} className="rounded-md bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">
                  .md
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {view === 'structured' && recipe ? (
            <div className="p-6">
              <DisplayModeSwitcher recipe={recipe} />
            </div>
          ) : (
            <article className="px-6 py-6">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="mb-4 border-b border-gray-200 pb-3 text-2xl font-bold text-gray-900">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-2 mt-6 text-base font-semibold text-gray-800">{children}</h3>,
                  p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-gray-700">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-1 text-sm text-gray-700">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 ml-4 list-decimal space-y-2 text-sm text-gray-700">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="text-gray-500">{children}</em>,
                  hr: () => <hr className="my-6 border-gray-200" />,
                  table: ({ children }) => <div className="mb-4 overflow-x-auto"><table className="w-full text-sm">{children}</table></div>,
                  thead: ({ children }) => <thead className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
                  th: ({ children }) => <th className="px-3 py-2">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 text-gray-700">{children}</td>,
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
