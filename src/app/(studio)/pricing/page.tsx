'use client';

import { useState } from 'react';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    features: ['10 generations/month', '1 fingerprint'],
  },
  {
    tier: 'home_cook',
    name: 'Home Cook',
    price: 9,
    features: ['Unlimited generations', 'All fingerprints', 'Recipe library', 'Export'],
  },
  {
    tier: 'creator',
    name: 'Creator',
    price: 19,
    features: [
      'Unlimited generations',
      'All fingerprints',
      'Recipe library',
      'Export with branding',
      'Custom fingerprints',
      'Collections',
    ],
  },
  {
    tier: 'brigade',
    name: 'Brigade',
    price: 49,
    features: [
      'Unlimited generations',
      'All fingerprints',
      'Recipe library',
      'Export with branding',
      'Custom fingerprints',
      'Collections',
      'Team workspace',
      'API access',
    ],
  },
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  async function handleSubscribe(tier: string) {
    setLoadingTier(tier);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Handle error silently — user can retry
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="mt-2 text-gray-500">
          From casual cooking to professional kitchens — pick the tier that fits your style.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.tier}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
            <div className="mt-2">
              <span className="text-3xl font-bold text-gray-900">
                ${plan.price}
              </span>
              {plan.price > 0 && (
                <span className="text-sm text-gray-500">/month</span>
              )}
            </div>

            <ul className="mt-6 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start text-sm text-gray-600"
                >
                  <span className="mr-2 text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.tier === 'free' ? (
                <div className="rounded-md bg-gray-100 px-4 py-2 text-center text-sm text-gray-500">
                  Current free tier
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.tier)}
                  disabled={loadingTier === plan.tier}
                  className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingTier === plan.tier ? 'Redirecting…' : 'Subscribe'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
