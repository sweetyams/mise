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

  // 5. Create AI provider
  let provider;
  try {
    provider = await createAIProvider();
  } catch (err) {
    console.error('[MISE] AI provider creation failed:', err);
    return NextResponse.json({ error: 'AI provider not configured. Check your API key.' }, { status: 500 });
  }

  // 6. Stream the response
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await provider.generateRecipe(assembled.systemPrompt, assembled.userMessage);
        const reader = aiStream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += value;
          controller.enqueue(encoder.encode(value));
        }

        controller.close();

        // Post-stream: try to validate and persist
        try {
          const parsed = JSON.parse(fullResponse);
          const result = RecipeSchema.safeParse(parsed);
          if (result.success) {
            const recipe = result.data as Recipe;
            const fingerprint = await getFingerprint(fingerprintId);
            const outputTokens = Math.ceil(fullResponse.length / 4);
            const snapshot = buildPromptSnapshot(assembled, outputTokens, fingerprintId, fingerprint?.name ?? 'Unknown', userId);
            await storeRecipeWithSnapshot(recipe, snapshot, userId);
            await recordGenerationCost({
              userId,
              recipeId: recipe.id,
              inputTokens: snapshot.totalInputTokens,
              outputTokens,
              estimatedCost: snapshot.estimatedCost,
              createdAt: new Date().toISOString(),
            });
            console.log('[MISE] Recipe persisted:', recipe.title);
          } else {
            console.warn('[MISE] Zod validation errors:', result.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`));
          }
        } catch (e) {
          console.warn('[MISE] Post-stream validation/persistence failed:', e instanceof Error ? e.message : e);
        }
      } catch (err) {
        console.error('[MISE] Streaming error:', err);
        const errorMsg = JSON.stringify({ __error: true, error: 'Generation failed. Please try again.' });
        controller.enqueue(encoder.encode(errorMsg));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
