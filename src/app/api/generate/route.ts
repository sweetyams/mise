import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { assemblePrompt } from '@/lib/prompt-assembler';
import type { RequestContext } from '@/lib/prompt-assembler';
import { createAIProvider } from '@/lib/ai-provider';
import type { ComplexityMode } from '@/lib/types/recipe';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(authUser.id);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.reason, remaining: rateLimit.remaining }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const dish = body.dishDescription as string;
  if (!dish?.trim()) {
    return NextResponse.json({ error: 'Describe what you want to cook.' }, { status: 400 });
  }

  const fpId = (body.fingerprintId as string) || 'ottolenghi';
  const mode = (body.complexityMode as ComplexityMode) || 'kitchen';
  const servings = (body.servings as number) || 4;

  const ctx: RequestContext = {
    dishDescription: dish.trim(),
    servings,
    occasion: body.occasion as string | undefined,
    mood: body.mood as string | undefined,
    season: body.season as string | undefined,
    constraints: body.constraints as string[] | undefined,
  };

  // Override system prompt to ask for beautiful readable text, not JSON
  let assembled;
  try {
    assembled = await assemblePrompt(authUser.id, fpId, ctx, mode);
  } catch (err) {
    console.error('[MISE] Prompt assembly failed:', err);
    return NextResponse.json({ error: 'Failed to assemble prompt.' }, { status: 500 });
  }

  // Replace the JSON instruction with a readable format instruction
  const readableSystemPrompt = assembled.systemPrompt.replace(
    /OUTPUT FORMAT:[\s\S]*?Return ONLY the JSON object\. No text before or after it\./,
    `OUTPUT FORMAT: Return a beautifully formatted recipe using this structure:

# [Recipe Title]

## The Thinking
**Approach:** [How you conceived this dish]
**Architecture:** [Logic behind the flavour decisions]
**Pattern:** [What culinary principle this teaches]

## Flavour Architecture
**Profile:** [flavour tags]
**Dominant:** [direction]
**Acid:** [source and role]
**Fat:** [source and role]
**Heat:** [level and source]
**Texture:** [contrasts]
**Balance:** [chef's note]

## Components

### [Component Name] ([role])
*[Prep ahead notes if applicable]*

**Ingredients:**
- [amount] [unit] [ingredient] — [function] *([prep note])*

**Method:**
1. [instruction] ([timing]) — *Why: [technique reason]* — *Season: [note]*

**Doneness cues:**
- [what to look/smell/feel for]

[Repeat for each component]

## Variations
- **[Name]:** [changes]

## Timeline
- [stage]: [duration] — [description]

## Pairs With
[suggestions]

Use metric (grams, ml, Celsius). Be specific with seasoning at every stage. Canadian English spelling.`
  );

  let provider;
  try { provider = await createAIProvider(); } catch (err) {
    console.error('[MISE] Provider failed:', err);
    return NextResponse.json({ error: 'AI not configured.' }, { status: 500 });
  }

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await provider.generateRecipe(readableSystemPrompt, assembled.userMessage);
        const reader = aiStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(encoder.encode(value));
        }
        controller.close();
      } catch (err) {
        console.error('[MISE] Stream error:', err);
        controller.enqueue(encoder.encode('\n\n---\nGeneration encountered an error. Please try again.'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
