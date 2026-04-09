'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ModeConfig {
  _key: string;
  id: string;
  label: string;
  description: string;
  instructions: string;
}

export default function ComplexityModesAdminPage() {
  const [modes, setModes] = useState<ModeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/complexity-modes')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.modes) {
          setModes(d.modes.map((m: any, i: number) => ({ ...m, _key: m._key || `k-${i}-${Date.now()}` })));
        }
      })
      .catch(() => setError('Failed to load modes.'))
      .finally(() => setLoading(false));
  }, []);

  const updateMode = (index: number, field: keyof ModeConfig, value: string) => {
    setModes((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const addMode = () => {
    const newKey = `k-${Date.now()}`;
    setModes((prev) => [
      ...prev,
      { _key: newKey, id: '', label: '', description: '', instructions: '' },
    ]);
    setExpandedIdx(modes.length);
  };

  const removeMode = (index: number) => {
    setModes((prev) => prev.filter((_, i) => i !== index));
    if (expandedIdx === index) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > index) setExpandedIdx(expandedIdx - 1);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/complexity-modes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modes: modes.map(({ _key, ...rest }) => rest) }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Failed to save.');
        return;
      }

      setMessage('Complexity modes saved.');
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Complexity Modes</h1>
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600">
            ← Admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            Complexity Modes
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure the complexity modes available for recipe generation. Each mode injects specific instructions into the prompt.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addMode}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            + Add Mode
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {modes.map((mode, index) => {
          const isExpanded = expandedIdx === index;
          return (
            <div
              key={mode._key}
              className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              {/* Header — always visible */}
              <button
                type="button"
                onClick={() => setExpandedIdx(isExpanded ? null : index)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400">{index + 1}</span>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {mode.label || '(untitled)'}
                    </span>
                    <span className="ml-2 text-xs text-gray-400 font-mono">{mode.id}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {/* Expanded editor */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4 dark:border-gray-800">
                  {/* ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      ID (used in code and DB — lowercase, no spaces)
                    </label>
                    <input
                      type="text"
                      value={mode.id}
                      onChange={(e) => updateMode(index, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>

                  {/* Label */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={mode.label}
                      onChange={(e) => updateMode(index, 'label', e.target.value)}
                      placeholder="e.g. Kitchen"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Description (shown to users in settings)
                    </label>
                    <input
                      type="text"
                      value={mode.description}
                      onChange={(e) => updateMode(index, 'description', e.target.value)}
                      placeholder="e.g. Professional but approachable — the default for everyday cooking"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Prompt Instructions (injected into the system prompt during generation)
                    </label>
                    <textarea
                      value={mode.instructions}
                      onChange={(e) => updateMode(index, 'instructions', e.target.value)}
                      rows={8}
                      placeholder="COMPLEXITY MODE: Name&#10;- Instruction 1&#10;- Instruction 2"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono leading-relaxed focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeMode(index)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete this mode
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modes.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">No complexity modes configured. Click "Add Mode" to create one.</p>
        </div>
      )}
    </div>
  );
}
