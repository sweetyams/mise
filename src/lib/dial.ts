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
import { parseRecipeMarkdown } from '@/lib/recipe-parser';
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
  custom_prompt: 'Custom',
};

const DIAL_INSTRUCTIONS: Record<DialDirection, string> = {
  more_acid: 'DRAMATICALLY increase the acid presence in this recipe. Don\'t just add a squeeze of lemon — restructure the dish around acid. Add a new acid component (pickled element, vinegar reduction, citrus dressing, fermented condiment). Change at least 2-3 ingredients. The acid should be the FIRST thing you taste. This should feel like a fundamentally different dish, not a minor tweak.',
  more_heat: 'DRAMATICALLY increase the heat in this recipe. Don\'t just add more chilli — introduce a new heat source (fresh chillies, chilli oil, Sichuan peppercorn, horseradish, mustard, wasabi). Change the cooking technique to amplify heat (charring, blooming spices in oil). Replace at least 2 ingredients with spicier alternatives. The heat should be unmistakable and structural, not an afterthought.',
  more_umami: 'DRAMATICALLY deepen the umami in this recipe. Add at least 2 new umami sources (miso, fish sauce, dried mushrooms, Parmesan, anchovies, soy sauce, tomato paste, Worcestershire). Change the cooking technique to build umami (longer browning, caramelisation, reduction). This should taste profoundly savoury — almost meaty even if vegetarian.',
  smokier: 'DRAMATICALLY increase the smoke character. Don\'t just add smoked paprika — introduce actual smoke technique (charring vegetables directly over flame, using smoked salt, smoked butter, chipotle, lapsang souchong tea, smoked fish). Replace at least 2 ingredients with smoked versions. The smoke should be a defining characteristic of the dish.',
  lighter: 'DRAMATICALLY lighten this recipe. Strip out heavy fats, reduce portions of rich ingredients by half or more. Replace cream with yoghurt, butter with olive oil, heavy proteins with lighter ones. Add raw elements, fresh herbs, citrus. Change the cooking technique (steam instead of fry, poach instead of braise). The dish should feel bright, clean, and energising.',
  funkier: 'DRAMATICALLY increase the funk factor. Add fermented, aged, or cultured elements — blue cheese, kimchi, fish sauce, miso, fermented black beans, aged vinegar, funky cheese, fermented chilli paste. Push into territory that makes people pause and then crave more. Replace at least 2-3 ingredients with their fermented or aged equivalents.',
  different_region: 'COMPLETELY reimagine this dish through a different regional lens. If it\'s European, make it Southeast Asian. If it\'s Asian, make it Latin American. Change the spice profile entirely, swap the fat source, change the acid, replace the aromatics. Keep only the core protein or vegetable concept — everything else changes. Name the new regional direction explicitly.',
  riff_mode: 'COMPLETELY reinvent this recipe. Keep the spirit but change everything else. Different cooking technique, different flavour profile, different texture approach. If it was braised, make it raw. If it was rich, make it austere. If it was complex, make it three-ingredient simple. Surprise the cook with something they\'d never have thought of. This should feel like a different chef made it.',
  custom_prompt: '', // Filled dynamically from user input
};

// ---------------------------------------------------------------------------
// dialRecipe — generate a new version via The Dial
// ---------------------------------------------------------------------------

