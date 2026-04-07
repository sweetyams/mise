'use client';

// =============================================================================
// MISE Fermentation Tracking — Page
// =============================================================================
// List active and completed fermentation logs, create new entries,
// display elapsed time, overdue notifications, and safety guidelines.
// Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  getFermentationLogs,
  createFermentationLog,
  updateFermentationLog,
  addTastingNote,
  type FermentationLog,
} from './actions';

// ---------------------------------------------------------------------------
// Safety guidelines (hardcoded V1)
// ---------------------------------------------------------------------------

const SAFETY_GUIDELINES = [
  'Always use clean, sanitised equipment for fermentation.',
  'Monitor temperature regularly — most ferments thrive between 18–24°C.',
  'If you see unexpected mould (black, green, or pink), discard the batch.',
  'White kahm yeast on the surface is generally harmless but affects flavour.',
  'Trust your senses — if it smells off or rotten (not just sour), do not consume.',
  'Keep ferments submerged below the brine to prevent unwanted bacterial growth.',
  'Label everything with start date and contents.',
];

export default function FermentationPage() {
  const [logs, setLogs] = useState<FermentationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New log form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    method_description: '',
    start_date: new Date().toISOString().split('T')[0],
    target_duration_days: 7,
    temperature: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Tasting note form
  const [tastingLogId, setTastingLogId] = useState<string | null>(null);
  const [tastingNote, setTastingNote] = useState({
    taste: '',
    texture: '',
    appearance: '',
    aroma: '',
    overall: '',
    comments: '',
  });
  const [tastingSubmitting, setTastingSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Load logs
  // -------------------------------------------------------------------------

  const loadLogs = useCallback(async () => {
    setLoading(true);
    // We need the user ID — for now we pass empty and let the server action
    // resolve from auth. We'll use a placeholder approach.
    const result = await getFermentationLogs('');
    setLoading(false);

    if (result.success) {
      setLogs(result.data);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // -------------------------------------------------------------------------
  // Create log
  // -------------------------------------------------------------------------

  const handleCreateLog = useCallback(async () => {
    if (!formData.method_description.trim()) return;
    setFormSubmitting(true);

    const result = await createFermentationLog({
      method_description: formData.method_description,
      start_date: formData.start_date,
      target_duration_days: formData.target_duration_days,
      temperature: formData.temperature || undefined,
    });

    setFormSubmitting(false);

    if (result.success) {
      setLogs((prev) => [result.data, ...prev]);
      setShowForm(false);
      setFormData({
        method_description: '',
        start_date: new Date().toISOString().split('T')[0],
        target_duration_days: 7,
        temperature: '',
      });
    } else {
      setError(result.error);
    }
  }, [formData]);

  // -------------------------------------------------------------------------
  // Update status
  // -------------------------------------------------------------------------

  const handleUpdateStatus = useCallback(
    async (logId: string, status: 'completed' | 'failed') => {
      const result = await updateFermentationLog(logId, { status });
      if (result.success) {
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId ? { ...l, status, is_overdue: false } : l
          )
        );
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Add tasting note
  // -------------------------------------------------------------------------

  const handleAddTastingNote = useCallback(async () => {
    if (!tastingLogId) return;
    setTastingSubmitting(true);

    const result = await addTastingNote(tastingLogId, tastingNote);
    setTastingSubmitting(false);

    if (result.success) {
      setTastingLogId(null);
      setTastingNote({ taste: '', texture: '', appearance: '', aroma: '', overall: '', comments: '' });
    } else {
      setError(result.error);
    }
  }, [tastingLogId, tastingNote]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const activeLogs = logs.filter((l) => l.status === 'active');
  const completedLogs = logs.filter((l) => l.status !== 'active');

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-centre justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fermentation Tracking</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your ferments, log tasting notes, and stay on top of timing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ New Ferment'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* New Fermentation Log Form */}
        {showForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-semibold">New Fermentation Log</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="method" className="mb-1 block text-xs font-medium">
                  Method / Description
                </label>
                <textarea
                  id="method"
                  value={formData.method_description}
                  onChange={(e) => setFormData((p) => ({ ...p, method_description: e.target.value }))}
                  placeholder="e.g. Lacto-fermented hot sauce with habaneros and garlic…"
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label htmlFor="start-date" className="mb-1 block text-xs font-medium">
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label htmlFor="duration" className="mb-1 block text-xs font-medium">
                  Target Duration (days)
                </label>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  value={formData.target_duration_days}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      target_duration_days: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label htmlFor="temperature" className="mb-1 block text-xs font-medium">
                  Temperature (optional)
                </label>
                <input
                  id="temperature"
                  type="text"
                  value={formData.temperature}
                  onChange={(e) => setFormData((p) => ({ ...p, temperature: e.target.value }))}
                  placeholder="e.g. 22°C"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreateLog}
              disabled={formSubmitting || !formData.method_description.trim()}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {formSubmitting ? 'Creating…' : 'Start Tracking'}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-centre justify-centre py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {/* Active Ferments */}
        {!loading && (
          <>
            <h2 className="mb-3 text-lg font-semibold">
              Active Ferments ({activeLogs.length})
            </h2>

            {activeLogs.length === 0 ? (
              <p className="mb-6 text-sm text-gray-500">No active ferments. Start one above!</p>
            ) : (
              <div className="mb-8 space-y-3">
                {activeLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-lg border p-4 shadow-sm ${
                      log.is_overdue
                        ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'
                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{log.method_description}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span>Started: {new Date(log.start_date).toLocaleDateString('en-CA')}</span>
                          <span>·</span>
                          <span>Day {log.elapsed_days} of {log.target_duration_days}</span>
                          {log.temperature && (
                            <>
                              <span>·</span>
                              <span>{log.temperature}</span>
                            </>
                          )}
                        </div>
                        {log.is_overdue && (
                          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                            ⚠ Overdue by {log.elapsed_days - log.target_duration_days} day(s) — check your ferment!
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setTastingLogId(tastingLogId === log.id ? null : log.id)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                        >
                          + Note
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(log.id, 'completed')}
                          className="rounded-md border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(log.id, 'failed')}
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                        >
                          Failed
                        </button>
                      </div>
                    </div>

                    {/* Tasting Note Form (inline) */}
                    {tastingLogId === log.id && (
                      <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                        <h4 className="mb-2 text-xs font-semibold">Add Tasting Note</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {(['taste', 'texture', 'appearance', 'aroma', 'overall'] as const).map(
                            (field) => (
                              <input
                                key={field}
                                type="text"
                                value={tastingNote[field]}
                                onChange={(e) =>
                                  setTastingNote((p) => ({ ...p, [field]: e.target.value }))
                                }
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                              />
                            )
                          )}
                          <textarea
                            value={tastingNote.comments}
                            onChange={(e) =>
                              setTastingNote((p) => ({ ...p, comments: e.target.value }))
                            }
                            placeholder="Comments…"
                            rows={1}
                            className="col-span-2 rounded-md border border-gray-300 px-2 py-1 text-xs placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddTastingNote}
                          disabled={tastingSubmitting}
                          className="mt-2 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {tastingSubmitting ? 'Saving…' : 'Save Note'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Safety Guidelines */}
            {activeLogs.length > 0 && (
              <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  🧪 Fermentation Safety Guidelines
                </h3>
                <ul className="space-y-1">
                  {SAFETY_GUIDELINES.map((g, i) => (
                    <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                      • {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Completed / Failed Ferments */}
            {completedLogs.length > 0 && (
              <>
                <h2 className="mb-3 text-lg font-semibold">
                  Past Ferments ({completedLogs.length})
                </h2>
                <div className="space-y-2">
                  {completedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                    >
                      <div className="flex items-centre justify-between">
                        <p className="text-sm">{log.method_description}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            log.status === 'completed'
                              ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(log.start_date).toLocaleDateString('en-CA')} — {log.elapsed_days} days
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
