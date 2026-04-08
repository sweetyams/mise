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
// GET /api/admin/fingerprints — list all chef profiles
// ---------------------------------------------------------------------------

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Try with slug column first, fall back without it if column doesn't exist yet
  let result = await supabase
    .from('fingerprints')
    .select('id, name, slug, prompt_text, full_profile, version, is_default, updated_at')
    .order('name');

  if (result.error?.message?.includes('slug')) {
    // slug column not yet added — query without it
    result = await supabase
      .from('fingerprints')
      .select('id, name, prompt_text, full_profile, version, is_default, updated_at')
      .order('name');
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ fingerprints: result.data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/admin/fingerprints — create a new chef profile
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, prompt_text, is_default } = body;

  if (!name || typeof prompt_text !== 'string') {
    return NextResponse.json({ error: 'Missing name or prompt_text' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const row: Record<string, unknown> = {
    name,
    prompt_text,
    version: 1,
    is_default: is_default ?? false,
    updated_at: new Date().toISOString(),
  };
  if (slug) row.slug = slug;

  let { data, error } = await supabase
    .from('fingerprints')
    .insert(row)
    .select('id')
    .single();

  // If slug column doesn't exist yet, retry without it
  if (error?.message?.includes('slug')) {
    delete row.slug;
    ({ data, error } = await supabase
      .from('fingerprints')
      .insert(row)
      .select('id')
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ created: true, id: data.id });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/fingerprints — update name, slug, and/or prompt_text
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { id, name, slug, prompt_text } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get current version
  const { data: current } = await supabase
    .from('fingerprints')
    .select('version')
    .eq('id', id)
    .single();

  const newVersion = (current?.version ?? 0) + 1;

  const updates: Record<string, unknown> = {
    version: newVersion,
    updated_at: new Date().toISOString(),
  };
  if (typeof name === 'string' && name.trim()) updates.name = name.trim();
  if (typeof slug === 'string' && slug.trim()) updates.slug = slug.trim();
  if (typeof prompt_text === 'string') updates.prompt_text = prompt_text;
  if (body.full_profile !== undefined) updates.full_profile = body.full_profile;

  let { error } = await supabase
    .from('fingerprints')
    .update(updates)
    .eq('id', id);

  // If slug column doesn't exist yet, retry without it
  if (error?.message?.includes('slug')) {
    delete updates.slug;
    ({ error } = await supabase
      .from('fingerprints')
      .update(updates)
      .eq('id', id));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateFingerprint(id);

  return NextResponse.json({ version: newVersion });
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/fingerprints — remove a chef profile
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('fingerprints')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateFingerprint(id);

  return NextResponse.json({ deleted: true });
}
