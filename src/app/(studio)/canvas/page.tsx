'use client';

import { useState, useCallback } from 'react';
import { suggestPairings } from './actions';
import type { PairingSuggestion } from '@/lib/ai-provider/types';
import DisplayModeSwitcher from '@/components/display-mode-switcher';
import type { Recipe } from '@/lib/types/recipe';

type ComplexityMode = 'foundation' | 'kitchen' | 'riff';

const FINGERPRINTS = [
  { id: 'matty-matheson', name: 'Matty Matheson' },
  { id: 'brad-leone', name: 'Brad Leone' },
  { id: 'ottolenghi', name: 'Ottolenghi' },
  { id: 'samin-nosrat', name: 'Samin Nosrat' },
  { id: 'claire-saffitz', name: 'Claire Saffitz' },
];

const MODES: { value: ComplexityMode; label: string; desc: string }[] = [
  { value: 'foundation', label: 'Foundation', desc: 'Learning mode — extra explanation and doneness cues' },
  { value: 'kitchen', label: 'Kitchen', desc: 'Professional but approachable — the default' },
  { value: 'riff', label: 'Riff', desc: 'Architecture only — for experienced cooks' },
];

export default function CanvasPage() {
  const [dish, setDish] = useState('');
  const [fpId, setFpId] = useState(FINGERPRINTS[0].id);
  const [mode, setMode] = useState<ComplexityMode>('kitchen');
  const [servings, setServings] = useState(4);
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  const [season, setSeason] = useState('');
  const [constraints, setConstraints] = useState('');
  const [showMore, setShowMore] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);

  const [pairingIng, setPairingIng] = useState('');
  const [pairings, setPairings] = useState<PairingSuggestion[]>([]);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [showPairing, setShowPairing] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!dish.trim()) return;
    setGenerating(true);
    setError(null);
    setRecipe(null);
    setRawText(null);

    try {
      const body: Record<string, unknown> = { dishDescription: dish.trim(), fingerprintId: fpId, complexityMode: mode, servings };
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
        setError(data?.error ?? 'Generation failed. Please try again.');
        return;
      }

      const data = await res.json();

      if (data.recipe && typeof data.recipe === 'object' && data.recipe.title) {
        setRecipe(data.recipe as Recipe);
      } else if (data.rawText) {
        setRawText(data.rawText);
      } else if (data.recipe) {
        // Recipe came back but might not have expected shape — try to display anyway
        setRecipe(data.recipe as Recipe);
      } else {
        setError('No recipe returned.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [dish, fpId, mode, servings, occasion, mood, season, constraints]);

  const handlePairing = useCallback(async () => {
    if (!pairingIng.trim()) return;
    setPairingLoading(true);
    const result = await suggestPairings(pairingIng.trim(), fpId);
    setPairingLoading(false);
    if (result.success) setPairings(result.data);
  }, [pairingIng, fpId]);

  const fp = FINGERPRINTS.find(f => f.id === fpId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Recipe Canvas</h1>
      <p className="mb-8 text-sm text-gray-500">Describe your dish and let MISE generate a structured, restaurant-quality recipe.</p>

      {/* Form */}
      <div className="mb-8 space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="dish" className="mb-1 block text-sm font-medium">What would you like to cook?</label>
          <textarea id="dish" value={dish} onChange={e => setDish(e.target.value)} disabled={generating}
            placeholder="e.g. A hearty lamb shoulder braise with preserved lemon and olives..." rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="fp" className="mb-1 block text-sm font-medium">Chef Fingerprint</label>
            <select id="fp" value={fpId} onChange={e => setFpId(e.target.value)} disabled={generating}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {FINGERPRINTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mode" className="mb-1 block text-sm font-medium">Complexity</label>
            <select id="mode" value={mode} onChange={e => setMode(e.target.value as ComplexityMode)} disabled={generating}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">{MODES.find(m => m.value === mode)?.desc}</p>
          </div>
          <div>
            <label htmlFor="srv" className="mb-1 block text-sm font-medium">Servings</label>
            <input id="srv" type="number" min={1} value={servings} disabled={generating}
              onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) setServings(v); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <button type="button" onClick={() => setShowMore(!showMore)} className="text-sm font-medium text-blue-600 hover:text-blue-700">
            {showMore ? '▾ Fewer options' : '▸ More options'}
          </button>
          {showMore && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-sm font-medium">Occasion</label>
                <input type="text" value={occasion} onChange={e => setOccasion(e.target.value)} disabled={generating} placeholder="e.g. weeknight, dinner party"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium">Mood</label>
                <input type="text" value={mood} onChange={e => setMood(e.target.value)} disabled={generating} placeholder="e.g. comfort, impressive"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium">Season</label>
                <input type="text" value={season} onChange={e => setSeason(e.target.value)} disabled={generating} placeholder="e.g. winter, summer"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none" /></div>
              <div><label className="mb-1 block text-sm font-medium">Constraints</label>
                <input type="text" value={constraints} onChange={e => setConstraints(e.target.value)} disabled={generating} placeholder="e.g. dairy-free, no nuts"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none" /></div>
            </div>
          )}
        </div>

        {fp && <p className="text-xs text-gray-400">Active fingerprint: <span className="font-medium text-gray-600">{fp.name}</span></p>}

        <button type="button" onClick={handleGenerate} disabled={generating || !dish.trim()}
          className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50">
          {generating ? 'Generating…' : 'Generate Recipe'}
        </button>
      </div>

      {/* Loading */}
      {generating && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-sm text-blue-700">Assembling your recipe — this takes 15-30 seconds…</p>
          <p className="text-xs text-blue-500">The AI is building components, flavour architecture, and thinking through the dish.</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm text-red-700">{error}</p>
          <button type="button" onClick={handleGenerate} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">Try Again</button>
        </div>
      )}

      {/* Recipe Display */}
      {recipe && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <DisplayModeSwitcher recipe={recipe} />
        </div>
      )}

      {/* Fallback: raw text if JSON parsing failed */}
      {rawText && !recipe && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Your Recipe</h2>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">{rawText}</div>
        </div>
      )}

      {/* Pairing */}
      <div className="mb-8">
        <button type="button" onClick={() => setShowPairing(!showPairing)} className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-700">
          {showPairing ? '▾ Hide Pairing Suggestions' : '▸ Ingredient Pairing Suggestions'}
        </button>
        {showPairing && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex gap-2">
              <input type="text" value={pairingIng} onChange={e => setPairingIng(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePairing()}
                placeholder="e.g. preserved lemon, miso…" className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none" />
              <button type="button" onClick={handlePairing} disabled={pairingLoading || !pairingIng.trim()}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                {pairingLoading ? 'Finding…' : 'Pair'}
              </button>
            </div>
            {pairings.length > 0 && (
              <div className="mt-3 space-y-2">
                {pairings.map((s, i) => (
                  <div key={i} className="rounded-md border border-gray-100 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.ingredient}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{s.affinity}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
