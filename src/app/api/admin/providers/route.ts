import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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
// GET /api/admin/providers — list all providers
// ---------------------------------------------------------------------------

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('*')
    .order('provider_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ providers: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/admin/providers — add a new provider
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { provider_name, api_key_encrypted, model_id, is_active } = body;

  if (!provider_name || !api_key_encrypted) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // If setting as active, deactivate others first
  if (is_active) {
    await supabase
      .from('ai_provider_config')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data, error } = await supabase
    .from('ai_provider_config')
    .insert({
      provider_name,
      api_key_encrypted,
      model_id: model_id || null,
      is_active: is_active ?? false,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

// ---------------------------------------------------------------------------
// PUT /api/admin/providers — update a provider
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { id, provider_name, api_key_encrypted, model_id, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // If setting as active, deactivate others first
  if (is_active) {
    await supabase
      .from('ai_provider_config')
      .update({ is_active: false })
      .neq('id', id);
  }

  const { error } = await supabase
    .from('ai_provider_config')
    .update({
      provider_name,
      api_key_encrypted,
      model_id: model_id || null,
      is_active: is_active ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
