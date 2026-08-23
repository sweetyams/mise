'use client';

// =============================================================================
// MISE Imports — Import History + Manual URL Input + Retry UI
// =============================================================================
// Displays imported recipes and failed attempts with retry capability.
// Includes a paste-URL input for importing recipes directly from the web UI.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportedRecipe {
  id: string;
  title: string;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

interface ImportAttempt {
  id: string;
  source_url: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error_message: string | null;
  method: string | null;
  attempts: number;
  recipe_id: string | null;
  created_at: string;
  last_attempt_at: string | null;
}

interface ImportResult {
  success: boolean;
  id?: string;
  title?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportedRecipe[]>([]);
  const [attempts, setAttempts] = useState<ImportAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [importsRes, attemptsRes] = await Promise.all([
        fetch('/api/imports'),
        fetch('/api/imports?include=attempts'),
      ]);

      if (importsRes.ok) {
        const data = await importsRes.json();
        setImports(data.recipes ?? []);
      }
      if (attemptsRes.ok) {
        const data = await attemptsRes.json();
        setAttempts(data.attempts ?? []);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setImporting(true);
    setResult(null);

    try {
      const res = await fetch('/api/import-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, id: data.id, title: data.title });
        setUrl('');
        fetchData();
      } else {
        setResult({ success: false, error: data.error });
      }
    } catch {
      setResult({ success: false, error: 'Network error' });
    } finally {
      setImporting(false);
    }
  }

  async function handleRetry(attemptId: string) {
    setRetrying(attemptId);
    try {
      const res = await fetch('/api/imports/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch {
      // Non-fatal
    } finally {
      setRetrying(null);
    }
  }

  const failedAttempts = attempts.filter((a) => a.status === 'failed');

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        Imports
      </h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        Import recipes from Instagram posts. Paste a URL below or share from your phone.
      </p>

      {/* Manual import form */}
      <form onSubmit={handleImport} className="mb-8">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
            disabled={importing}
          />
          <button
            type="submit"
            disabled={importing || !url.trim()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </form>

      {/* Result feedback */}
      {result && (
        <div
          className={`mb-6 rounded-md px-4 py-3 text-sm ${
            result.success
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {result.success ? (
            <span>
              ✓ Imported{' '}
              <Link
                href={`/library/${result.id}`}
                className="font-medium underline"
              >
                {result.title}
              </Link>
            </span>
          ) : (
            <span>✗ {result.error}</span>
          )}
        </div>
      )}

      {/* Failed imports — retry section */}
      {failedAttempts.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-red-700 dark:text-red-400">
            Failed Imports ({failedAttempts.length})
          </h2>
          <div className="divide-y divide-red-100 rounded-md border border-red-200 dark:divide-red-900 dark:border-red-900">
            {failedAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700 dark:text-gray-300">
                    {attempt.source_url}
                  </p>
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {attempt.error_message || 'Unknown error'} · Attempt {attempt.attempts}/3
                  </p>
                </div>
                <button
                  onClick={() => handleRetry(attempt.id)}
                  disabled={retrying === attempt.id || attempt.attempts >= 3}
                  className="ml-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {retrying === attempt.id ? 'Retrying…' : attempt.attempts >= 3 ? 'Max retries' : 'Retry'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Imported Recipes
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : imports.length === 0 ? (
          <p className="text-sm text-gray-400">
            No imports yet. Paste an Instagram URL above or share from your phone.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {imports.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center justify-between py-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/library/${recipe.id}`}
                    className="text-sm font-medium text-gray-900 hover:underline dark:text-white"
                  >
                    {recipe.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                    {recipe.source && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {recipe.source}
                      </span>
                    )}
                    <span>
                      {new Date(recipe.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {recipe.source_url && (
                  <a
                    href={recipe.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Original ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