export async function dialRecipe(
  recipeId: string,
  direction: DialDirection,
  userId: string,
  fromVersionId?: string,
  customPrompt?: string
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

  const directionLabel = direction === 'custom_prompt' ? 'Custom Evolution' : DIAL_LABELS[direction];
  const directionInstruction = direction === 'custom_prompt' && customPrompt
    ? `The cook wants you to modify this recipe based on their specific request:\n\n"${customPrompt}"\n\nApply their request thoroughly. Make the changes DRAMATIC and OBVIOUS — not subtle tweaks. Change ingredients, techniques, and flavour profile as needed to fully honour their request.`
    : DIAL_INSTRUCTIONS[direction];

  const dialPrompt = [
    `You are evolving an existing recipe using The Dial. Direction: ${directionLabel}.`,
    '',
    directionInstruction,
    '',
    'CURRENT RECIPE TO EVOLVE:',
    '',
    `Title: ${sourceRecipe.title}`,
    `Components: ${sourceRecipe.components?.map((c: any) => `${c.name} (${c.role || 'component'})`).join(', ') || 'none'}`,
    '',
    'Current ingredients:',
    ...(sourceRecipe.components?.flatMap((c: any) => 
      (c.ingredients || []).map((i: any) => `  - ${i.amount || ''} ${i.unit || ''} ${i.name || ''}`.trim())
    ) || []),
    '',
    `Current flavour direction: ${(sourceRecipe.flavour as any)?.dominant_element || (sourceRecipe.flavour as any)?.dominant || 'not specified'}`,
    `Current flavour profile: ${(sourceRecipe.flavour as any)?.flavour_profile?.join(', ') || (sourceRecipe.flavour as any)?.profile?.join(', ') || 'not specified'}`,
    '',
    'IMPORTANT: Generate a COMPLETE new recipe in the standard markdown format.',
    'The changes should be DRAMATIC and OBVIOUS — not subtle tweaks.',
    'A cook should immediately see and taste the difference.',
    'Change at least 2-3 ingredients and adjust the technique.',
  ].join('\n');

  // 3. Call AI Provider
  console.log('[MISE] Dial: direction=', direction, 'recipe=', recipeId);
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

  console.log('[MISE] Dial: AI output length=', rawOutput.length);

  // 4. Parse markdown into structured recipe data
  let newRecipe: Recipe;
  try {
    const { recipe: parsedRecipe, warnings } = parseRecipeMarkdown(rawOutput);
    if (warnings.length > 0) {
      console.warn('[MISE] Dial parse warnings:', warnings);
    }

    // Map parsed thinking fields to DB schema
    const mappedThinking = {
      origin: (parsedRecipe.thinking as any).origin || parsedRecipe.thinking.approach || '',
      architecture_logic: (parsedRecipe.thinking as any).architecture_logic || parsedRecipe.thinking.architecture || '',
      the_pattern: (parsedRecipe.thinking as any).the_pattern || parsedRecipe.thinking.pattern || '',
      fingerprint_note: (parsedRecipe.thinking as any).fingerprint_note || '',
    };

    newRecipe = {
      ...sourceRecipe,
      title: parsedRecipe.title || sourceRecipe.title,
      version: (sourceRecipe.version ?? 0) + 1,
      intent: {
        ...sourceRecipe.intent,
        effort: (parsedRecipe.intent?.effort as any) || sourceRecipe.intent?.effort || 'medium',
        feeds: parsedRecipe.intent?.feeds || sourceRecipe.intent?.feeds || 4,
        total_time_minutes: parsedRecipe.intent?.total_time_minutes || sourceRecipe.intent?.total_time_minutes || 0,
        active_time_minutes: parsedRecipe.intent?.active_time_minutes || sourceRecipe.intent?.active_time_minutes || 0,
        prep_ahead_notes: parsedRecipe.intent?.prep_ahead_notes || sourceRecipe.intent?.prep_ahead_notes || '',
        can_prep_ahead: !!(parsedRecipe.intent?.prep_ahead_notes || sourceRecipe.intent?.can_prep_ahead),
      },
      flavour: parsedRecipe.flavour as any,
      components: parsedRecipe.components as any,
      timeline: { total_duration_minutes: 0, serve_time: null, stages: parsedRecipe.timeline.map((s) => ({ label: s.name, duration_minutes: s.duration, is_passive: s.parallel, advance_prep: false, component_ids: [], offset_from_start: 0 })), parallel_possible: false, parallel_notes: '', critical_path: [] },
      variations: parsedRecipe.variations as any,
      thinking: mappedThinking as any,
    } as Recipe;
  } catch (parseErr) {
    console.error('[MISE] Dial parse error:', parseErr);
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

  // 6b. Update the main recipe row with the new data
  const { error: updateError } = await supabase
    .from('recipes')
    .update({
      title: newRecipe.title,
      intent: newRecipe.intent,
      flavour: newRecipe.flavour,
      components: newRecipe.components,
      timeline: newRecipe.timeline,
      variations: newRecipe.variations,
      thinking: newRecipe.thinking,
      version: newRecipe.version,
    })
    .eq('id', recipeId);

  if (updateError) {
    console.warn('[MISE] Dial: Failed to update main recipe row:', updateError.message);
    // Non-fatal — version was still created
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
    subtitle: row.subtitle || '',
    fingerprint_id: row.fingerprint_id ?? '',
    fingerprint_version: row.fingerprint_version ?? 0,
    complexity_mode: row.complexity_mode ?? 'kitchen',
    version: row.version ?? 1,
    parent_id: row.parent_id ?? null,
    root_id: row.root_id ?? null,
    created_at: row.created_at ?? '',
    generated_by: row.generated_by ?? '',
    chef_brain_version: row.chef_brain_version ?? 0,
    intent: row.intent ?? {},
    flavour: row.flavour ?? {},
    components: row.components ?? [],
    timeline: Array.isArray(row.timeline)
      ? { total_duration_minutes: 0, serve_time: null, stages: row.timeline.map((s: any) => ({ label: s.name || s.label || '', duration_minutes: s.duration || s.duration_minutes || 0, is_passive: s.parallel || s.is_passive || false, advance_prep: s.advance_prep || false, component_ids: [], offset_from_start: 0 })), parallel_possible: false, parallel_notes: '', critical_path: [] }
      : (row.timeline ?? { total_duration_minutes: 0, serve_time: null, stages: [], parallel_possible: false, parallel_notes: '', critical_path: [] }),
    scaling: row.scaling ?? { base_serves: 4, min_serves: 1, max_serves: 12, non_linear_notes: [], equipment_notes: '', batch_notes: '' },
    variations: row.variations ?? {},
    relationships: row.related ?? {},
    thinking: {
      origin: row.thinking?.origin || row.thinking?.approach || '',
      architecture_logic: row.thinking?.architecture_logic || row.thinking?.architecture || '',
      the_pattern: row.thinking?.the_pattern || row.thinking?.pattern || '',
      fingerprint_note: row.thinking?.fingerprint_note || '',
    },
    decision_lock_answers: row.decision_lock_answers ?? undefined,
    shopping_list: row.shopping_list ?? { grouped_by_section: [], pantry_assumed: [], the_one_thing: '' },
    development_log: row.development_log ?? [],
    meta: row.meta ?? { is_public: false, public_slug: '', share_card_generated: false, times_generated: 0, times_cooked: 0, tags: [], source_prompt: '', token_usage: { input_tokens: 0, output_tokens: 0, fingerprint_layers_loaded: [] }, language: 'en' },
    // Legacy compat fields
    fingerprint: row.fingerprint_id ?? '',
    complexityMode: row.complexity_mode ?? 'kitchen',
    promptSnapshot: row.prompt_used ?? {},
    cooked: row.cooked ?? false,
    devNotes: row.dev_notes ?? null,
    tags: row.tags ?? [],
    isPublic: row.is_public ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
