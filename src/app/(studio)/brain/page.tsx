'use client';

// =============================================================================
// MISE Chef Brain — Page
// =============================================================================
// Displays the user's compiled Chef Brain summary, allows manual recompilation.
// Shows: flavour biases, pantry constants, technique comfort, avoid list,
// cooking context, recent dev notes, last compilation timestamp, version.
// Requirements: 4.6, 4.7
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

interface BrainData {
  promptText: string;
  version: number;
  compiledAt: string;
}

export default function BrainPage() {
  const [brain, setBrain] = useState<BrainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recompiling, setRecompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load brain data
  // -------------------------------------------------------------------------

  const loadBrain = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/brain');
      if (!res.ok) {
        setError('Failed to load Chef Brain data.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setBrain(data);
    } catch {
      setError('Failed to load Chef Brain data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrain();
  }, [loadBrain]);

  // -------------------------------------------------------------------------
  // Recompile
  // -------------------------------------------------------------------------

  const handleRecompile = useCallback(async () => {
    setRecompiling(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/brain', { method: 'POST' });
      if (!res.ok) {
        setError('Recompilation failed. Please try again.');
        setRecompiling(false);
        return;
      }
      const data = await res.json();
      setBrain(data);
      setMessage('Chef Brain recompiled successfully.');
    } catch {
      setError('Recompilation failed. Please try again.');
    } finally {
      setRecompiling(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Parse brain text into sections
  // -------------------------------------------------------------------------

  const sections = parseBrainSections(brain?.promptText ?? '');

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chef Brain</h1>
            <p className="mt-1 text-sm text-gray-500">
              Your personalised cooking identity — compiled from your preferences, dev logs, and tasting notes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecompile}
            disabled={recompiling}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {recompiling ? 'Recompiling…' : 'Recompile'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            {message}
          </div>
        )}

        {loading && (
          <div className="flex items-centre justify-centre py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {!loading && brain && (
          <>
            {/* Metadata */}
            <div className="mb-6 flex gap-4 text-xs text-gray-500">
              <span>Version: {brain.version}</span>
              <span>·</span>
              <span>
                Last compiled:{' '}
                {new Date(brain.compiledAt).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Brain sections */}
            {sections.length > 0 ? (
              <div className="space-y-4">
                {sections.map((section, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <h2 className="mb-2 text-sm font-semibold">{section.title}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <h2 className="mb-2 text-sm font-semibold">Raw Brain Prompt</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {brain.promptText || 'No Chef Brain compiled yet. Add some dev logs or tasting notes, then recompile.'}
                </p>
              </div>
            )}
          </>
        )}

        {!loading && !brain && !error && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-centre shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500">
              No Chef Brain data yet. Start generating recipes and adding dev notes to build your cooking identity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parse brain text into labelled sections
// ---------------------------------------------------------------------------

interface BrainSection {
  title: string;
  content: string;
}

function parseBrainSections(text: string): BrainSection[] {
  if (!text.trim()) return [];

  const sectionLabels = [
    'Flavour Biases',
    'Pantry Constants',
    'Technique Comfort',
    'Avoid List',
    'Cooking Context',
    'Recent Dev Notes',
    'Development Notes',
  ];

  const sections: BrainSection[] = [];
  const lines = text.split('\n');
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const matchedLabel = sectionLabels.find(
      (label) =>
        line.toLowerCase().includes(label.toLowerCase()) &&
        (line.startsWith('#') || line.endsWith(':') || line.startsWith('**'))
    );

    if (matchedLabel) {
      if (currentTitle && currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = matchedLabel;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle && currentContent.length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  return sections;
}
