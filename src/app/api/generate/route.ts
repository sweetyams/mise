// =============================================================================
// MISE Generation API Route — POST /api/generate
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, recordGenerationCost } from '@/lib/rate-limiter';
import { assemblePrompt, buildPromptSnapshot } from '@/lib/prompt-assembler';
import type { RequestContext } from '@/lib/prompt-assembler';
import { storeRecipeWithSnapshot } from '@/lib/recipe-store';
import { createAIProvider } from '@/lib/ai-provider';
import { getFingerprint } from '@/lib/fingerprint-cache';
import { RecipeSchema } from '@/lib/zod-schemas';
import type { ComplexityMode, Recipe } from '@/lib/types/recipe';

function stripCodeFences(text: string): string {
  let s = text.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return s.trim();
}

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const userId = authUser.id;

  // 2. Rate limit
  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.reason ?? 'Rate limit exceeded.', remaining: rateLimit.remaining, resetDate: rateLimit.resetDate },
      { status: 429 }
    );
  }

  // 3. Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const dishDescription = body.dishDescription as string;
  const fingerprintId = (body.fingerprintId as string) || 'ottolenghi';
  const complexityMode = (body.complexityMode as ComplexityMode) || 'kitchen';
  const servings = (body.servings as number) || 4;

  if (!dishDescription?.trim()) {
    return NextResponse.json({ error: 'dishDescription is required.' }, { status: 400 });
  }

  // 4. Assemble prompt
  const requestContext: RequestContext = {
    dishDescription: dishDescription.trim(),
    servings,
    occasion: body.occasion as string | undefined,
    mood: body.mood as string | undefined,
    season: body.season as string | undefined,
    constraints: body.constraints as string[] | undefined,
  };

  let assembled;
  try {
    assembled = await assemblePrompt(userId, fingerprintId, requestContext, complexityMode);
  } catch (err) {
    console.error('[MISE] Prompt assembly failed:', err);
    return NextResponse.json({ error: 'Failed to assemble prompt.' }, { status: 500 });
  }

  // 5. Generate — collect full response (no streaming to client)
  let provider;
  try {
    provider = await createAIProvider();
  } catch (err) {
    console.error('[MISE] AI provider creation failed:', err);
    return NextResponse.json({ error: 'AI provider not configured. Check your API key.' }, { status: 500 });
  }

  let fullResponse = '';
  try {
    const aiStream = await provider.generateRecipe(assembled.systemPrompt, assembled.userMessage);
    const reader = aiStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += value;
    }
  } catch (err) {
    console.error('[MISE] AI generation failed:', err);
    return NextResponse.json({ error: 'Recipe generation failed. Please try again.' }, { status: 500 });
  }

  // 6. Parse JSON — strip code fences, parse, validate
  const jsonStr = stripCodeFences(fullResponse);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error('[MISE] JSON parse failed. First 200 chars:', jsonStr.slice(0, 200));
    // Return the raw text as a fallback so the user sees something
    return NextResponse.json({ recipe: null, rawText: fullResponse, error: 'AI returned non-JSON response.' });
  }

  const validation = RecipeSchema.safeParse(parsed);
  let recipe: Recipe;

  if (validation.success) {
    recipe = validation.data as Recipe;
  } else {
    console.warn('[MISE] Zod validation errors:', validation.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`));
    // Use the parsed JSON anyway — it's close enough for display
    recipe = parsed as Recipe;
  }

  // 7. Persist
  try {
    const fingerprint = await getFingerprint(fingerprintId);
    const outputTokens = Math.ceil(fullResponse.length / 4);
    const snapshot = buildPromptSnapshot(assembled, outputTokens, fingerprintId, fingerprint?.name ?? 'Unknown', userId);

    // Ensure recipe has required fields for storage
    if (!recipe.id) recipe.id = crypto.randomUUID();
    if (!recipe.createdAt) recipe.createdAt = new Date().toISOString();
    if (!recipe.updatedAt) recipe.updatedAt = new Date().toISOString();

    await storeRecipeWithSnapshot(recipe, snapshot, userId);
    await recordGenerationCost({
      userId,
      recipeId: recipe.id,
      inputTokens: snapshot.totalInputTokens,
      outputTokens,
      estimatedCost: snapshot.estimatedCost,
      createdAt: new Date().toISOString(),
    });
    console.log('[MISE] Recipe persisted:', recipe.title ?? recipe.id);
  } catch (err) {
    console.warn('[MISE] Persistence failed:', err instanceof Error ? err.message : err);
    // Still return the recipe to the user even if persistence failed
  }

  // 8. Return the parsed recipe
  return NextResponse.json({ recipe });
}
