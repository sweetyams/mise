'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseRecipeMarkdown } from '@/lib/recipe-parser';

type ComplexityMode = 'foundation' | 'kitchen' | 'riff';

interface ChefOption {
  id: string;
  name: string;
  slug?: string;
}

const MODES: { value: ComplexityMode; label: string }[] = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'riff', label: 'Riff' },
];

interface GenerationPanelProps {
  open: boolean;
  onClose: () => void;
  onRecipeSaved?: () => void;
}

export default function GenerationPanel({ open, onClose, onRecipeSaved }: GenerationPanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Chef profiles
  const [chefs, setChefs] = useState<ChefOption[]>([]);
  const [chefsLoading, setChefsLoading] = useState(true);
  const [fpId, setFpId] = useState('');

  // Generation params
  const [dish, setDish] = useState('');
  const [mode, setMode] = useState<ComplexityMode>('kitchen');
  const [servings, setServings] = useState(4);
  const [showContext, setShowContext] = useState(false);
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  const [season, setSeason] = useState('');
  const [constraints, setConstraints] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Load chefs
  useEffect(() => {
    fetch('/api/fingerprints')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.fingerprints) {
          setChefs(d.fingerprints);
          if (d.fingerprints.length > 0) {
            setFpId(d.fingerprints[0].slug ?? d.fingerprints[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setChefsLoading(false));
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const generate = useCallback(async () => {
    if (!dish.trim()) return;
    setGenerating(true);
    setContent('');
    setError(null);
    setDone(false);
    setSaved(false);
    setSavedId(null);

    try {
      const b: Record<string, unknown> = {
        dishDescription: dish.trim(),
        fingerprintId: fpId,
        complexityMode: mode,
        servings,
      };
      if (occasion.trim()) b.occasion = occasion.trim();
      if (mood.trim()) b.mood = mood.trim();
      if (season.trim()) b.season = season.trim();
      if (constraints.trim()) b.constraints = constraints.split(',').map(c => c.trim()).filter(Boolean);

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? 'Generation failed.');
        return;
      }
      if (!res.body) { setError('No response.'); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';

      while (true) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        text += decoder.decode(value, { stream: true });
        // Strip prompt log preamble if present
        const cleaned = text.replace(/<!--PROMPT_LOG:[\s\S]*?:END_PROMPT_LOG-->/, '');
        setContent(cleaned);
      }

      // Final clean
      text = text.replace(/<!--PROMPT_LOG:[\s\S]*?:END_PROMPT_LOG-->/, '');
      setContent(text);
      setDone(true);

      // Auto-parse and save
      try {
        const { recipe: parsedRecipe } = parseRecipeMarkdown(text);
        const saveRes = await fetch('/api/save-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: parsedRecipe.title || dish.trim(),
            markdown: text,
            fingerprintId: fpId,
            complexityMode: mode,
            intent: {
              occasion: occasion || '',
              mood: mood || '',
              season: season ? [season] : [],
              effort: parsedRecipe.intent?.effort || 'medium',
              feeds: parsedRecipe.intent?.feeds || servings,
              total_time_minutes: parsedRecipe.intent?.total_time_minutes || 0,
              active_time_minutes: parsedRecipe.intent?.active_time_minutes || 0,
              prep_ahead_notes: parsedRecipe.intent?.prep_ahead_notes || '',
              can_prep_ahead: !!parsedRecipe.intent?.prep_ahead_notes,
              hands_off_minutes: 0,
              dietary: [],
              dietary_notes: '',
              time: parsedRecipe.intent?.total_time_minutes || 0,
            },
            flavour: parsedRecipe.flavour,
            components: parsedRecipe.components,
            timeline: parsedRecipe.timeline,
            variations: parsedRecipe.variations,
            thinking: parsedRecipe.thinking,
            decision_lock_answers: parsedRecipe.decisionLockAnswers || null,
          }),
        });
        const saveData = await saveRes.json();
        if (saveData.saved) {
          setSaved(true);
          setSavedId(saveData.id);
          onRecipeSaved?.();
        }
      } catch {
        // Parse/save failed — content still visible
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setGenerating(false);
    }
  }, [dish, fpId, mode, servings, occasion, mood, season, constraints, onRecipeSaved]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !generating) {
      e.preventDefault();
      generate();
    }
  };

  const reset = () => {
    setDish('');
    setContent('');
    setError(null);
    setDone(false);
    setSaved(false);
    setSavedId(null);
    inputRef.current?.focus();
  };

  if (!open) return null;

  const activeChef = chefs.find(f => (f.slug ?? f.id) === fpId);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col" style={{ maxHeight: '70vh' }}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="relative mx-auto w-full max-w-3xl rounded-t-2xl border border-b-0 border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Streaming content area */}
        {content && (
          <div className="max-h-[40vh] overflow-y-auto border-b border-gray-100 px-6 py-4 text-sm leading-relaxed text-gray-700 dark:border-gray-800 dark:text-gray-300">
            {generating && (
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                Generating with {activeChef?.name ?? 'chef'}…
              </div>
            )}
            <div className="whitespace-pre-wrap font-mono text-xs">{content.slice(-2000)}</div>
            {done && saved && savedId && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-400">Saved to library ✓</span>
                <button
                  type="button"
                  onClick={() => { onClose(); router.push(`/library/${savedId}`); }}
                  className="text-xs font-medium text-gray-900 underline dark:text-white"
                >
                  View recipe
                </button>
                <button type="button" onClick={reset} className="text-xs font-medium text-gray-500 underline">
                  New recipe
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
            <button onClick={generate} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 py-4">
          {/* Context chips row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {/* Chef selector — styled like a model picker */}
            <div className="relative">
              <select
                value={fpId}
                onChange={e => setFpId(e.target.value)}
                disabled={generating || chefsLoading}
                className="appearance-none rounded-full border border-gray-200 bg-gray-50 px-3 py-1 pr-7 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {chefsLoading && <option>Loading…</option>}
                {chefs.map(f => <option key={f.id} value={f.slug ?? f.id}>{f.name}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">▾</span>
            </div>

            {/* Complexity mode */}
            <div className="relative">
              <select
                value={mode}
                onChange={e => setMode(e.target.value as ComplexityMode)}
                disabled={generating}
                className="appearance-none rounded-full border border-gray-200 bg-gray-50 px-3 py-1 pr-7 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">▾</span>
            </div>

            {/* Servings */}
            <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-gray-700 dark:bg-gray-800">
              <span className="text-xs text-gray-500">Serves</span>
              <input
                type="number"
                min={1}
                value={servings}
                onChange={e => { const v = parseInt(e.target.value); if (v > 0) setServings(v); }}
                disabled={generating}
                className="w-8 bg-transparent text-center text-xs font-medium text-gray-700 focus:outline-none dark:text-gray-300"
              />
            </div>

            {/* Context toggle */}
            <button
              type="button"
              onClick={() => setShowContext(!showContext)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                showContext
                  ? 'border-gray-400 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              + Context
            </button>
          </div>

          {/* Expanded context fields */}
          {showContext && (
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { v: occasion, s: setOccasion, p: 'Occasion' },
                { v: mood, s: setMood, p: 'Mood' },
                { v: season, s: setSeason, p: 'Season' },
                { v: constraints, s: setConstraints, p: 'Constraints (comma-separated)' },
              ].map((f, i) => (
                <input
                  key={i}
                  type="text"
                  value={f.v}
                  onChange={e => f.s(e.target.value)}
                  disabled={generating}
                  placeholder={f.p}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 placeholder-gray-400 focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
              ))}
            </div>
          )}

          {/* Main input + send */}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={dish}
              onChange={e => setDish(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={generating}
              rows={1}
              placeholder="Describe what you want to cook…"
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={generating ? undefined : generate}
              disabled={generating || !dish.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              {generating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M13 3H5M13 3V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
