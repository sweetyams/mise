// @ts-nocheck
// =============================================================================
// MISE Recipe Store — Persist recipes with prompt snapshots
// =============================================================================
// Helper function to store a recipe along with its PromptSnapshot in the
// `recipes.prompt_used` JSONB column.
// Requirements: 3.2, 5.16, 8.1
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';
import type { Recipe, PromptSnapshot } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// storeRecipeWithSnapshot — persists recipe + snapshot to Supabase
// ---------------------------------------------------------------------------

export async function storeRecipeWithSnapshot(
  recipe: Recipe,
  snapshot: PromptSnapshot,
  userId: string
): Promise<{ id: string } | { error: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      id: recipe.id,
      user_id: userId,
      fingerprint_id: snapshot.fingerprint.fingerprintId,
      title: recipe.title,
      version: recipe.version,
      intent: recipe.intent,
      flavour: recipe.flavour,
      components: recipe.components,
      timeline: recipe.timeline,
      variations: recipe.variations,
      related: recipe.related,
      thinking: recipe.thinking,
      prompt_used: snapshot,
      complexity_mode: recipe.complexityMode,
      cooked: recipe.cooked,
      dev_notes: recipe.devNotes,
      tags: recipe.tags,
      is_public: recipe.isPublic,
    })
    .select('id')
    .single();

  if (error) {
    return { error: `Failed to store recipe: ${error.message}` };
  }

  return { id: data.id };
}
