// =============================================================================
// MISE Brain Compiler — Layer 3 of the 4-Layer Prompt Architecture
// =============================================================================
// Compiles raw user data into a ~200-token Chef Brain prompt fragment using
// Claude Haiku. Cached in Redis with 15-minute TTL.
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 6.4, 6.5
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';
import { redis } from '@/lib/redis';
import { createAIProvider } from '@/lib/ai-provider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrainCompilationInput {
  userId: string;
  onboardingAnswers: Record<string, string>;
  devLogs: Array<{ text: string; createdAt: string }>;
  preferences: Array<{ key: string; value: string; confidence: number }>;
}

export interface CompiledBrain {
  userId: string;
  promptText: string;
  version: number;
  compiledAt: string;
}

// ---------------------------------------------------------------------------
// Redis key and TTL
// ---------------------------------------------------------------------------

const BRAIN_KEY_PREFIX = 'brain:';
const BRAIN_TTL_SECONDS = 15 * 60; // 15 minutes

function brainKey(userId: string): string {
  return `${BRAIN_KEY_PREFIX}${userId}`;
}

// ---------------------------------------------------------------------------
// buildCompilationPrompt — assembles raw data into a prompt for Haiku
// ---------------------------------------------------------------------------

function buildCompilationPrompt(input: BrainCompilationInput): string {
  const sections: string[] = [
    'Compile the following user data into a Chef Brain prompt fragment (~200 tokens). The output should be a concise, second-person prompt that captures this cook\'s identity: flavour biases, pantry constants, technique comfort, avoid list, cooking context, and recent development notes.',
    '',
  ];

  if (Object.keys(input.onboardingAnswers).length > 0) {
    sections.push('ONBOARDING ANSWERS:');
    for (const [q, a] of Object.entries(input.onboardingAnswers)) {
      sections.push(`- ${q}: ${a}`);
    }
    sections.push('');
  }

  if (input.devLogs.length > 0) {
    sections.push('RECENT DEVELOPMENT LOGS:');
    for (const log of input.devLogs.slice(-10)) {
      sections.push(`- [${log.createdAt}] ${log.text}`);
    }
    sections.push('');
  }

  if (input.preferences.length > 0) {
    sections.push('PREFERENCES:');
    for (const pref of input.preferences) {
      sections.push(`- ${pref.key}: ${pref.value} (confidence: ${pref.confidence})`);
    }
    sections.push('');
  }

  sections.push('Return ONLY the compiled Chef Brain prompt text. No preamble, no explanation.');

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// compileBrain — fetch raw data, compile via Haiku, persist, invalidate cache
// ---------------------------------------------------------------------------

export async function compileBrain(input: BrainCompilationInput): Promise<CompiledBrain> {
  const supabase = createServiceClient();

  // Get current version
  const { data: existing } = await supabase
    .from('chef_brains')
    .select('version')
    .eq('user_id', input.userId)
    .single();

  const currentVersion = existing?.version ?? 0;
  const newVersion = currentVersion + 1;

  try {
    // Build prompt and call Haiku
    const compilationPrompt = buildCompilationPrompt(input);
    const provider = await createAIProvider();
    const promptText = await provider.compileBrain(compilationPrompt);

    const compiledAt = new Date().toISOString();

    // Upsert to chef_brains table
    const { error: upsertError } = await supabase
      .from('chef_brains')
      .upsert(
        {
          user_id: input.userId,
          prompt_text: promptText,
          raw_data: {
            onboardingAnswers: input.onboardingAnswers,
            devLogs: input.devLogs,
            preferences: input.preferences,
          },
          version: newVersion,
          compiled_at: compiledAt,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      throw new Error(`Failed to persist Chef Brain: ${upsertError.message}`);
    }

    // Invalidate Redis cache
    await invalidateBrainCache(input.userId);

    return {
      userId: input.userId,
      promptText,
      version: newVersion,
      compiledAt,
    };
  } catch (err) {
    // On failure, retain existing brain and log error
    console.error('[MISE] Brain compilation failed:', err instanceof Error ? err.message : err);

    // Return existing brain if available
    const { data: fallback } = await supabase
      .from('chef_brains')
      .select('user_id, prompt_text, version, compiled_at')
      .eq('user_id', input.userId)
      .single();

    if (fallback) {
      return {
        userId: fallback.user_id,
        promptText: fallback.prompt_text,
        version: fallback.version,
        compiledAt: fallback.compiled_at,
      };
    }

    // No existing brain — return empty
    return {
      userId: input.userId,
      promptText: '',
      version: 0,
      compiledAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// getCachedBrain — Redis first (15min TTL), fall back to Supabase
// ---------------------------------------------------------------------------

export async function getCachedBrain(userId: string): Promise<CompiledBrain | null> {
  // Check Redis
  try {
    const cached = await redis.get<CompiledBrain>(brainKey(userId));
    if (cached) {
      return cached;
    }
  } catch {
    // Redis error — fall through to DB
  }

  // Fall back to Supabase
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('chef_brains')
    .select('user_id, prompt_text, version, compiled_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  const brain: CompiledBrain = {
    userId: data.user_id,
    promptText: data.prompt_text,
    version: data.version,
    compiledAt: data.compiled_at,
  };

  // Cache in Redis for next time
  try {
    await redis.set(brainKey(userId), brain, { ex: BRAIN_TTL_SECONDS });
  } catch {
    // Redis write failed — non-fatal
  }

  return brain;
}

// ---------------------------------------------------------------------------
// invalidateBrainCache — delete Redis key
// ---------------------------------------------------------------------------

export async function invalidateBrainCache(userId: string): Promise<void> {
  try {
    await redis.del(brainKey(userId));
  } catch {
    // Redis delete failed — non-fatal
  }
}
