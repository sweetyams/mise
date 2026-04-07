// =============================================================================
// MISE Rate Limiter — Generation counting and tier enforcement
// =============================================================================
// Enforces generation limits per plan tier and maximum token caps per request.
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'home_cook' | 'creator' | 'brigade';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetDate: string; // ISO date of next month reset
  reason?: string;
}

export interface GenerationCostRecord {
  userId: string;
  recipeId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // USD
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GENERATION_LIMITS: Record<PlanTier, number | null> = {
  free: 10,
  home_cook: null, // unlimited
  creator: null,
  brigade: null,
};

export const MAX_INPUT_TOKENS = 1200;
export const MAX_OUTPUT_TOKENS = 2000;

// ---------------------------------------------------------------------------
// getNextResetDate — first of next month
// ---------------------------------------------------------------------------

function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = createServiceClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('tier, generation_count_this_month, generation_count_reset_date')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return {
      allowed: false,
      remaining: 0,
      resetDate: getNextResetDate(),
      reason: 'User not found',
    };
  }

  const tier = user.tier as PlanTier;
  let countThisMonth = user.generation_count_this_month as number;
  const resetDate = user.generation_count_reset_date as string;

  // Check if we need to reset the monthly counter
  const today = new Date().toISOString().split('T')[0];
  if (resetDate && today >= getNextResetDate() || needsReset(resetDate)) {
    // Reset the counter
    const newResetDate = getNextResetDate();
    await supabase
      .from('users')
      .update({
        generation_count_this_month: 0,
        generation_count_reset_date: today,
      })
      .eq('id', userId);
    countThisMonth = 0;
  }

  const limit = GENERATION_LIMITS[tier];

  // Unlimited for paid tiers
  if (limit === null) {
    return {
      allowed: true,
      remaining: -1, // -1 signals unlimited
      resetDate: getNextResetDate(),
    };
  }

  const remaining = Math.max(0, limit - countThisMonth);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      resetDate: getNextResetDate(),
      reason: `You've reached your limit of ${limit} generations this month. Upgrade your plan for unlimited access.`,
    };
  }

  return {
    allowed: true,
    remaining,
    resetDate: getNextResetDate(),
  };
}

// ---------------------------------------------------------------------------
// needsReset — check if the reset date is in a previous month
// ---------------------------------------------------------------------------

function needsReset(resetDateStr: string): boolean {
  const resetDate = new Date(resetDateStr);
  const now = new Date();
  return (
    resetDate.getFullYear() < now.getFullYear() ||
    (resetDate.getFullYear() === now.getFullYear() &&
      resetDate.getMonth() < now.getMonth())
  );
}

// ---------------------------------------------------------------------------
// recordGenerationCost
// ---------------------------------------------------------------------------

export async function recordGenerationCost(
  record: GenerationCostRecord
): Promise<{ error: string | null }> {
  const supabase = createServiceClient();

  // Insert cost record
  const { error: insertError } = await supabase
    .from('generation_costs')
    .insert({
      user_id: record.userId,
      recipe_id: record.recipeId,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      estimated_cost: record.estimatedCost,
      created_at: record.createdAt,
    });

  if (insertError) {
    console.error('[MISE] Failed to record generation cost:', insertError);
    return { error: insertError.message };
  }

  // Increment monthly generation count
  // Use raw SQL via rpc or manual increment
  const { data: user } = await supabase
    .from('users')
    .select('generation_count_this_month')
    .eq('id', record.userId)
    .single();

  if (user) {
    await supabase
      .from('users')
      .update({
        generation_count_this_month: (user.generation_count_this_month as number) + 1,
      })
      .eq('id', record.userId);
  }

  return { error: null };
}
