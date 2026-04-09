import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Default modes — used as fallback when no DB config exists
const DEFAULT_MODES = [
  {
    id: 'foundation',
    label: 'Foundation',
    description: 'Learning mode — extra explanation, doneness cues at every stage, conservative seasoning',
    instructions: `COMPLEXITY MODE: Foundation (Learning)
- Provide extra explanation at each step
- Include doneness cues at every stage
- Use conservative seasoning amounts
- Proactively suggest substitutions for uncommon ingredients
- Explain technique reasons in detail`,
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'Professional but approachable — the default for everyday cooking',
    instructions: `COMPLEXITY MODE: Kitchen (Professional)
- Professional but approachable tone
- Standard detail level
- Assume competent home cook`,
  },
  {
    id: 'riff',
    label: 'Riff',
    description: 'Architecture only — for experienced cooks who want the idea, not the prescription',
    instructions: `COMPLEXITY MODE: Riff (Architecture Only)
- Provide architecture and intention only
- No precise amounts — use ratios and feel
- Minimal step-by-step instructions
- Focus on flavour logic and technique principles`,
  },
];

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return null;
  return user;
}

export async function GET() {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data } = await service
    .from('preferences')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'admin_complexity_modes')
    .maybeSingle();

  const modes = data?.value?.modes ?? DEFAULT_MODES;
  return NextResponse.json({ modes });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  if (!Array.isArray(body.modes)) {
    return NextResponse.json({ error: 'modes must be an array.' }, { status: 400 });
  }

  // Validate each mode has required fields
  for (const mode of body.modes) {
    if (!mode.id || !mode.label || !mode.instructions) {
      return NextResponse.json({ error: 'Each mode requires id, label, and instructions.' }, { status: 400 });
    }
  }

  const service = createServiceClient();
  const { error } = await service
    .from('preferences')
    .upsert(
      {
        user_id: user.id,
        key: 'admin_complexity_modes',
        value: { modes: body.modes },
        source: 'explicit',
        confidence: 1.0,
      },
      { onConflict: 'user_id,key' },
    );

  if (error) {
    console.error('[MISE] Failed to save complexity modes:', error);
    return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
