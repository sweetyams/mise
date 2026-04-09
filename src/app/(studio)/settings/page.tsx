'use client';

// =============================================================================
// MISE Settings Page — Account & Preferences
// =============================================================================
// Displays subscription info and allows setting default complexity mode.
// Requirements: 13.7, 20.7
// =============================================================================

import { useEffect, useState } from 'react';
import type { ComplexityMode } from '@/lib/types/recipe';
import { COMPLEXITY_MODE_OPTIONS } from '@/lib/complexity-modes';
import { INTOLERANCE_CATEGORIES } from '@/lib/intolerance-constants';

interface BillingInfo {
  tier: string;
  nextBillingDate: string | null;
  portalUrl: string | null;
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  home_cook: 'Home Cook',
  creator: 'Creator',
  brigade: 'Brigade',
};

export default function SettingsPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultComplexity, setDefaultComplexity] = useState<ComplexityMode>('kitchen');
  const [savingComplexity, setSavingComplexity] = useState(false);
  const [complexitySaved, setComplexitySaved] = useState(false);

  const [selectedIntolerances, setSelectedIntolerances] = useState<Set<string>>(new Set());
  const [savingIntolerances, setSavingIntolerances] = useState(false);
  const [intolerancesSaved, setIntolerancesSaved] = useState(false);
  const [intolerancesError, setIntolerancesError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch('/api/billing/info');
        if (res.ok) {
          const data = await res.json();
          setBilling(data);
        }
      } catch {
        // Silently handle — page will show loading state
      } finally {
        setLoading(false);
      }
    }
    fetchBilling();
  }, []);

  useEffect(() => {
    async function fetchIntolerances() {
      try {
        const res = await fetch('/api/settings/intolerances');
        if (res.ok) {
          const data = await res.json();
          setSelectedIntolerances(new Set(data.intolerances ?? []));
        }
      } catch {
        // Non-blocking — panel shows all items unselected
      }
    }
    fetchIntolerances();
  }, []);

  const handleComplexityChange = async (mode: ComplexityMode) => {
    setDefaultComplexity(mode);
    setSavingComplexity(true);
    setComplexitySaved(false);

    try {
      await fetch('/api/settings/complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultComplexityMode: mode }),
      });
      setComplexitySaved(true);
      setTimeout(() => setComplexitySaved(false), 2000);
    } catch {
      // Silently handle — UI already reflects the selection
    } finally {
      setSavingComplexity(false);
    }
  };

  const handleIntoleranceToggle = (id: string) => {
    setSelectedIntolerances((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSaveIntolerances = async () => {
    setSavingIntolerances(true);
    setIntolerancesSaved(false);
    setIntolerancesError(null);

    try {
      const res = await fetch('/api/settings/intolerances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intolerances: Array.from(selectedIntolerances) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setIntolerancesError(data.error ?? 'Failed to save intolerances.');
        return;
      }

      setIntolerancesSaved(true);
      setTimeout(() => setIntolerancesSaved(false), 2000);
    } catch {
      setIntolerancesError('Failed to save intolerances.');
    } finally {
      setSavingIntolerances(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="mt-4 text-gray-500">Loading your account details…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

      {/* Subscription Section */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Current tier</span>
            <span className="text-sm font-medium text-gray-900">
              {billing ? TIER_LABELS[billing.tier] ?? billing.tier : 'Free'}
            </span>
          </div>

          {billing?.nextBillingDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Next billing date</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(billing.nextBillingDate).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {billing?.portalUrl && (
            <a
              href={billing.portalUrl}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Manage Subscription
            </a>
          )}
          <a
            href="/pricing"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            View Plans
          </a>
        </div>
      </div>

      {/* Default Complexity Mode Section */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Default Complexity Mode</h2>
        <p className="mt-1 text-sm text-gray-500">
          This sets your preferred complexity level for new recipe generations. You can still override it per recipe.
        </p>

        <div className="mt-4 space-y-3">
          {COMPLEXITY_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                defaultComplexity === option.value
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <input
                type="radio"
                name="complexity-mode"
                value={option.value}
                checked={defaultComplexity === option.value}
                onChange={() => handleComplexityChange(option.value)}
                disabled={savingComplexity}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                <p className="mt-0.5 text-xs text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        {complexitySaved && (
          <p className="mt-3 text-xs text-green-600">Default complexity mode saved ✓</p>
        )}
      </div>

      {/* Intolerance Panel */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm" role="region" aria-label="Food intolerances">
        <h2 className="text-lg font-semibold text-gray-900">Food Intolerances</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select any food intolerances. These will be applied as constraints when generating recipes.
        </p>

        <div className="mt-4 space-y-5">
          {INTOLERANCE_CATEGORIES.map((category) => (
            <fieldset key={category.name}>
              <legend className="text-sm font-medium text-gray-700">{category.name}</legend>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {category.items.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIntolerances.has(item.id)}
                      onChange={() => handleIntoleranceToggle(item.id)}
                      disabled={savingIntolerances}
                      aria-label={item.label}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveIntolerances}
            disabled={savingIntolerances}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {savingIntolerances ? 'Saving…' : 'Save Intolerances'}
          </button>

          {intolerancesSaved && (
            <p className="text-xs text-green-600">Intolerances saved ✓</p>
          )}
          {intolerancesError && (
            <p className="text-xs text-red-600">{intolerancesError}</p>
          )}
        </div>
      </div>

      {/* Chef Brain Section */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Chef Brain</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your personalised cooking identity — compiled from your preferences, dev logs, and tasting notes.
        </p>
        <div className="mt-4">
          <a
            href="/brain"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            View Chef Brain
          </a>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Plans & Pricing</h2>
        <p className="mt-1 text-sm text-gray-500">
          View available plans and upgrade your account.
        </p>
        <div className="mt-4">
          <a
            href="/pricing"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}
