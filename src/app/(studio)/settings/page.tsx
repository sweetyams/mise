'use client';

import { useEffect, useState } from 'react';

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
    </div>
  );
}
