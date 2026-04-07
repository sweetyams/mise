'use server';

// =============================================================================
// MISE Fermentation Tracking — Server Actions
// =============================================================================
// CRUD for fermentation logs and tasting notes. Triggers Chef Brain
// recompilation on tasting note addition.
// Requirements: 16.1, 16.2, 16.3, 16.5, 4.2
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import { compileBrain, type BrainCompilationInput } from '@/lib/brain-compiler';
import { createServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FermentationLog {
  id: string;
  recipe_id: string | null;
  user_id: string;
  start_date: string;
  target_duration_days: number;
  temperature: string | null;
  method_description: string;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  elapsed_days: number;
  is_overdue: boolean;
}

export interface TastingNote {
  id: string;
  fermentation_log_id: string;
  taste: string;
  texture: string;
  appearance: string;
  aroma: string;
  overall: string;
  comments: string;
  created_at: string;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateElapsedDays(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function enrichLog(row: Record<string, unknown>): FermentationLog {
  const startDate = row.start_date as string;
  const targetDays = row.target_duration_days as number;
  const elapsed = calculateElapsedDays(startDate);

  return {
    id: row.id as string,
    recipe_id: row.recipe_id as string | null,
    user_id: row.user_id as string,
    start_date: startDate,
    target_duration_days: targetDays,
    temperature: row.temperature as string | null,
    method_description: row.method_description as string,
    status: row.status as 'active' | 'completed' | 'failed',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    elapsed_days: elapsed,
    is_overdue: row.status === 'active' && elapsed > targetDays,
  };
}

// ---------------------------------------------------------------------------
// createFermentationLog
// ---------------------------------------------------------------------------

export async function createFermentationLog(formData: {
  recipe_id?: string;
  start_date: string;
  target_duration_days: number;
  temperature?: string;
  method_description: string;
}): Promise<ActionResult<FermentationLog>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  const { data, error } = await supabase
    .from('fermentation_logs')
    .insert({
      user_id: user.id,
      recipe_id: formData.recipe_id || null,
      start_date: formData.start_date,
      target_duration_days: formData.target_duration_days,
      temperature: formData.temperature || null,
      method_description: formData.method_description,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: `Failed to create log: ${error?.message ?? 'Unknown error'}` };
  }

  return { success: true, data: enrichLog(data) };
}

// ---------------------------------------------------------------------------
// updateFermentationLog
// ---------------------------------------------------------------------------

export async function updateFermentationLog(
  logId: string,
  fields: Partial<{
    status: 'active' | 'completed' | 'failed';
    temperature: string;
    method_description: string;
    target_duration_days: number;
  }>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('fermentation_logs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', logId);

  if (error) {
    return { success: false, error: `Failed to update log: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// getFermentationLogs — all logs for a user
// ---------------------------------------------------------------------------

export async function getFermentationLogs(
  userId?: string
): Promise<ActionResult<FermentationLog[]>> {
  const supabase = await createClient();

  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) {
    return { success: false, error: 'You must be signed in.' };
  }

  const { data, error } = await supabase
    .from('fermentation_logs')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: `Failed to load logs: ${error.message}` };
  }

  return {
    success: true,
    data: (data ?? []).map((row) => enrichLog(row as Record<string, unknown>)),
  };
}

// ---------------------------------------------------------------------------
// getActiveFermentationLogs
// ---------------------------------------------------------------------------

export async function getActiveFermentationLogs(
  userId: string
): Promise<ActionResult<FermentationLog[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('fermentation_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('start_date', { ascending: true });

  if (error) {
    return { success: false, error: `Failed to load active logs: ${error.message}` };
  }

  return {
    success: true,
    data: (data ?? []).map((row) => enrichLog(row as Record<string, unknown>)),
  };
}

// ---------------------------------------------------------------------------
// addTastingNote — persists note and triggers brain recompilation
// ---------------------------------------------------------------------------

export async function addTastingNote(
  fermentationLogId: string,
  note: {
    taste: string;
    texture: string;
    appearance: string;
    aroma: string;
    overall: string;
    comments: string;
  }
): Promise<ActionResult<TastingNote>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }

  // Verify the log belongs to this user
  const { data: log } = await supabase
    .from('fermentation_logs')
    .select('user_id, recipe_id')
    .eq('id', fermentationLogId)
    .single();

  if (!log || log.user_id !== user.id) {
    return { success: false, error: 'Fermentation log not found.' };
  }

  const { data, error } = await supabase
    .from('tasting_notes')
    .insert({
      recipe_id: log.recipe_id,
      user_id: user.id,
      taste: note.taste,
      texture: note.texture,
      appearance: note.appearance,
      aroma: note.aroma,
      overall: note.overall,
      comments: note.comments,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: `Failed to save tasting note: ${error?.message ?? 'Unknown'}` };
  }

  // Trigger Chef Brain recompilation in the background
  triggerBrainRecompilation(user.id).catch((err) =>
    console.error('[MISE] Brain recompilation after tasting note failed:', err)
  );

  return {
    success: true,
    data: {
      id: data.id,
      fermentation_log_id: fermentationLogId,
      taste: data.taste,
      texture: data.texture,
      appearance: data.appearance,
      aroma: data.aroma,
      overall: data.overall,
      comments: data.comments,
      created_at: data.created_at,
    },
  };
}

// ---------------------------------------------------------------------------
// triggerBrainRecompilation — fetch user data and recompile
// ---------------------------------------------------------------------------

async function triggerBrainRecompilation(userId: string): Promise<void> {
  const supabase = createServiceClient();

  // Fetch tasting notes
  const { data: notes } = await supabase
    .from('tasting_notes')
    .select('taste, texture, aroma, comments')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const input: BrainCompilationInput = {
    userId,
    onboardingAnswers: {},
    devLogs: [],
    tastingNotes: (notes ?? []).map((n) => ({
      taste: n.taste ?? '',
      texture: n.texture ?? '',
      aroma: n.aroma ?? '',
      comments: n.comments ?? '',
    })),
    preferences: [],
  };

  await compileBrain(input);
}
