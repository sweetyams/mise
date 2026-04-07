// =============================================================================
// MISE AI Provider Factory
// =============================================================================
// Resolves the active AI provider: checks `ai_provider_config` table for
// `is_active=true`, falls back to `AI_PROVIDER` env var (default: 'claude').
// Requirements: 12.1, 12.4
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server';
import type { AIProvider } from './types';
import { getProviderConstructor } from './registry';

// ---------------------------------------------------------------------------
// createAIProvider — factory function
// ---------------------------------------------------------------------------

export async function createAIProvider(): Promise<AIProvider> {
  // 1. Try database config first
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('ai_provider_config')
      .select('provider_name, api_key_encrypted, model_id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (data?.provider_name && data?.api_key_encrypted) {
      const constructor = getProviderConstructor(data.provider_name);
      if (constructor) {
        return constructor(data.api_key_encrypted, data.model_id ?? undefined);
      }
    }
  } catch {
    // DB lookup failed — fall through to env var
  }

  // 2. Fall back to env var
  const providerName = process.env.AI_PROVIDER || 'claude';
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      '[MISE] No AI provider API key configured. Set ANTHROPIC_API_KEY or configure ai_provider_config table.'
    );
  }

  const constructor = getProviderConstructor(providerName);
  if (!constructor) {
    throw new Error(
      `[MISE] Unknown AI provider "${providerName}". Registered providers: claude`
    );
  }

  return constructor(apiKey);
}
