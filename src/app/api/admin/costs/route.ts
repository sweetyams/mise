import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// GET /api/admin/costs — cost monitoring data
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const serviceClient = createServiceClient();

  // Get current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Total generations and cost this month
  const { data: costs } = await serviceClient
    .from('generation_costs')
    .select('user_id, estimated_cost')
    .gte('created_at', monthStart);

  const totalGenerations = costs?.length ?? 0;
  const totalCost = (costs ?? []).reduce((sum, c) => sum + (c.estimated_cost ?? 0), 0);
  const averageCost = totalGenerations > 0 ? totalCost / totalGenerations : 0;

  // Per-user breakdown
  const userMap = new Map<string, { count: number; cost: number }>();
  for (const c of costs ?? []) {
    const existing = userMap.get(c.user_id) ?? { count: 0, cost: 0 };
    existing.count += 1;
    existing.cost += c.estimated_cost ?? 0;
    userMap.set(c.user_id, existing);
  }

  // Get user emails
  const userIds = Array.from(userMap.keys());
  const { data: users } = userIds.length > 0
    ? await serviceClient
        .from('users')
        .select('id, email')
        .in('id', userIds)
    : { data: [] };

  const emailMap = new Map((users ?? []).map((u) => [u.id, u.email]));

  const topUsers = Array.from(userMap.entries())
    .map(([userId, stats]) => ({
      user_id: userId,
      email: emailMap.get(userId) ?? '',
      generation_count: stats.count,
      total_cost: stats.cost,
    }))
    .sort((a, b) => b.generation_count - a.generation_count)
    .slice(0, 20);

  return NextResponse.json({
    totalGenerations,
    totalCost,
    averageCost,
    topUsers,
  });
}
