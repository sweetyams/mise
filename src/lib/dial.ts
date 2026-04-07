// =============================================================================
// MISE The Dial — Recipe Evolution Tool (Backend)
// =============================================================================
// Each push generates a full new recipe version via an API call. The previous
// version is preserved. Users can dial from any version in history.
// Uses createServiceClient() for DB, createAIProvider() for AI.
// Requirements: 9.6–9.11
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';
import { createAIProvider } from '@/lib/ai-provider';
import { RecipeSchema } from '@/lib/zod-schemas';
import { createVersion, getVersion, type RecipeVersion } from '@/lib/version-store';
import type { Recipe, DialDirection, PromptSnapshot } from '@/lib/types/recipe';
import { assemblePrompt, buildPromptSnapshot } from '@/lib/prompt-assembler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialResult {
  newVersion: RecipeVersion;
  changes: string;
  previousVersionId: string;
}

// ---------------------------------------------------------------------------
// Dial direction labels (Canadian English)
// ---------------------------------------------------------------------------

const DIAL_LABELS: Record<DialDirection, string> = {
  more_acid: 'More Acid',
  more_heat: 'More Heat',
  more_umami: 'More Umami',
  smokier: 'Smokier',
  lighter: 'Lighter',
  funkier: 'Funkier',
  different_region: 'Different Region',
  riff_mode: 'Riff Mode',
};

const DIAL_INSTRUCTIONS: Record<DialDirection, string> = {
  more_acid: 'Evolve this recipe to be more acid-forward. Add or increase acid elements, brighten the dish, and adjust the balance accordingly. Explain what changed and why.',
  more_heat: 'Evolve this recipe to bring more heat. Increase spice levels, add heat sources, and adjust the balance. Explain what changed and why.',
  more_umami: 'Evolve this recipe to be more umami-rich. Deepen savoury elements, add umami sources, and adjust the balance. Explain what changed and why.',
  smokier: 'Evolve this recipe to be smokier. Introduce or increase smoke elements through technique or ingredients. Explain what changed and why.',
  lighter: 'Evolve this recipe to be lighter. Reduce richness, brighten flavours, and make the dish feel more delicate. Explain what changed and why.',
  funkier: 'Evolve this recipe to be funkier. Add fermented, aged, or funky elements. Push the flavour into more adventurous territory. Explain what changed and why.',
  different_region: 'Reimagine this recipe through a different regional culinary lens. Keep the core concept but shift the flavour profile, techniques, and ingredients to a different cuisine. Explain the regional shift and why.',
  riff_mode: 'Take this recipe in a completely unexpected direction. Riff on the core idea — change techniques, swap flavour profiles, surprise the cook. Explain your creative reasoning.',
};

// ---------------------------------------------------------------------------
// dialRecipe — generate a new version via The Dial
// ---------------------------------------------------------------------------

