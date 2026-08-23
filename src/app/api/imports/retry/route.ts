// =============================================================================
// MISE Imports Retry — POST /api/imports/retry
// =============================================================================
// Re-attempts a failed import by ID. Increments the attempt counter and
// calls the import-instagram logic again.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  // Auth: session only (web UI)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  let body: { attemptId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.attemptId) {
    return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
  }

  // Fetch the failed attempt
  const service = createServiceClient();
  const { data: attempt } = await service
    .from('import_attempts')
    .select('*')
    .eq('id', body.attemptId)
    .eq('user_id', user.id)
    .single();

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  if (attempt.status === 'success') {
    return NextResponse.json({ error: 'This import already succeeded' }, { status: 400 });
  }

  if (attempt.attempts >= MAX_RETRIES) {
    return NextResponse.json({ error: `Max retries (${MAX_RETRIES}) reached` }, { status: 400 });
  }

  // Mark as processing
  await service
    .from('import_attempts')
    .update({
      status: 'processing',
      attempts: attempt.attempts + 1,
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.attemptId);

  // Re-import by calling our own endpoint internally
  const baseUrl = request.nextUrl.origin;
  try {
    const importRes = await fetch(`${baseUrl}/api/import-instagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ url: attempt.source_url }),
    });

    const importData = await importRes.json();

    if (importRes.ok) {
      // Update the attempt record
      await service
        .from('import_attempts')
        .update({
          status: 'success',
          recipe_id: importData.id,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.attemptId);

      return NextResponse.json({
        success: true,
        id: importData.id,
        title: importData.title,
      });
    } else {
      await service
        .from('import_attempts')
        .update({
          status: 'failed',
          error_message: importData.error || 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.attemptId);

      return NextResponse.json({ error: importData.error || 'Retry failed' }, { status: importRes.status });
    }
  } catch (err) {
    await service
      .from('import_attempts')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Network error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.attemptId);

    return NextResponse.json({ error: 'Retry failed' }, { status: 500 });
  }
}
