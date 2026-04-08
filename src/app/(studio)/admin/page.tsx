import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// =============================================================================
// MISE Admin Dashboard — Operator-Only Access
// =============================================================================
// Protected admin page. Access check: user email matches ADMIN_EMAIL env var.
// Requirements: 2.7
// =============================================================================

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="mb-4 text-2xl font-bold">Access Denied</h1>
          <p className="text-gray-500">You do not have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  // Fetch health status
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  let healthStatus: Record<string, { status: string; latency?: number }> = {};
  let overallHealth = 'unknown';

  try {
    const res = await fetch(`${appUrl}/api/health`, { cache: 'no-store' });
    const data = await res.json();
    healthStatus = data.checks ?? {};
    overallHealth = data.status ?? 'unknown';
  } catch {
    overallHealth = 'error';
  }

  const navItems = [
    {
      href: '/admin/fingerprints',
      title: 'Chef Profiles',
      description: 'Create, edit, and version chef persona prompts',
    },
    {
      href: '/admin/providers',
      title: 'AI Provider Config',
      description: 'Manage AI providers, API keys, and active model',
    },
    {
      href: '/admin/costs',
      title: 'Cost Monitoring',
      description: 'Generation costs, per-user usage, monthly totals',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Admin Dashboard</h1>
        <p className="mb-8 text-sm text-gray-500">
          Operator controls for MISE. Signed in as {user.email}.
        </p>

        {/* System Health */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold">System Health</h2>
          <div className="flex items-centre gap-2 mb-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                overallHealth === 'healthy'
                  ? 'bg-green-500'
                  : overallHealth === 'degraded'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium capitalize">{overallHealth}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(healthStatus).map(([name, check]) => (
              <div
                key={name}
                className="rounded-md border border-gray-100 p-2 text-xs dark:border-gray-700"
              >
                <div className="flex items-centre justify-between">
                  <span className="font-medium capitalize">{name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      check.status === 'healthy'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                {check.latency !== undefined && (
                  <p className="mt-1 text-gray-400">{check.latency}ms</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-600 dark:hover:bg-blue-950"
            >
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
