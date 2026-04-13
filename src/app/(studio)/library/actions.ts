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
import type { RecipeCard } from '@/lib/types/recipe-card';
import { CookbookFormatSchema } from '@/lib/zod-schemas';
import { buildRecipeCardPrompt } from '@/lib/recipe-card-prompt';
import { createAIProvider } from '@/lib/ai-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecipeRow {
  id: string;
  user_id: string;
  fingerprint_id: string | null;
  fingerprint_name: string | null;
  title: string;
  version: number;
  intent: Recipe['intent'];
  flavour: Recipe['flavour'];
  components: Recipe['components'];
  timeline: Recipe['timeline'];
  variations: Recipe['variations'];
  related: Recipe['relationships'];
  thinking: Recipe['thinking'];
  decision_lock_answers: Array<{ question: string; answer: string }> | null;
  prompt_used: any;
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

  // Tier check bypassed for development
  // TODO: re-enable tier check before production
  // if (user.tier === 'free') {
  //   return { success: false, error: 'The Recipe Library requires a paid plan.' };
  // }

  const { data, error } = await supabase
    .from('recipes')
    .insert({
      id: recipe.id,
      user_id: userId,
      fingerprint_id: (recipe as any).promptSnapshot?.fingerprint?.fingerprintId ?? null,
      title: recipe.title,
      version: recipe.version,
      intent: recipe.intent,
      flavour: recipe.flavour,
      components: recipe.components,
      timeline: recipe.timeline,
      variations: recipe.variations,
      related: recipe.relationships,
      thinking: recipe.thinking,
      decision_lock_answers: recipe.decision_lock_answers ?? null,
      prompt_used: (recipe as any).promptSnapshot,
      complexity_mode: recipe.complexity_mode,
      cooked: false,
      dev_notes: recipe.devNotes,
      tags: recipe.tags,
      is_public: (recipe as any).isPublic,
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
  userId?: string
): Promise<ActionResult<RecipeRow[]>> {
  const supabase = await createClient();

  // Get userId from session if not provided
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) {
    return { success: false, error: 'You must be signed in to view your library.' };
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('*, fingerprints(name)')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });

  if (error) {
    return { success: false, error: `Failed to load recipes: ${error.message}` };
  }

  // Flatten the joined fingerprint name onto each row
  const recipes = (data ?? []).map((row: any) => ({
    ...row,
    fingerprint_name: row.fingerprints?.name ?? null,
  })) as RecipeRow[];

  return { success: true, data: recipes };
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
// deleteVersion — remove a single version snapshot
// ---------------------------------------------------------------------------

export async function deleteVersion(
  versionId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('recipe_versions')
    .delete()
    .eq('id', versionId);

  if (error) {
    return { success: false, error: `Failed to delete version: ${error.message}` };
  }

  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// searchRecipes — search by title (trigram), ingredient name, or tag
// ---------------------------------------------------------------------------

export async function searchRecipes(
  userId: string | undefined,
  query: string
): Promise<ActionResult<RecipeRow[]>> {
  const supabase = await createClient();
  const q = query.trim().toLowerCase();

  // Get userId from session if not provided
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) {
    return { success: false, error: 'You must be signed in.' };
  }

  if (!q) {
    return getRecipes(uid);
  }

  // Multi-field search using Supabase .or() across title, intent JSONB fields,
  // flavour JSONB fields, and tags (cast to text for ilike matching).
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', uid)
      .or(
        `title.ilike.%${q}%,intent->occasion.ilike.%${q}%,intent->mood.ilike.%${q}%,intent->season.ilike.%${q}%,intent->effort.ilike.%${q}%,flavour->dominant_element.ilike.%${q}%,tags::text.ilike.%${q}%`
      )
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data: (data ?? []) as RecipeRow[] };
  } catch {
    // Fall back to simple title-only search if multi-field query fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', uid)
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false });

    if (fallbackError) {
      return { success: false, error: `Search failed: ${fallbackError.message}` };
    }

    return { success: true, data: (fallbackData ?? []) as RecipeRow[] };
  }
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


// ---------------------------------------------------------------------------
// getRecipeVersion — fetch a specific version's recipe data
// ---------------------------------------------------------------------------

