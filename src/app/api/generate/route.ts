import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { assemblePrompt } from '@/lib/prompt-assembler';
import type { RequestContext } from '@/lib/prompt-assembler';
import { createAIProvider } from '@/lib/ai-provider';
import type { ComplexityMode } from '@/lib/types/recipe';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const rateLimit = await checkRateLimit(user.id);
  if (!rateLimit.allowed) return NextResponse.json({ error: rateLimit.reason }, { status: 429 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }

  const dish = body.dishDescription as string;
  if (!dish?.trim()) return NextResponse.json({ error: 'Describe what you want to cook.' }, { status: 400 });

  const ctx: RequestContext = {
    dishDescription: dish.trim(),
    servings: (body.servings as number) || 4,
    occasion: body.occasion as string | undefined,
    mood: body.mood as string | undefined,
    season: body.season as string | undefined,
    constraints: body.constraints as string[] | undefined,
  };

  let assembled;
  try {
    assembled = await assemblePrompt(user.id, (body.fingerprintId as string) || 'ottolenghi', ctx, (body.complexityMode as ComplexityMode) || 'kitchen');
  } catch (err) {
    console.error('[MISE] Prompt assembly failed:', err);
    return NextResponse.json({ error: 'Prompt assembly failed.' }, { status: 500 });
  }

  let provider;
  try { provider = await createAIProvider(); } catch (err) {
    console.error('[MISE] Provider failed:', err);
    return NextResponse.json({ error: 'AI not configured. Set ANTHROPIC_API_KEY.' }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await provider.generateRecipe(assembled.systemPrompt, assembled.userMessage);
        const reader = aiStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(encoder.encode(value));
        }
        controller.close();
      } catch (err) {
        console.error('[MISE] Stream error:', err);
        controller.enqueue(encoder.encode('\n\n---\n*Generation error. Please try again.*'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
