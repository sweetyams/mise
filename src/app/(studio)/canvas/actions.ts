'use server';

// =============================================================================
// MISE Canvas — Server Actions (AI Features: Pairing & Substitution)
// =============================================================================
// Server actions for ingredient pairing and substitution suggestions.
// Uses the AI Provider interface with the active fingerprint's style.
// Requirements: 15.1, 15.2, 15.3
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import { createAIProvider } from '@/lib/ai-provider';
import { getFingerprint } from '@/lib/fingerprint-cache';
import { getSystemCore } from '@/lib/system-core';
import type { PairingSuggestion } from '@/lib/ai-provider/types';
import type { Ingredient, Substitution } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PairingResult =
  | { success: true; data: PairingSuggestion[] }
  | { success: false; error: string };

export type SubstitutionResult =
  | { success: true; data: Substitution[] }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// suggestPairings — ingredient pairing suggestions via AI
// ---------------------------------------------------------------------------

export async function suggestPairings(
  ingredient: string,
  fingerprintId: string
): Promise<PairingResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to use pairing suggestions.' };
  }

  if (!ingredient.trim()) {
    return { success: false, error: 'Please enter an ingredient.' };
  }

  try {
    // Build system prompt from System Core + Fingerprint
    const systemCore = getSystemCore();
    const fingerprint = await getFingerprint(fingerprintId);
    const systemPrompt = [
      systemCore.text,
      fingerprint?.promptText ?? '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const provider = await createAIProvider();
    const suggestions = await provider.suggestPairings(ingredient.trim(), systemPrompt);

    return { success: true, data: suggestions };
  } catch (err) {
    console.error('[MISE] Pairing suggestion failed:', err);
    return { success: false, error: 'Unable to generate pairing suggestions. Please try again.' };
  }
}

// ---------------------------------------------------------------------------
// suggestSubstitutions — ingredient substitution suggestions via AI
// ---------------------------------------------------------------------------

export async function suggestSubstitutions(
  ingredient: Ingredient,
  recipeContext: string,
  fingerprintId: string
): Promise<SubstitutionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to use substitution suggestions.' };
  }

  try {
    const systemCore = getSystemCore();
    const fingerprint = await getFingerprint(fingerprintId);
    const systemPrompt = [
      systemCore.text,
      fingerprint?.promptText ?? '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const provider = await createAIProvider();
    const substitutions = await provider.suggestSubstitutions(
      ingredient,
      recipeContext,
      systemPrompt
    );

    return { success: true, data: substitutions };
  } catch (err) {
    console.error('[MISE] Substitution suggestion failed:', err);
    return { success: false, error: 'Unable to generate substitution suggestions. Please try again.' };
  }
}
