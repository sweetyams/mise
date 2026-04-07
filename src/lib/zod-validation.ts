// =============================================================================
// MISE Zod Validation — Structured Generation with Retry
// =============================================================================
// Validates AI-generated JSON against the Recipe Zod schema.
// On failure, builds correction prompts and retries up to 2 times.
// =============================================================================

import type { Recipe } from '@/lib/types/recipe';
import { RecipeSchema, validateRecipe } from '@/lib/zod-schemas';

const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type GenerationResult =
  | { success: true; recipe: Recipe }
  | { success: false; error: string; retryable: boolean };

// ---------------------------------------------------------------------------
// AI generate function type — injected dependency for testability
// ---------------------------------------------------------------------------

export type AIGenerateFn = (systemPrompt: string, userMessage: string) => Promise<string>;

// ---------------------------------------------------------------------------
// Correction prompt builders
// ---------------------------------------------------------------------------

export function buildJsonParseCorrection(rawOutput: string, parseError: string): string {
  return [
    'Your previous response was not valid JSON. Please fix the following error and return ONLY valid JSON.',
    '',
    `Parse error: ${parseError}`,
    '',
    'Your previous (invalid) output:',
    rawOutput.slice(0, 500),
  ].join('\n');
}

export function buildZodValidationCorrection(
  rawOutput: string,
  validationErrors: string[]
): string {
  return [
    'Your previous response was valid JSON but failed schema validation. Please fix the following errors and return ONLY valid JSON matching the Recipe schema.',
    '',
    'Validation errors:',
    ...validationErrors.map((e) => `- ${e}`),
    '',
    'Your previous output:',
    rawOutput.slice(0, 500),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// parseAndValidate — parse JSON string and validate against Zod schema
// ---------------------------------------------------------------------------

export function parseAndValidate(raw: string): GenerationResult {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    return { success: false, error: `JSON parse error: ${message}`, retryable: true };
  }

  // Step 2: Validate against Zod schema
  const validation = validateRecipe(parsed);
  if (validation.valid) {
    return { success: true, recipe: parsed as Recipe };
  }

  return {
    success: false,
    error: `Schema validation failed: ${validation.errors.join('; ')}`,
    retryable: true,
  };
}

// ---------------------------------------------------------------------------
// generateStructuredRecipe — call AI, validate, retry on failure
// ---------------------------------------------------------------------------

export async function generateStructuredRecipe(params: {
  systemPrompt: string;
  userMessage: string;
  generate: AIGenerateFn;
}): Promise<GenerationResult> {
  const { systemPrompt, userMessage, generate } = params;

  let lastError = '';
  let currentUserMessage = userMessage;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let rawOutput: string;

    // Call AI
    try {
      rawOutput = await generate(systemPrompt, currentUserMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI generation failed';
      return { success: false, error: message, retryable: true };
    }

    // Try to parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (err) {
      const parseError = err instanceof Error ? err.message : 'Unknown parse error';
      lastError = `JSON parse error: ${parseError}`;

      if (attempt < MAX_RETRIES) {
        currentUserMessage = buildJsonParseCorrection(rawOutput, parseError);
        continue;
      }
      break;
    }

    // Validate against Zod schema
    const validation = validateRecipe(parsed);
    if (validation.valid) {
      return { success: true, recipe: parsed as Recipe };
    }

    lastError = `Schema validation failed: ${validation.errors.join('; ')}`;

    if (attempt < MAX_RETRIES) {
      currentUserMessage = buildZodValidationCorrection(rawOutput, validation.errors);
      continue;
    }
  }

  return {
    success: false,
    error: `Recipe generation failed after ${MAX_RETRIES + 1} attempts. ${lastError}`,
    retryable: false,
  };
}
