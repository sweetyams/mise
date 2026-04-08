// =============================================================================
// MISE AI Provider — Interface Definitions
// =============================================================================
// All AI interactions go through the AIProvider interface.
// Requirements: 5.19, 12.1, 12.2, 12.3, 12.4
// =============================================================================

import type { Ingredient, Substitution } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Pairing suggestion (returned by suggestPairings)
// ---------------------------------------------------------------------------

export interface PairingSuggestion {
  ingredient: string;
  reason: string;
  affinity: 'classic' | 'complementary' | 'unexpected';
}

// ---------------------------------------------------------------------------
// AI Provider Error
// ---------------------------------------------------------------------------

export interface AIProviderError {
  code: 'rate_limit' | 'auth_failed' | 'timeout' | 'invalid_response' | 'unknown';
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

// ---------------------------------------------------------------------------
// AI Provider Info
// ---------------------------------------------------------------------------

export interface AIProviderInfo {
  name: string;
  displayName: string;
  supportedModels: string[];
  requiresApiKey: boolean;
}

// ---------------------------------------------------------------------------
// AI Provider Interface
// ---------------------------------------------------------------------------

export interface AIProvider {
  readonly info: AIProviderInfo;

  generateRecipe(systemPrompt: string, userMessage: string): Promise<ReadableStream<string>>;
  compileBrain(compilationPrompt: string): Promise<string>;
  suggestPairings(ingredient: string, systemPrompt: string): Promise<PairingSuggestion[]>;
  suggestSubstitutions(
    ingredient: Ingredient,
    recipeContext: string,
    systemPrompt: string
  ): Promise<Substitution[]>;
  generateRecipeCard(recipeData: string, transformationPrompt: string): Promise<string>;
}
