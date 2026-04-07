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

export interface RecipeDiff {
  componentsAdded: string[];
  componentsRemoved: string[];
  componentsChanged: Array<{
    name: string;
    ingredientsAdded: string[];
    ingredientsRemoved: string[];
    ingredientsChanged: string[];
    stepsChanged: boolean;
  }>;
  flavourChanged: boolean;
  thinkingChanged: boolean;
  summary: string;
}

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
      fingerprint: recipeData?.fingerprint ?? snapshot?.fingerprint?.fingerprintName ?? null,
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
// diffVersions — compare two Recipe objects
// ---------------------------------------------------------------------------

export function diffVersions(
  recipeA: Recipe,
  recipeB: Recipe
): RecipeDiff {
  const compNamesA = new Set(recipeA.components.map((c) => c.name));
  const compNamesB = new Set(recipeB.components.map((c) => c.name));

  const componentsAdded = [...compNamesB].filter((n) => !compNamesA.has(n));
  const componentsRemoved = [...compNamesA].filter((n) => !compNamesB.has(n));

  const componentsChanged: RecipeDiff['componentsChanged'] = [];

  for (const compB of recipeB.components) {
    const compA = recipeA.components.find((c) => c.name === compB.name);
    if (!compA) continue; // new component, already in componentsAdded

    const ingNamesA = new Set(compA.ingredients.map((i) => i.name));
    const ingNamesB = new Set(compB.ingredients.map((i) => i.name));

    const ingredientsAdded = [...ingNamesB].filter((n) => !ingNamesA.has(n));
    const ingredientsRemoved = [...ingNamesA].filter((n) => !ingNamesB.has(n));

    // Check for changed ingredients (same name, different amount/unit)
    const ingredientsChanged: string[] = [];
    for (const ingB of compB.ingredients) {
      const ingA = compA.ingredients.find((i) => i.name === ingB.name);
      if (ingA && (ingA.amount !== ingB.amount || ingA.unit !== ingB.unit)) {
        ingredientsChanged.push(ingB.name);
      }
    }

    const stepsChanged =
      compA.steps.length !== compB.steps.length ||
      compA.steps.some(
        (s, i) => s.instruction !== compB.steps[i]?.instruction
      );

    if (
      ingredientsAdded.length > 0 ||
      ingredientsRemoved.length > 0 ||
      ingredientsChanged.length > 0 ||
      stepsChanged
    ) {
      componentsChanged.push({
        name: compB.name,
        ingredientsAdded,
        ingredientsRemoved,
        ingredientsChanged,
        stepsChanged,
      });
    }
  }

  const flavourChanged =
    JSON.stringify(recipeA.flavour) !== JSON.stringify(recipeB.flavour);

  const thinkingChanged =
    JSON.stringify(recipeA.thinking) !== JSON.stringify(recipeB.thinking);

  // Build summary
  const parts: string[] = [];
  if (componentsAdded.length > 0) parts.push(`Added: ${componentsAdded.join(', ')}`);
  if (componentsRemoved.length > 0) parts.push(`Removed: ${componentsRemoved.join(', ')}`);
  if (componentsChanged.length > 0) {
    for (const c of componentsChanged) {
      const changes: string[] = [];
      if (c.ingredientsAdded.length > 0) changes.push(`+${c.ingredientsAdded.join(', ')}`);
      if (c.ingredientsRemoved.length > 0) changes.push(`-${c.ingredientsRemoved.join(', ')}`);
      if (c.ingredientsChanged.length > 0) changes.push(`~${c.ingredientsChanged.join(', ')}`);
      if (c.stepsChanged) changes.push('steps modified');
      parts.push(`${c.name}: ${changes.join('; ')}`);
    }
  }
  if (flavourChanged) parts.push('Flavour architecture changed');
  if (thinkingChanged) parts.push('Thinking updated');

  return {
    componentsAdded,
    componentsRemoved,
    componentsChanged,
    flavourChanged,
    thinkingChanged,
    summary: parts.length > 0 ? parts.join('. ') + '.' : 'No changes detected.',
  };
}

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
