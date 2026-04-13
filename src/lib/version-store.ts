// =============================================================================
// MISE Version Store — Recipe Versioning with Dial Direction Support
// =============================================================================
// Tracks recipe versions, diffs, and version history. Each version stores the
// full recipe_data JSONB, prompt_snapshot, and optional dial_direction.
// Uses createServiceClient() for DB access.
// Requirements: 9.1–9.5
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';
import type { Recipe, PromptSnapshot, DialDirection } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionNumber: number;
  recipeData: Recipe;
  promptSnapshot: PromptSnapshot;
  dialDirection: DialDirection | null;
  createdAt: string;
}

export interface VersionHistoryEntry {
  id: string;
  versionNumber: number;
  createdAt: string;
  dialDirection: DialDirection | null;
  fingerprint: string | null;
  chefBrainVersion: number | null;
}

export type { RecipeDiff } from '@/lib/recipe-diff';

// ---------------------------------------------------------------------------
// createVersion — insert a new version with sequential version_number
// ---------------------------------------------------------------------------

export async function createVersion(
  recipeId: string,
  recipe: Recipe,
  promptSnapshot: PromptSnapshot,
  dialDirection?: DialDirection
): Promise<RecipeVersion | { error: string }> {
  const supabase = createServiceClient();

  // Get the next version number
  const { data: latest } = await supabase
    .from('recipe_versions')
    .select('version_number')
    .eq('recipe_id', recipeId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from('recipe_versions')
    .insert({
      recipe_id: recipeId,
      version_number: nextVersion,
      recipe_data: recipe,
      prompt_snapshot: promptSnapshot,
      dial_direction: dialDirection ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { error: `Failed to create version: ${error?.message ?? 'Unknown error'}` };
  }

  return {
    id: data.id,
    recipeId: data.recipe_id,
    versionNumber: data.version_number,
    recipeData: data.recipe_data as Recipe,
    promptSnapshot: data.prompt_snapshot as PromptSnapshot,
    dialDirection: data.dial_direction as DialDirection | null,
    createdAt: data.created_at,
  };
}


// ---------------------------------------------------------------------------
// getVersionHistory — chronological list with metadata
// ---------------------------------------------------------------------------

export async function getVersionHistory(
  recipeId: string
): Promise<VersionHistoryEntry[] | { error: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('recipe_versions')
    .select('id, version_number, created_at, dial_direction, prompt_snapshot, recipe_data')
    .eq('recipe_id', recipeId)
    .order('version_number', { ascending: true });

  if (error) {
    return { error: `Failed to load version history: ${error.message}` };
  }

  return (data ?? []).map((row) => {
    const snapshot = row.prompt_snapshot as PromptSnapshot | null;
    const recipeData = row.recipe_data as Recipe | null;

    return {
      id: row.id,
      versionNumber: row.version_number,
      createdAt: row.created_at,
      dialDirection: row.dial_direction as DialDirection | null,
      fingerprint: recipeData?.fingerprint_id ?? snapshot?.fingerprint?.fingerprintName ?? null,
      chefBrainVersion: snapshot?.chefBrain?.version ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// getVersion — fetch a single version by ID
// ---------------------------------------------------------------------------

export async function getVersion(
  versionId: string
): Promise<RecipeVersion | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('recipe_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    recipeId: data.recipe_id,
    versionNumber: data.version_number,
    recipeData: data.recipe_data as Recipe,
    promptSnapshot: data.prompt_snapshot as PromptSnapshot,
    dialDirection: data.dial_direction as DialDirection | null,
    createdAt: data.created_at,
  };
}

// ---------------------------------------------------------------------------
// diffVersions — re-exported from recipe-diff.ts (client-safe)
// ---------------------------------------------------------------------------

export { diffVersions } from '@/lib/recipe-diff';

// ---------------------------------------------------------------------------
// revertToVersion — create a new version with the target version's data
// ---------------------------------------------------------------------------

export async function revertToVersion(
  recipeId: string,
  versionId: string
): Promise<RecipeVersion | { error: string }> {
  const targetVersion = await getVersion(versionId);

  if (!targetVersion) {
    return { error: 'Target version not found.' };
  }

  return createVersion(
    recipeId,
    targetVersion.recipeData,
    targetVersion.promptSnapshot
  );
}
