// =============================================================================
// MISE Imports API — GET /api/imports
// =============================================================================
// Returns imported recipes and optionally failed import attempts.
// Auth: Supabase session (web UI).
// Query: ?include=attempts to also return import_attempts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const includeAttempts = request.nextUrl.searchParams.get('include') === 'attempts';

  // Fetch imported recipes
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, title, source, source_url, created_at')
    .eq('user_id', user.id)
    .not('source', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (recipesError) {
    return NextResponse.json({ error: recipesError.message }, { status: 500 });
  }

  const response: Record<string, unknown> = { recipes: recipes ?? [] };

  // Optionally fetch import attempts (for retry UI)
  if (includeAttempts) {
    const { data: attempts } = await supabase
      .from('import_attempts')
      .select('id, source_url, status, error_message, method, attempts, recipe_id, created_at, last_attempt_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    response.attempts = attempts ?? [];
  }

  return NextResponse.json(response);
}
