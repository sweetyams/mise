import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/fingerprints — list available chef profiles for authenticated users
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();

  // Try with slug, fall back without
  let result = await service
    .from('fingerprints')
    .select('id, name, slug')
    .order('name');

  if (result.error?.message?.includes('slug')) {
    result = await service
      .from('fingerprints')
      .select('id, name')
      .order('name');
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ fingerprints: result.data ?? [] });
}
