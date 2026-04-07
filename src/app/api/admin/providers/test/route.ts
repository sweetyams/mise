import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProviderConstructor } from '@/lib/ai-provider/registry';

// ---------------------------------------------------------------------------
// POST /api/admin/providers/test — test a provider connection
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing provider id' }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data: provider } = await serviceClient
    .from('ai_provider_config')
    .select('provider_name, api_key_encrypted, model_id')
    .eq('id', id)
    .single();

  if (!provider) {
    return NextResponse.json({ success: false, error: 'Provider not found' });
  }

  try {
    const constructor = getProviderConstructor(provider.provider_name);
    if (!constructor) {
      return NextResponse.json({
        success: false,
        error: `Unknown provider: ${provider.provider_name}`,
      });
    }

    const aiProvider = constructor(
      provider.api_key_encrypted,
      provider.model_id ?? undefined
    );

    // Make a minimal API call to test the connection
    await aiProvider.compileBrain('Say "ok" in one word.');

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Connection test failed',
    });
  }
}
