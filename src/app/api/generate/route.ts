// =============================================================================
// MISE Generation API Route — POST /api/generate
// =============================================================================
// Streaming recipe generation with Zod validation and retry logic.
// Flow: authenticate → rate limit → assemble prompt → stream AI → validate →
// persist recipe + snapshot → record cost → return streamed response.
// Requirements: 5.1, 5.2, 5.3, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 5.19,
//               5.20, 14.1, 14.2
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, recordGenerationCost } from '@/lib/rate-limiter';
import { assemblePrompt, buildPromptSnapshot } from '@/lib/prompt-assembler';
import type { RequestContext } from '@/lib/prompt-assembler';
import { generateStructuredRecipe } from '@/lib/zod-validation';
import { storeRecipeWithSnapshot } from '@/lib/recipe-store';
import { createAIProvider } from '@/lib/ai-provider';
import { getFingerprint } from '@/lib/fingerprint-cache';
import type { ComplexityMode, Recipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Request body schema (manual validation — lightweight, no extra dep)
// ---------------------------------------------------------------------------

interface GenerateRequestBody {
  dishDescription: string;
  fingerprintId: string;
  complexityMode: ComplexityMode;
  servings: number;
  occasion?: string;
  mood?: string;
  season?: string;
  constraints?: string[];
}

function validateRequestBody(body: unknown): { data: GenerateRequestBody | null; error: string | null } {
  if (!body || typeof body !== 'object') {
    return { data: null, error: 'Request body is required.' };
  }

  const b = body as Record<string, unknown>;

  if (!b.dishDescription || typeof b.dishDescription !== 'string' || b.dishDescription.trim().length === 0) {
    return { data: null, error: 'dishDescription is required and must be a non-empty string.' };
  }

  if (!b.fingerprintId || typeof b.fingerprintId !== 'string') {
    return { data: null, error: 'fingerprintId is required.' };
  }

  const validModes: ComplexityMode[] = ['foundation', 'kitchen', 'riff'];
  if (!b.complexityMode || !validModes.includes(b.complexityMode as ComplexityMode)) {
    return { data: null, error: 'complexityMode must be one of: foundation, kitchen, riff.' };
  }

  if (b.servings === undefined || typeof b.servings !== 'number' || b.servings < 1 || !Number.isInteger(b.servings)) {
    return { data: null, error: 'servings must be a positive integer.' };
  }

  if (b.occasion !== undefined && typeof b.occasion !== 'string') {
    return { data: null, error: 'occasion must be a string.' };
  }
  if (b.mood !== undefined && typeof b.mood !== 'string') {
    return { data: null, error: 'mood must be a string.' };
  }
  if (b.season !== undefined && typeof b.season !== 'string') {
    return { data: null, error: 'season must be a string.' };
  }
  if (b.constraints !== undefined) {
    if (!Array.isArray(b.constraints) || !b.constraints.every((c) => typeof c === 'string')) {
      return { data: null, error: 'constraints must be an array of strings.' };
    }
  }

  return {
    data: {
      dishDescription: (b.dishDescription as string).trim(),
      fingerprintId: b.fingerprintId as string,
      complexityMode: b.complexityMode as ComplexityMode,
      servings: b.servings as number,
      occasion: b.occasion as string | undefined,
      mood: b.mood as string | undefined,
      season: b.season as string | undefined,
      constraints: b.constraints as string[] | undefined,
    },
    error: null,
  };
}


// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userId = authUser.id;

  // 2. Check rate limit
  const rateLimit = await checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.reason ?? 'Rate limit exceeded.',
        remaining: rateLimit.remaining,
        resetDate: rateLimit.resetDate,
      },
      { status: 429 }
    );
  }

  // 3. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  const validation = validateRequestBody(body);
  if (!validation.data) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { dishDescription, fingerprintId, complexityMode, servings, occasion, mood, season, constraints } =
    validation.data;

  // 4. Assemble prompt
  const requestContext: RequestContext = {
    dishDescription,
    servings,
    occasion,
    mood,
    season,
    constraints,
  };

  let assembled;
  try {
    assembled = await assemblePrompt(userId, fingerprintId, requestContext, complexityMode);
  } catch (err) {
    console.error('[MISE] Prompt assembly failed:', err);
    return NextResponse.json(
      { error: 'Failed to assemble generation prompt.', retryable: true },
      { status: 500 }
    );
  }

  // 5. Stream via AI Provider and collect full response
  const provider = await createAIProvider();

  // Create a TransformStream to tee the streamed data to the client
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = new TextEncoder();
  let fullResponse = '';

  // Start the streaming pipeline in the background
  const streamPromise = (async () => {
    const writer = writable.getWriter();

    try {
      const aiStream = await provider.generateRecipe(assembled.systemPrompt, assembled.userMessage);
      const reader = aiStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullResponse += value;
        await writer.write(encoder.encode(value));
      }

      // 6. Validate the full response against Zod schema (with retry up to 2x)
      const generateFn = async (systemPrompt: string, userMessage: string): Promise<string> => {
        const retryStream = await provider.generateRecipe(systemPrompt, userMessage);
        const retryReader = retryStream.getReader();
        let retryResult = '';
        while (true) {
          const { done: retryDone, value: retryValue } = await retryReader.read();
          if (retryDone) break;
          retryResult += retryValue;
        }
        return retryResult;
      };

      const result = await generateStructuredRecipe({
        systemPrompt: assembled.systemPrompt,
        userMessage: fullResponse, // Pass the raw output as the "user message" for initial parse
        generate: generateFn,
      });

      if (result.success) {
        const recipe = result.recipe;

        // Look up fingerprint name for snapshot
        const fingerprint = await getFingerprint(fingerprintId);
        const fingerprintName = fingerprint?.name ?? 'Unknown';

        // Estimate output tokens
        const outputTokens = Math.ceil(fullResponse.length / 4);

        // 7. Build prompt snapshot and persist
        const snapshot = buildPromptSnapshot(
          assembled,
          outputTokens,
          fingerprintId,
          fingerprintName,
          userId
        );

        await storeRecipeWithSnapshot(recipe, snapshot, userId);

        // 8. Record generation cost
        await recordGenerationCost({
          userId,
          recipeId: recipe.id,
          inputTokens: snapshot.totalInputTokens,
          outputTokens,
          estimatedCost: snapshot.estimatedCost,
          createdAt: new Date().toISOString(),
        });
      }
      // If validation failed, the streamed text was already sent to the client.
      // The client will attempt to parse it. We log the error server-side.
      if (!result.success) {
        console.error('[MISE] Zod validation failed after retries:', result.error);
      }

      await writer.close();
    } catch (err) {
      console.error('[MISE] Generation stream error:', err);
      try {
        // Send error marker to client
        const errorMsg = JSON.stringify({
          __error: true,
          error: 'Generation failed. Please try again.',
          retryable: true,
        });
        await writer.write(encoder.encode(errorMsg));
        await writer.close();
      } catch {
        await writer.abort();
      }
    }
  })();

  // Don't await the promise — let it run while streaming
  void streamPromise;

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
