'use client';

// =============================================================================
// MISE Admin — Fingerprint Management
// =============================================================================
// List, edit, and version fingerprint prompt texts.
// Requirements: 2.7, 3.1, 3.3
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

interface Fingerprint {
  id: string;
  name: string;
  prompt_text: string;
  version: number;
  is_default: boolean;
  updated_at: string;
}

export default function FingerprintManagementPage() {
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load fingerprints
  // -------------------------------------------------------------------------

  const loadFingerprints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fingerprints');
      if (!res.ok) {
        setError('Failed to load fingerprints. Ensure you have admin access.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setFingerprints(data.fingerprints ?? []);
    } catch {
      setError('Failed to load fingerprints.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFingerprints();
  }, [loadFingerprints]);

  // -------------------------------------------------------------------------
  // Edit fingerprint
  // -------------------------------------------------------------------------

  const handleStartEdit = useCallback((fp: Fingerprint) => {
    setEditingId(fp.id);
    setEditText(fp.prompt_text);
    setMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/fingerprints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, prompt_text: editText }),
      });

      if (!res.ok) {
        setError('Failed to save fingerprint.');
        setSaving(false);
        return;
      }

      const data = await res.json();
      setFingerprints((prev) =>
        prev.map((fp) =>
          fp.id === editingId
            ? { ...fp, prompt_text: editText, version: data.version, updated_at: new Date().toISOString() }
            : fp
        )
      );
      setEditingId(null);
      setMessage('Fingerprint updated. Version incremented and cache invalidated.');
    } catch {
      setError('Failed to save fingerprint.');
    } finally {
      setSaving(false);
    }
  }, [editingId, editText]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Fingerprint Management</h1>
        <p className="mb-8 text-sm text-gray-500">
          Edit fingerprint prompt texts. Each save increments the version and invalidates the cache.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
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

        {!loading && (
          <div className="space-y-4">
            {fingerprints.map((fp) => (
              <div
                key={fp.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">{fp.name}</h2>
                    <div className="mt-0.5 flex gap-2 text-xs text-gray-500">
                      <span>v{fp.version}</span>
                      <span>·</span>
                      <span>
                        Updated: {new Date(fp.updated_at).toLocaleDateString('en-CA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {fp.is_default && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600">Default</span>
                        </>
                      )}
                    </div>
                  </div>
                  {editingId !== fp.id && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(fp)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingId === fp.id ? (
                  <div>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={8}
                      className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save & Increment Version'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-gray-50 p-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {fp.prompt_text}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
