// =============================================================================
// MISE Claude Provider — Anthropic API Implementation
// =============================================================================
// Implements AIProvider for Claude Sonnet (generation) and Haiku (brain).
// Error mapping: 429→rate_limit, 401/403→auth_failed, timeout→timeout,
// malformed→invalid_response, unknown→unknown.
// Error messages never expose API keys or provider internals.
// Requirements: 5.19, 12.1, 12.2, 12.3, 12.4
// =============================================================================

import Anthropic from '@anthropic-ai/sdk';
import type { Ingredient, Substitution } from '@/lib/types/recipe';
import type { AIProvider, AIProviderError, AIProviderInfo, PairingSuggestion } from './types';

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

const DEFAULT_SONNET_MODEL = 'claude-sonnet-4-20250514';
const HAIKU_MODEL = 'claude-3-5-haiku-20241022';
const MAX_OUTPUT_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapError(err: unknown): AIProviderError {
  if (err instanceof Anthropic.APIError) {
    const status = err.status;

    if (status === 429) {
      const retryAfter = typeof err.headers?.['retry-after'] === 'string'
        ? parseInt(err.headers['retry-after'], 10) * 1000
        : 60_000;
      return {
        code: 'rate_limit',
        message: 'AI provider rate limit reached. Please try again shortly.',
        retryable: true,
        retryAfterMs: retryAfter,
      };
    }

    if (status === 401 || status === 403) {
      return {
        code: 'auth_failed',
        message: 'AI provider authentication failed. Please contact support.',
        retryable: false,
      };
    }

    if (status === 408 || status === 504) {
      return {
        code: 'timeout',
        message: 'AI provider request timed out. Please try again.',
        retryable: true,
      };
    }
  }

  if (err instanceof Error && err.message.includes('timeout')) {
    return {
      code: 'timeout',
      message: 'AI provider request timed out. Please try again.',
      retryable: true,
    };
  }

  return {
    code: 'unknown',
    message: 'An unexpected error occurred during AI generation. Please try again.',
    retryable: false,
  };
}

// ---------------------------------------------------------------------------
// JSON extraction helper — handles markdown code blocks
// ---------------------------------------------------------------------------

function extractJSON(text: string): unknown {
  // Try direct parse first
  try { return JSON.parse(text); } catch { /* continue */ }

  // Try extracting from markdown code block: ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ }
  }

  // Try finding the first [ ... ] or { ... } in the text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch { /* continue */ }
  }

  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch { /* continue */ }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Claude Provider
// ---------------------------------------------------------------------------

export class ClaudeProvider implements AIProvider {
  readonly info: AIProviderInfo = {
    name: 'claude',
    displayName: 'Anthropic Claude',
    supportedModels: [DEFAULT_SONNET_MODEL, HAIKU_MODEL],
    requiresApiKey: true,
  };

  private client: Anthropic;
  private generationModel: string;

  constructor(apiKey: string, modelId?: string) {
    this.client = new Anthropic({ apiKey });
    this.generationModel = modelId || DEFAULT_SONNET_MODEL;
  }

  // -------------------------------------------------------------------------
  // generateRecipe — streams via Sonnet
  // -------------------------------------------------------------------------

  async generateRecipe(
    systemPrompt: string,
    userMessage: string
  ): Promise<ReadableStream<string>> {
    try {
      const stream = this.client.messages.stream({
        model: this.generationModel,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.9,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      return new ReadableStream<string>({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                controller.enqueue(event.delta.text);
              }
            }
            controller.close();
          } catch (err) {
            const mapped = mapError(err);
            controller.error(mapped);
          }
        },
      });
    } catch (err) {
      throw mapError(err);
    }
  }

  // -------------------------------------------------------------------------
  // compileBrain — uses Haiku (25x cheaper)
  // -------------------------------------------------------------------------

  async compileBrain(compilationPrompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: compilationPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        const err: AIProviderError = {
          code: 'invalid_response',
          message: 'AI provider returned an unexpected response format.',
          retryable: true,
        };
        throw err;
      }
      return textBlock.text;
    } catch (err) {
      if ((err as AIProviderError).code) throw err;
      throw mapError(err);
    }
  }

  // -------------------------------------------------------------------------
  // suggestPairings
  // -------------------------------------------------------------------------

  async suggestPairings(
    ingredient: string,
    systemPrompt: string
  ): Promise<PairingSuggestion[]> {
    try {
      const response = await this.client.messages.create({
        model: this.generationModel,
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Suggest ingredient pairings for "${ingredient}". Return a JSON array of objects with fields: ingredient (string), reason (string), affinity ("classic" | "complementary" | "unexpected"). Return ONLY the JSON array.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return [];

      const parsed = extractJSON(textBlock.text);
      if (Array.isArray(parsed)) return parsed as PairingSuggestion[];

      const err: AIProviderError = {
        code: 'invalid_response',
        message: 'Failed to parse pairing suggestions.',
        retryable: true,
      };
      throw err;
    } catch (err) {
      if ((err as AIProviderError).code) throw err;
      throw mapError(err);
    }
  }

  // -------------------------------------------------------------------------
  // suggestSubstitutions
  // -------------------------------------------------------------------------

  async suggestSubstitutions(
    ingredient: Ingredient,
    recipeContext: string,
    systemPrompt: string
  ): Promise<Substitution[]> {
    try {
      const response = await this.client.messages.create({
        model: this.generationModel,
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Suggest substitutions for "${ingredient.name}" (${ingredient.amount}${ingredient.unit}, function: ${ingredient.function}) in this recipe context: ${recipeContext}. Return a JSON array of objects with fields: name (string), amount (number), unit (string), notes (string). Return ONLY the JSON array.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return [];

      const parsed = extractJSON(textBlock.text);
      if (Array.isArray(parsed)) return parsed as Substitution[];

      const err: AIProviderError = {
        code: 'invalid_response',
        message: 'Failed to parse substitution suggestions.',
        retryable: true,
      };
      throw err;
    } catch (err) {
      if ((err as AIProviderError).code) throw err;
      throw mapError(err);
    }
  }
}
