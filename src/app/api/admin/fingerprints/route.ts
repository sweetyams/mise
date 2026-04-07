import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { invalidateFingerprint } from '@/lib/fingerprint-cache';

// ---------------------------------------------------------------------------
// Admin check helper
// ---------------------------------------------------------------------------

async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return null;

  return user;
}

// ---------------------------------------------------------------------------
// GET /api/admin/fingerprints — list all fingerprints
// ---------------------------------------------------------------------------

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('fingerprints')
    .select('id, name, prompt_text, version, is_default, updated_at')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fingerprints: data ?? [] });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/fingerprints — update prompt_text, increment version
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { id, prompt_text } = body;

  if (!id || typeof prompt_text !== 'string') {
    return NextResponse.json({ error: 'Missing id or prompt_text' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get current version
  const { data: current } = await supabase
    .from('fingerprints')
    .select('version')
    .eq('id', id)
    .single();

  const newVersion = (current?.version ?? 0) + 1;

  const { error } = await supabase
    .from('fingerprints')
    .update({
      prompt_text,
      version: newVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate cache
  invalidateFingerprint(id);

  return NextResponse.json({ version: newVersion });
}
