'use client';

// =============================================================================
// MISE Admin — Cost Monitoring Dashboard
// =============================================================================
// Generation costs, per-user usage, monthly totals.
// Requirements: 14.4
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

interface CostSummary {
  totalGenerations: number;
  totalCost: number;
  averageCost: number;
  topUsers: Array<{
    user_id: string;
    email: string;
    generation_count: number;
    total_cost: number;
  }>;
}

export default function CostMonitoringPage() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/costs');
      if (!res.ok) {
        setError('Failed to load cost data.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSummary(data);
    } catch {
      setError('Failed to load cost data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Cost Monitoring</h1>
        <p className="mb-8 text-sm text-gray-500">
          Generation costs and per-user usage for the current month.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-centre justify-centre py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}

        {!loading && summary && (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs text-gray-500">Total Generations (This Month)</p>
                <p className="mt-1 text-2xl font-bold">{summary.totalGenerations}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs text-gray-500">Total Cost (This Month)</p>
                <p className="mt-1 text-2xl font-bold">${summary.totalCost.toFixed(4)}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs text-gray-500">Average Cost per Generation</p>
                <p className="mt-1 text-2xl font-bold">${summary.averageCost.toFixed(4)}</p>
              </div>
            </div>

            {/* Top Users */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold">Top Users by Generation Count</h2>
              {summary.topUsers.length === 0 ? (
                <p className="text-xs text-gray-500">No generation data yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="py-2 text-left font-medium text-gray-500">User</th>
                      <th className="py-2 text-right font-medium text-gray-500">Generations</th>
                      <th className="py-2 text-right font-medium text-gray-500">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.topUsers.map((u) => (
                      <tr key={u.user_id} className="border-b border-gray-50 dark:border-gray-800">
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          {u.email || u.user_id.slice(0, 8)}
                        </td>
                        <td className="py-2 text-right">{u.generation_count}</td>
                        <td className="py-2 text-right">${u.total_cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
