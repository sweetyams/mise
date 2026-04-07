'use client';

// =============================================================================
// MISE Canvas — Recipe Generation Interface
// =============================================================================
// Main generation UI: prompt input, fingerprint selector, complexity mode,
// serving size, optional fields, streaming display.
// Requirements: 2.3, 2.4, 2.5, 5.17, 5.20, 5.21, 20.5, 20.8
// =============================================================================

import { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComplexityMode = 'foundation' | 'kitchen' | 'riff';

interface FingerprintOption {
  id: string;
  name: string;
}

// Hardcoded default fingerprints
const DEFAULT_FINGERPRINTS: FingerprintOption[] = [
  { id: 'matty-matheson', name: 'Matty Matheson' },
  { id: 'brad-leone', name: 'Brad Leone' },
  { id: 'ottolenghi', name: 'Ottolenghi' },
  { id: 'samin-nosrat', name: 'Samin Nosrat' },
  { id: 'claire-saffitz', name: 'Claire Saffitz' },
];

const COMPLEXITY_MODES: { value: ComplexityMode; label: string; description: string }[] = [
  { value: 'foundation', label: 'Foundation', description: 'Learning mode — extra explanation and doneness cues' },
  { value: 'kitchen', label: 'Kitchen', description: 'Professional but approachable — the default' },
  { value: 'riff', label: 'Riff', description: 'Architecture only — for experienced cooks' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CanvasPage() {
  // Form state
  const [dishDescription, setDishDescription] = useState('');
  const [fingerprintId, setFingerprintId] = useState(DEFAULT_FINGERPRINTS[0].id);
  const [complexityMode, setComplexityMode] = useState<ComplexityMode>('kitchen');
  const [servings, setServings] = useState(4);
  const [occasion, setOccasion] = useState('');
  const [mood, setMood] = useState('');
  const [season, setSeason] = useState('');
  const [constraints, setConstraints] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Generate handler
  // -------------------------------------------------------------------------

  const handleGenerate = useCallback(async () => {
    if (!dishDescription.trim()) return;

    setIsGenerating(true);
    setStreamedText('');
    setError(null);
    setIsComplete(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const body: Record<string, unknown> = {
        dishDescription: dishDescription.trim(),
        fingerprintId,
        complexityMode,
        servings,
      };

      if (occasion.trim()) body.occasion = occasion.trim();
      if (mood.trim()) body.mood = mood.trim();
      if (season.trim()) body.season = season.trim();
      if (constraints.trim()) {
        body.constraints = constraints
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean);
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 429) {
          setError(
            errorData?.error ??
              'Rate limit exceeded. Please try again later.'
          );
        } else {
          setError(errorData?.error ?? 'Generation failed. Please try again.');
        }
        setIsGenerating(false);
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        setError('Failed to read response stream.');
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamedText(accumulated);
      }

      setIsComplete(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
        return;
      }
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [dishDescription, fingerprintId, complexityMode, servings, occasion, mood, season, constraints]);

  const handleRetry = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const selectedFingerprint = DEFAULT_FINGERPRINTS.find((f) => f.id === fingerprintId);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Recipe Canvas</h1>
        <p className="mb-8 text-sm text-gray-500">
          Describe your dish idea and let MISE generate a structured, restaurant-quality recipe.
        </p>

        {/* Generation Form */}
        <div className="mb-8 space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Dish Description */}
          <div>
            <label htmlFor="dish-description" className="mb-1 block text-sm font-medium">
              What would you like to cook?
            </label>
            <textarea
              id="dish-description"
              value={dishDescription}
              onChange={(e) => setDishDescription(e.target.value)}
              placeholder="e.g. A hearty lamb shoulder braise with preserved lemon and olives, something that fills the house with warmth..."
              rows={3}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:placeholder-gray-500"
              disabled={isGenerating}
            />
          </div>

          {/* Fingerprint + Complexity + Servings row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Fingerprint Selector */}
            <div>
              <label htmlFor="fingerprint" className="mb-1 block text-sm font-medium">
                Chef Fingerprint
              </label>
              <select
                id="fingerprint"
                value={fingerprintId}
                onChange={(e) => setFingerprintId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                disabled={isGenerating}
              >
                {DEFAULT_FINGERPRINTS.map((fp) => (
                  <option key={fp.id} value={fp.id}>
                    {fp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Complexity Mode */}
            <div>
              <label htmlFor="complexity" className="mb-1 block text-sm font-medium">
                Complexity Mode
              </label>
              <select
                id="complexity"
                value={complexityMode}
                onChange={(e) => setComplexityMode(e.target.value as ComplexityMode)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                disabled={isGenerating}
              >
                {COMPLEXITY_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {COMPLEXITY_MODES.find((m) => m.value === complexityMode)?.description}
              </p>
            </div>

            {/* Servings */}
            <div>
              <label htmlFor="servings" className="mb-1 block text-sm font-medium">
                Servings
              </label>
              <input
                id="servings"
                type="number"
                min={1}
                step={1}
                value={servings}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) setServings(val);
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                disabled={isGenerating}
              />
            </div>
          </div>

          {/* More Options (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {showMoreOptions ? '▾ Fewer options' : '▸ More options'}
            </button>

            {showMoreOptions && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="occasion" className="mb-1 block text-sm font-medium">
                    Occasion
                  </label>
                  <input
                    id="occasion"
                    type="text"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g. weeknight, dinner party"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label htmlFor="mood" className="mb-1 block text-sm font-medium">
                    Mood
                  </label>
                  <input
                    id="mood"
                    type="text"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="e.g. comfort, impressive, experimental"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label htmlFor="season" className="mb-1 block text-sm font-medium">
                    Season
                  </label>
                  <input
                    id="season"
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="e.g. winter, summer"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label htmlFor="constraints" className="mb-1 block text-sm font-medium">
                    Constraints
                  </label>
                  <input
                    id="constraints"
                    type="text"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="e.g. dairy-free, no nuts (comma-separated)"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Fingerprint Display */}
          {selectedFingerprint && (
            <p className="text-xs text-gray-400">
              Active fingerprint: <span className="font-medium text-gray-600 dark:text-gray-300">{selectedFingerprint.name}</span>
            </p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !dishDescription.trim()}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? 'Generating…' : 'Generate Recipe'}
          </button>
        </div>

        {/* Loading Indicator */}
        {isGenerating && !streamedText && (
          <div className="mb-6 flex items-centre justify-centre gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-700 dark:text-blue-300">
              Assembling your recipe — this may take a moment…
            </span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="mb-2 text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Streamed Recipe Display */}
        {streamedText && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-centre justify-between">
              <h2 className="text-lg font-semibold">
                {isComplete ? 'Your Recipe' : 'Generating…'}
              </h2>
              {isGenerating && (
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
              )}
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {streamedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
