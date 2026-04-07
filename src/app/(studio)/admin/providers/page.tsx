'use client';

// =============================================================================
// MISE Admin — AI Provider Management
// =============================================================================
// List, add/edit providers, test connection, toggle active.
// Requirements: 12.1, 12.3
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

interface ProviderConfig {
  id: string;
  provider_name: string;
  api_key_encrypted: string;
  model_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formActive, setFormActive] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // Test connection
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load providers
  // -------------------------------------------------------------------------

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) {
        setError('Failed to load providers.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProviders(data.providers ?? []);
    } catch {
      setError('Failed to load providers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  // -------------------------------------------------------------------------
  // Save provider
  // -------------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setFormSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch('/api/admin/providers', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          provider_name: formName,
          api_key_encrypted: formApiKey,
          model_id: formModelId || null,
          is_active: formActive,
        }),
      });

      if (!res.ok) {
        setError('Failed to save provider.');
        setFormSaving(false);
        return;
      }

      setMessage(editId ? 'Provider updated.' : 'Provider added.');
      setShowForm(false);
      setEditId(null);
      resetForm();
      loadProviders();
    } catch {
      setError('Failed to save provider.');
    } finally {
      setFormSaving(false);
    }
  }, [editId, formName, formApiKey, formModelId, formActive, loadProviders]);

  const resetForm = () => {
    setFormName('');
    setFormApiKey('');
    setFormModelId('');
    setFormActive(false);
  };

  const handleEdit = (p: ProviderConfig) => {
    setEditId(p.id);
    setFormName(p.provider_name);
    setFormApiKey(p.api_key_encrypted);
    setFormModelId(p.model_id ?? '');
    setFormActive(p.is_active);
    setShowForm(true);
  };

  // -------------------------------------------------------------------------
  // Test connection
  // -------------------------------------------------------------------------

  const handleTestConnection = useCallback(async (providerId: string) => {
    setTesting(providerId);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: providerId }),
      });

      const data = await res.json();
      setTestResult(data.success ? '✓ Connection successful' : `✗ ${data.error}`);
    } catch {
      setTestResult('✗ Test failed');
    } finally {
      setTesting(null);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Provider Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure AI providers, API keys, and active model.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              resetForm();
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : '+ Add Provider'}
          </button>
        </div>

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

        {testResult && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {testResult}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-semibold">
              {editId ? 'Edit Provider' : 'Add Provider'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="provider-name" className="mb-1 block text-xs font-medium">
                  Provider Name
                </label>
                <input
                  id="provider-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. claude"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label htmlFor="model-id" className="mb-1 block text-xs font-medium">
                  Model ID
                </label>
                <input
                  id="model-id"
                  type="text"
                  value={formModelId}
                  onChange={(e) => setFormModelId(e.target.value)}
                  placeholder="e.g. claude-sonnet-4-20250514"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="api-key" className="mb-1 block text-xs font-medium">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="flex items-centre gap-2">
                <input
                  id="is-active"
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is-active" className="text-xs font-medium">
                  Active (only one provider can be active)
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={formSaving || !formName.trim() || !formApiKey.trim()}
              className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {formSaving ? 'Saving…' : editId ? 'Update' : 'Add'}
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-centre justify-centre py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {!loading && providers.length === 0 && (
          <p className="text-sm text-gray-500">No providers configured. Add one above.</p>
        )}

        {!loading && providers.length > 0 && (
          <div className="space-y-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-centre gap-2">
                      <h3 className="text-sm font-semibold">{p.provider_name}</h3>
                      {p.is_active && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Model: {p.model_id ?? 'default'} · Key: ****{p.api_key_encrypted.slice(-4)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleTestConnection(p.id)}
                      disabled={testing === p.id}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                      {testing === p.id ? 'Testing…' : 'Test'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(p)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
