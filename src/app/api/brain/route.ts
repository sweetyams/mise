import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getCachedBrain, compileBrain, type BrainCompilationInput } from '@/lib/brain-compiler';

// ---------------------------------------------------------------------------
// GET /api/brain — fetch the user's compiled Chef Brain
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brain = await getCachedBrain(user.id);

  if (!brain) {
    return NextResponse.json({
      promptText: '',
      version: 0,
      compiledAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    promptText: brain.promptText,
    version: brain.version,
    compiledAt: brain.compiledAt,
  });
}

// ---------------------------------------------------------------------------
// POST /api/brain — trigger recompilation
// ---------------------------------------------------------------------------

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Fetch tasting notes
  const { data: notes } = await serviceClient
    .from('tasting_notes')
    .select('taste, texture, aroma, comments')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch dev logs from recipes
  const { data: recipes } = await serviceClient
    .from('recipes')
    .select('dev_notes, updated_at')
    .eq('user_id', user.id)
    .not('dev_notes', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  const input: BrainCompilationInput = {
    userId: user.id,
    onboardingAnswers: {},
    devLogs: (recipes ?? [])
      .filter((r) => r.dev_notes)
      .map((r) => ({
        text: r.dev_notes as string,
        createdAt: r.updated_at,
      })),
    tastingNotes: (notes ?? []).map((n) => ({
      taste: n.taste ?? '',
      texture: n.texture ?? '',
      aroma: n.aroma ?? '',
      comments: n.comments ?? '',
    })),
    preferences: [],
  };

  const result = await compileBrain(input);

  return NextResponse.json({
    promptText: result.promptText,
    version: result.version,
    compiledAt: result.compiledAt,
  });
}