export async function getRecipeVersion(
  versionId: string
): Promise<ActionResult<RecipeRow>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('recipe_versions')
    .select('recipe_data, recipe_id')
    .eq('id', versionId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Version not found.' };
  }

  // Return the version's recipe_data as a RecipeRow-like object
  return { success: true, data: data.recipe_data as RecipeRow };
}


// ---------------------------------------------------------------------------
// generateAndSaveRecipeCard — AI-powered cookbook card generation
// ---------------------------------------------------------------------------

export async function generateAndSaveRecipeCard(
  recipeId: string,
  versionId?: string | null
): Promise<ActionResult<RecipeCard>> {
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to generate a recipe card.' };
  }

  // 2. Get recipe data — from a specific version or the current recipe row
  let recipeData: Record<string, unknown>;
  let version: number;

  if (versionId) {
    // Fetch from recipe_versions table
    const { data: versionRow, error: versionError } = await supabase
      .from('recipe_versions')
      .select('recipe_data, version_number')
      .eq('id', versionId)
      .single();

    if (versionError || !versionRow) {
      return { success: false, error: 'Version not found.' };
    }
    recipeData = versionRow.recipe_data as Record<string, unknown>;
    version = versionRow.version_number ?? 1;
  } else {
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single();

    if (recipeError || !recipe) {
      return { success: false, error: 'Recipe not found.' };
    }
    recipeData = recipe;
    version = recipe.version ?? 1;
  }

  // 3. Serialize recipe data and build prompt
  const recipeJson = JSON.stringify(recipeData);
  const prompt = buildRecipeCardPrompt(recipeJson);

  // 4. Call AI provider
  let aiResponse: string;
  try {
    const provider = await createAIProvider();
    aiResponse = await provider.generateRecipeCard(prompt.userMessage, prompt.systemPrompt);
  } catch {
    return {
      success: false,
      error: 'An error occurred generating the recipe card. Please try again.',
    };
  }

  // 5. Parse AI response — try JSON.parse, then markdown code blocks, then { ... }
  let parsed: unknown;
  console.log('[MISE] Recipe card raw AI response (first 500 chars):', aiResponse.slice(0, 500));
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    const codeBlockMatch = aiResponse.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      } catch {
        /* continue */
      }
    }
    if (!parsed) {
      const objMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          parsed = JSON.parse(objMatch[0]);
        } catch {
          /* continue */
        }
      }
    }
  }

  if (!parsed) {
    return {
      success: false,
      error: 'The generated recipe card had an unexpected format. Please try again.',
    };
  }

  // 6. Validate with Zod
  const validation = CookbookFormatSchema.safeParse(parsed);
  if (!validation.success) {
    console.error('[MISE] Recipe card Zod validation failed:', JSON.stringify(validation.error.issues, null, 2));
    console.error('[MISE] Recipe card parsed keys:', Object.keys(parsed as Record<string, unknown>));
    return {
      success: false,
      error: 'The generated recipe card had an unexpected format. Please try again.',
    };
  }

  const validatedContent = validation.data;

  // 7. Upsert into recipe_cards (one card per recipe+version)
  const { data: card, error: upsertError } = await supabase
    .from('recipe_cards')
    .upsert(
      {
        id: crypto.randomUUID(),
        recipe_id: recipeId,
        user_id: user.id,
        recipe_version: version,
        content: validatedContent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'recipe_id,recipe_version' }
    )
    .select('*')
    .single();

  if (upsertError || !card) {
    return {
      success: false,
      error: 'Failed to save the recipe card. Please try again.',
    };
  }

  return { success: true, data: card as RecipeCard };
}

// ---------------------------------------------------------------------------
// getRecipeCard — fetch existing cookbook card for a recipe
// ---------------------------------------------------------------------------

export async function getRecipeCard(
  recipeId: string,
  recipeVersion?: number
): Promise<ActionResult<RecipeCard | null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to view recipe cards.' };
  }

  let query = supabase
    .from('recipe_cards')
    .select('*')
    .eq('recipe_id', recipeId);

  if (recipeVersion != null) {
    query = query.eq('recipe_version', recipeVersion);
  } else {
    query = query.order('recipe_version', { ascending: false }).limit(1);
  }

  const { data: cards, error } = await query;

  if (error) {
    return { success: false, error: 'Failed to load recipe card.' };
  }

  const card = cards && cards.length > 0 ? cards[0] : null;
  return { success: true, data: (card as RecipeCard) ?? null };
}
