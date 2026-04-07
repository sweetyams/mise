import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAIProvider } from '@/lib/ai-provider';
import { RecipeSchema } from '@/lib/zod-schemas';
import type { Recipe } from '@/lib/types/recipe';
import { storeRecipeWithSnapshot } from '@/lib/recipe-store';

function stripCodeFences(s: string): string {
  let t = s.trim();
  if (t.startsWith('```')) t = t.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  return t.trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required.' }, { status: 401 });

  const { markdown, fingerprintId } = await request.json();
  if (!markdown) return NextResponse.json({ error: 'No markdown.' }, { status: 400 });

  // Ask Claude to convert the markdown recipe into structured JSON
  let provider;
  try { provider = await createAIProvider(); } catch {
    return NextResponse.json({ error: 'AI not configured.' }, { status: 500 });
  }

  const parsePrompt = `Convert this recipe markdown into a JSON object matching this exact schema. Return ONLY valid JSON, no markdown fences, no explanation.

Schema:
{
  "id": "unique-slug",
  "title": "string",
  "fingerprint": "${fingerprintId || ''}",
  "version": 1,
  "intent": { "occasion": "", "mood": "", "season": [], "time": 0, "effort": "low|medium|high|project" },
  "flavour": { "profile": [], "dominant": "", "acid": [{"source":"","role":""}], "fat": [{"source":"","role":""}], "heat": {"level":"","source":""}, "sweet": {"level":"","source":""}, "texture": [{"element":"","contrast":""}], "balance": "" },
  "components": [{ "name": "", "role": "", "can_prep_ahead": false, "prep_ahead_notes": "", "ingredients": [{"name":"","amount":0,"unit":"g","sourcing":"","prep":"","function":"","essential":true}], "steps": [{"stepNumber":1,"instruction":"","timing":null,"techniqueReason":null,"seasoningNote":null}], "doneness_cues": [] }],
  "timeline": [{"name":"","duration":0,"parallel":false,"description":""}],
  "variations": { "dietary": [], "pantry": [], "scale": {"min":2,"max":8,"notes":""}, "profiles": [] },
  "related": { "sub_recipes": [], "pairs_with": [], "next_level": "" },
  "thinking": { "approach": "", "architecture": "", "pattern": "" }
}

Recipe markdown:
${markdown}`;

  try {
    const stream = await provider.generateRecipe(
      'You convert recipe markdown into structured JSON. Return ONLY valid JSON. No markdown fences. No explanation.',
      parsePrompt
    );
    const reader = stream.getReader();
    let raw = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += value;
    }

    const jsonStr = stripCodeFences(raw);
    const parsed = JSON.parse(jsonStr);
    const result = RecipeSchema.safeParse(parsed);
    const recipe = (result.success ? result.data : parsed) as Recipe;

    // Fill in defaults
    if (!recipe.id) recipe.id = crypto.randomUUID();
    if (!recipe.createdAt) recipe.createdAt = new Date().toISOString();
    if (!recipe.updatedAt) recipe.updatedAt = new Date().toISOString();
    if (!recipe.cooked) recipe.cooked = false;
    if (!recipe.tags) recipe.tags = [];
    if (!recipe.isPublic) recipe.isPublic = false;

    // Save to DB
    try {
      await storeRecipeWithSnapshot(recipe, {
        systemCore: { text: '', version: 1, tokenCount: 0 },
        fingerprint: { text: '', version: 1, tokenCount: 0, fingerprintId: fingerprintId || '', fingerprintName: '' },
        chefBrain: { text: '', version: 1, tokenCount: 0, userId: user.id },
        requestContext: { text: '', version: 1, tokenCount: 0 },
        totalInputTokens: 0, totalOutputTokens: 0, estimatedCost: 0, assembledAt: new Date().toISOString(),
      }, user.id);
    } catch (err) {
      console.warn('[MISE] Save failed:', err instanceof Error ? err.message : err);
    }

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error('[MISE] Parse failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ recipe: null, error: 'Could not parse recipe.' });
  }
}