export async function dialRecipe(
  recipeId: string,
  direction: DialDirection,
  userId: string,
  fromVersionId?: string
): Promise<DialResult | { error: string }> {
  const supabase = createServiceClient();

  // 1. Fetch the source recipe data
  let sourceRecipe: Recipe;
  let previousVersionId: string;

  if (fromVersionId) {
    // Dial from a specific version
    const version = await getVersion(fromVersionId);
    if (!version) {
      return { error: 'Source version not found.' };
    }
    sourceRecipe = version.recipeData;
    previousVersionId = version.id;
  } else {
    // Dial from the current recipe in DB
    const { data: recipeRow, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (fetchError || !recipeRow) {
      return { error: 'Recipe not found.' };
    }

    sourceRecipe = rowToRecipe(recipeRow);
    previousVersionId = recipeId;
  }

  // 2. Assemble prompt with current recipe + dial direction
  const fingerprintId = sourceRecipe.promptSnapshot?.fingerprint?.fingerprintId ?? '';
  const assembled = await assemblePrompt(
    userId,
    fingerprintId,
    { dishDescription: `Evolve this recipe: ${sourceRecipe.title}` },
    sourceRecipe.complexityMode
  );

  const dialPrompt = [
    `You are evolving an existing recipe using The Dial. Direction: ${DIAL_LABELS[direction]}.`,
    '',
    DIAL_INSTRUCTIONS[direction],
    '',
    'Current recipe JSON:',
    JSON.stringify(sourceRecipe, null, 2),
    '',
    'Generate a complete new Recipe JSON object with the evolution applied.',
    'Return ONLY valid JSON matching the Recipe schema. Keep the same id and increment the version number.',
  ].join('\n');

  // 3. Call AI Provider
  const provider = await createAIProvider();
  let rawOutput = '';

  try {
    const stream = await provider.generateRecipe(
      assembled.systemPrompt,
      dialPrompt
    );

    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawOutput += value;
    }
  } catch {
    return { error: 'AI generation failed. Please try again.' };
  }

  // 4. Parse and validate with Zod
  let newRecipe: Recipe;
  try {
    const parsed = JSON.parse(rawOutput);
    const result = RecipeSchema.safeParse(parsed);
    if (!result.success) {
      return { error: `Validation failed: ${result.error.issues.map((i) => i.message).join(', ')}` };
    }
    newRecipe = result.data as Recipe;
  } catch {
    return { error: 'Failed to parse AI response. Please try again.' };
  }

  // 5. Build prompt snapshot
  const snapshot = buildPromptSnapshot(
    assembled,
    rawOutput.length / 4, // rough token estimate
    fingerprintId,
    sourceRecipe.promptSnapshot?.fingerprint?.fingerprintName ?? '',
    userId
  );

  // 6. Create new version with dial_direction
  const versionResult = await createVersion(
    recipeId,
    newRecipe,
    snapshot,
    direction
  );

  if ('error' in versionResult) {
    return { error: versionResult.error };
  }

  // 7. Build changes summary
  const changes = buildChangesSummary(sourceRecipe, newRecipe, direction);

  return {
    newVersion: versionResult,
    changes,
    previousVersionId,
  };
}

// ---------------------------------------------------------------------------
// getDialHistory — all versions with their dial directions
// ---------------------------------------------------------------------------

export async function getDialHistory(
  recipeId: string
): Promise<Array<{ version: RecipeVersion; dialDirection: DialDirection | null }> | { error: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('recipe_versions')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('version_number', { ascending: true });

  if (error) {
    return { error: `Failed to load dial history: ${error.message}` };
  }

  return (data ?? []).map((row) => ({
    version: {
      id: row.id,
      recipeId: row.recipe_id,
      versionNumber: row.version_number,
      recipeData: row.recipe_data as Recipe,
      promptSnapshot: row.prompt_snapshot as PromptSnapshot,
      dialDirection: row.dial_direction as DialDirection | null,
      createdAt: row.created_at,
    },
    dialDirection: row.dial_direction as DialDirection | null,
  }));
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildChangesSummary(
  oldRecipe: Recipe,
  newRecipe: Recipe,
  direction: DialDirection
): string {
  const parts: string[] = [`Dialled ${DIAL_LABELS[direction]}.`];

  // Compare components
  const oldNames = new Set(oldRecipe.components.map((c) => c.name));
  const newNames = new Set(newRecipe.components.map((c) => c.name));

  const added = [...newNames].filter((n) => !oldNames.has(n));
  const removed = [...oldNames].filter((n) => !newNames.has(n));

  if (added.length > 0) parts.push(`Added components: ${added.join(', ')}.`);
  if (removed.length > 0) parts.push(`Removed components: ${removed.join(', ')}.`);

  // Compare flavour
  if (oldRecipe.flavour.dominant !== newRecipe.flavour.dominant) {
    parts.push(`Flavour direction shifted from ${oldRecipe.flavour.dominant} to ${newRecipe.flavour.dominant}.`);
  }

  // Compare ingredient counts
  const oldIngCount = oldRecipe.components.reduce((sum, c) => sum + c.ingredients.length, 0);
  const newIngCount = newRecipe.components.reduce((sum, c) => sum + c.ingredients.length, 0);
  if (newIngCount !== oldIngCount) {
    const diff = newIngCount - oldIngCount;
    parts.push(`${diff > 0 ? '+' : ''}${diff} ingredients overall.`);
  }

  return parts.join(' ');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    fingerprint: row.fingerprint_id ?? '',
    version: row.version,
    intent: row.intent,
    flavour: row.flavour,
    components: row.components,
    timeline: row.timeline,
    variations: row.variations,
    related: row.related,
    thinking: row.thinking,
    promptSnapshot: row.prompt_used,
    complexityMode: row.complexity_mode,
    cooked: row.cooked,
    devNotes: row.dev_notes,
    tags: row.tags ?? [],
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
