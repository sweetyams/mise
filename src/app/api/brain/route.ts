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

  // Fetch dev logs from recipes
  const { data: recipes } = await serviceClient
    .from('recipes')
    .select('dev_notes, updated_at')
    .eq('user_id', user.id)
    .not('dev_notes', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  // Fetch recent recipes for brain context (titles, flavour directions, cooked status)
  const { data: recentRecipes } = await serviceClient
    .from('recipes')
    .select('title, flavour, complexity_mode, cooked, dev_notes, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch dial history (shows flavour preferences)
  const { data: dialHistory } = await serviceClient
    .from('recipe_versions')
    .select('dial_direction, created_at, recipe_data->title')
    .not('dial_direction', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Build recipe history context as additional dev logs
  const recipeHistoryLogs: Array<{ text: string; createdAt: string }> = [];

  if (recentRecipes && recentRecipes.length > 0) {
    const cookedRecipes = recentRecipes.filter((r) => r.cooked);
    const flavourDirections = recentRecipes
      .map((r) => {
        const f = r.flavour as Record<string, unknown> | null;
        return (f?.dominant_element as string) || (f?.dominant as string) || null;
      })
      .filter(Boolean);

    const summary: string[] = ['RECIPE GENERATION HISTORY:'];
    summary.push(`Generated ${recentRecipes.length} recent recipes.`);
    if (cookedRecipes.length > 0) {
      summary.push(`Actually cooked: ${cookedRecipes.map((r) => r.title).join(', ')}.`);
    }
    if (flavourDirections.length > 0) {
      const directionCounts: Record<string, number> = {};
      for (const d of flavourDirections) {
        directionCounts[d as string] = (directionCounts[d as string] || 0) + 1;
      }
      const topDirections = Object.entries(directionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([dir, count]) => `${dir} (${count}x)`)
        .join(', ');
      summary.push(`Flavour direction preferences: ${topDirections}.`);
    }
    const complexityModes = recentRecipes
      .map((r) => r.complexity_mode)
      .filter(Boolean);
    if (complexityModes.length > 0) {
      const modeCounts: Record<string, number> = {};
      for (const m of complexityModes) {
        modeCounts[m as string] = (modeCounts[m as string] || 0) + 1;
      }
      const topModes = Object.entries(modeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([mode, count]) => `${mode} (${count}x)`)
        .join(', ');
      summary.push(`Complexity preferences: ${topModes}.`);
    }

    recipeHistoryLogs.push({
      text: summary.join(' '),
      createdAt: new Date().toISOString(),
    });
  }

  if (dialHistory && dialHistory.length > 0) {
    const dialDirections = dialHistory.map((d) => d.dial_direction).filter(Boolean);
    const dialCounts: Record<string, number> = {};
    for (const d of dialDirections) {
      dialCounts[d as string] = (dialCounts[d as string] || 0) + 1;
    }
    const topDials = Object.entries(dialCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([dir, count]) => `${dir} (${count}x)`)
      .join(', ');
    recipeHistoryLogs.push({
      text: `DIAL USAGE HISTORY: Most used dial directions: ${topDials}. This reveals flavour evolution preferences.`,
      createdAt: new Date().toISOString(),
    });
  }

  const input: BrainCompilationInput = {
    userId: user.id,
    onboardingAnswers: {},
    devLogs: [
      ...(recipes ?? [])
        .filter((r) => r.dev_notes)
        .map((r) => ({
          text: r.dev_notes as string,
          createdAt: r.updated_at,
        })),
      ...recipeHistoryLogs,
    ],
    preferences: [],
  };

  const result = await compileBrain(input);

  // Save brain snapshot (non-blocking, errors logged but not propagated)
  try {
    await serviceClient
      .from('brain_snapshots')
      .insert({
        user_id: user.id,
        version: result.version,
        prompt_text: result.promptText,
        compiled_at: result.compiledAt,
      });
  } catch (snapshotErr) {
    console.error('Failed to save brain snapshot:', snapshotErr);
  }

  return NextResponse.json({
    promptText: result.promptText,
    version: result.version,
    compiledAt: result.compiledAt,
  });
}
