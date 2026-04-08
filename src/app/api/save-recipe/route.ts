import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getFingerprint, getFingerprintBySlug } from '@/lib/fingerprint-cache';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required.' }, { status: 401 });

  const body = await request.json();
  const { title, markdown, fingerprintId, complexityMode } = body;
  if (!title || !markdown) return NextResponse.json({ error: 'Title and content required.' }, { status: 400 });

  // Resolve fingerprint ID — could be a UUID or a slug
  let resolvedFingerprintId: string | null = null;
  if (fingerprintId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fingerprintId);
    const fp = isUUID
      ? await getFingerprint(fingerprintId)
      : await getFingerprintBySlug(fingerprintId);
    resolvedFingerprintId = fp?.id ?? null;
  }

  const service = createServiceClient();
  const id = crypto.randomUUID();

  // Build insert payload — only include decision_lock_answers if it has data
  // (the column may not exist in older database schemas)
  // Map parsed thinking fields to DB schema
  const rawThinking = body.thinking ?? {};
  const mappedThinking = {
    origin: rawThinking.origin || rawThinking.approach || '',
    architecture_logic: rawThinking.architecture_logic || rawThinking.architecture || '',
    the_pattern: rawThinking.the_pattern || rawThinking.pattern || '',
    fingerprint_note: rawThinking.fingerprint_note || '',
  };

  const insertPayload: Record<string, unknown> = {
    id,
    user_id: user.id,
    fingerprint_id: resolvedFingerprintId,
    title,
    version: 1,
    intent: body.intent ?? {
      occasion: '',
      mood: '',
      season: '',
      effort: 'medium',
      feeds: 4,
      total_time_minutes: 0,
      active_time_minutes: 0,
      hands_off_minutes: 0,
      can_prep_ahead: false,
      prep_ahead_notes: '',
      dietary: [],
      dietary_notes: '',
    },
    flavour: body.flavour ?? { profile: [], dominant: '', acid: [], fat: [], heat: { level: '', source: '' }, sweet: { level: '', source: '' }, texture: [], balance: '' },
    components: body.components ?? [],
    timeline: body.timeline ?? [],
    variations: body.variations ?? { dietary: [], pantry: [], scale: { min: 2, max: 8, notes: '' }, profiles: [] },
    related: body.related ?? { sub_recipes: [], pairs_with: [], next_level: '' },
    thinking: mappedThinking,
    prompt_used: body.promptSnapshot ?? {},
    complexity_mode: complexityMode || 'kitchen',
    cooked: false,
    dev_notes: markdown,
    tags: [],
    is_public: false,
  };

  // First attempt: with decision_lock_answers
  if (body.decision_lock_answers) {
    insertPayload.decision_lock_answers = body.decision_lock_answers;
  }

  let { error } = await service.from('recipes').insert(insertPayload);

  // If insert failed and we included decision_lock_answers, retry without it
  // (handles case where column doesn't exist yet)
  if (error && body.decision_lock_answers) {
    console.warn('[MISE] Save with decision_lock_answers failed, retrying without:', error.message);
    delete insertPayload.decision_lock_answers;
    ({ error } = await service.from('recipes').insert(insertPayload));
  }

  if (error) {
    console.error('[MISE] Save failed:', error.message, '| Code:', error.code, '| Details:', error.details);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ id, saved: true });
}
