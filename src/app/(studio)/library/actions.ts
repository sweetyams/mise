'use server';

// =============================================================================
// MISE Recipe Library — Server Actions (CRUD)
// =============================================================================
// Server actions for recipe persistence: save, read, update, delete, search,
// tag, mark as cooked, dev notes. Uses createClient() (cookie-based) for
// auth-aware operations.
// Requirements: 8.1–8.10
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import type { Recipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecipeRow {
  id: string;
  user_id: string;
  fingerprint_id: string | null;
  title: string;
  version: number;
  intent: Recipe['intent'];
  flavour: Recipe['flavour'];
  components: Recipe['components'];
  timeline: Recipe['timeline'];
  variations: Recipe['variations'];
  related: Recipe['related'];
  thinking: Recipe['thinking'];
  prompt_used: Recipe['promptSnapshot'];
  complexity_mode: string;
  cooked: boolean;
  dev_notes: string | null;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// saveRecipe — auto-persist on generation
// ---------------------------------------------------------------------------

export async function saveRecipe(
  recipe: Recipe,
  userId: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  // Check user tier — free-tier users cannot save
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return { success: false, error: 'Unable to verify account. Please try again.' };
  }

  if (user.tier === 'free') {
    return {
      success: false,
      error: 'The Recipe Library requires a paid plan. Upgrade to save and organise your recipes.',
    };
  }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      id: recipe.id,
      user_id: userId,
      fingerprint_id: recipe.promptSnapshot?.fingerprint?.fingerprintId ?? null,
      title: recipe.title,
      version: recipe.version,
      intent: recipe.intent,
      flavour: recipe.flavour,
      components: recipe.components,
      timeline: recipe.timeline,
      variations: recipe.variations,
      related: recipe.related,
      thinking: recipe.thinking,
      prompt_used: recipe.promptSnapshot,
      complexity_mode: recipe.complexityMode,
      cooked: false,
      dev_notes: recipe.devNotes,
      tags: recipe.tags,
      is_public: recipe.isPublic,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: `Failed to save recipe: ${error.message}` };
  }

  return { success: true, data: { id: data.id } };
}


// ---------------------------------------------------------------------------
// getRecipes — return all recipes sorted by updated_at DESC
// ---------------------------------------------------------------------------

export async function getRecipes(
  userId: string
): Promise<ActionResult<RecipeRow[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return { success: false, error: `Failed to load recipes: ${error.message}` };
  }

  return { success: true, data: (data ?? []) as RecipeRow[] };
}

// ---------------------------------------------------------------------------
// updateRecipe — update editable fields, set updated_at
// ---------------------------------------------------------------------------

export async function updateRecipe(
  recipeId: string,
  fields: Partial<Pick<RecipeRow, 'title' | 'components' | 'dev_notes' | 'tags' | 'is_public'>>
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('recipes')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', recipeId);

  if (error) {
    return { success: false, error: `Failed to update recipe: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// deleteRecipe — remove recipe record
// ---------------------------------------------------------------------------

export async function deleteRecipe(
  recipeId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId);

  if (error) {
    return { success: false, error: `Failed to delete recipe: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// searchRecipes — search by title (trigram), ingredient name, or tag
// ---------------------------------------------------------------------------

export async function searchRecipes(
  userId: string,
  query: string
): Promise<ActionResult<RecipeRow[]>> {
  const supabase = await createClient();
  const q = query.trim().toLowerCase();

  if (!q) {
    return getRecipes(userId);
  }

  // Use ilike for case-insensitive title search (leverages trigram index)
  // Also search within components JSONB for ingredient names and tags
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${q}%,components.cs.${JSON.stringify([{ ingredients: [{ name: q }] }])},tags.cs.${JSON.stringify([q])}`)
    .order('updated_at', { ascending: false });

  if (error) {
    // Fall back to simple title search if complex query fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false });

    if (fallbackError) {
      return { success: false, error: `Search failed: ${fallbackError.message}` };
    }

    return { success: true, data: (fallbackData ?? []) as RecipeRow[] };
  }

  return { success: true, data: (data ?? []) as RecipeRow[] };
}

// ---------------------------------------------------------------------------
// addTags — persist tags array
// ---------------------------------------------------------------------------

export async function addTags(
  recipeId: string,
  tags: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('recipes')
    .update({ tags, updated_at: new Date().toISOString() })
    .eq('id', recipeId);

  if (error) {
    return { success: false, error: `Failed to update tags: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// markAsCooked — set cooked = true
// ---------------------------------------------------------------------------

export async function markAsCooked(
  recipeId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('recipes')
    .update({ cooked: true, updated_at: new Date().toISOString() })
    .eq('id', recipeId);

  if (error) {
    return { success: false, error: `Failed to mark as cooked: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// addDevNotes — persist dev_notes
// ---------------------------------------------------------------------------

export async function addDevNotes(
  recipeId: string,
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('recipes')
    .update({ dev_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', recipeId);

  if (error) {
    return { success: false, error: `Failed to save dev notes: ${error.message}` };
  }

  return { success: true, data: undefined };
}
