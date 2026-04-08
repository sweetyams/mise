import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ALL_INTOLERANCE_IDS } from '@/lib/intolerance-constants';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('preferences')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'intolerances')
      .maybeSingle();

    if (error) {
      console.error('[MISE] Failed to load intolerances:', error);
      return NextResponse.json({ error: 'Failed to load intolerances.' }, { status: 500 });
    }

    const items: string[] = data?.value?.items ?? [];
    // Filter out any stale IDs no longer in the canonical list
    const valid = items.filter((id: string) => ALL_INTOLERANCE_IDS.has(id));

    return NextResponse.json({ intolerances: valid });
  } catch (err) {
    console.error('[MISE] Failed to load intolerances:', err);
    return NextResponse.json({ error: 'Failed to load intolerances.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (!Array.isArray(body.intolerances)) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const ids = body.intolerances as string[];
  const invalidIds = ids.filter((id) => !ALL_INTOLERANCE_IDS.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: 'Invalid intolerance IDs', invalidIds },
      { status: 400 },
    );
  }

  try {
    const { error } = await supabase
      .from('preferences')
      .upsert(
        {
          user_id: user.id,
          key: 'intolerances',
          value: { items: ids },
          source: 'explicit',
          confidence: 1.0,
        },
        { onConflict: 'user_id,key' },
      );

    if (error) {
      console.error('[MISE] Failed to save intolerances:', error);
      return NextResponse.json({ error: 'Failed to save intolerances.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[MISE] Failed to save intolerances:', err);
    return NextResponse.json({ error: 'Failed to save intolerances.' }, { status: 500 });
  }
}
