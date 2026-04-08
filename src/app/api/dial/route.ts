import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dialRecipe } from '@/lib/dial';
import type { DialDirection } from '@/lib/types/recipe';

const VALID_DIRECTIONS: DialDirection[] = [
  'more_acid', 'more_heat', 'more_umami', 'smokier',
  'lighter', 'funkier', 'different_region', 'riff_mode', 'custom_prompt',
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }

  const recipeId = body.recipeId as string;
  const direction = body.direction as DialDirection;
  const fromVersionId = body.fromVersionId as string | undefined;
  const customPrompt = body.customPrompt as string | undefined;

  if (!recipeId || !direction) {
    return NextResponse.json({ error: 'recipeId and direction are required.' }, { status: 400 });
  }

  if (!VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: `Invalid direction: ${direction}` }, { status: 400 });
  }

  if (direction === 'custom_prompt' && !customPrompt?.trim()) {
    return NextResponse.json({ error: 'Custom prompt text is required.' }, { status: 400 });
  }

  const result = await dialRecipe(recipeId, direction, user.id, fromVersionId, customPrompt);

  if ('error' in result) {
    console.error('[MISE] Dial failed:', result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    versionId: result.newVersion.id,
    versionNumber: result.newVersion.versionNumber,
    changes: result.changes,
  });
}
