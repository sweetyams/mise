import { describe, it, expect, vi } from 'vitest';
import {
  generateStructuredRecipe,
  parseAndValidate,
  buildJsonParseCorrection,
  buildZodValidationCorrection,
  type AIGenerateFn,
} from '@/lib/zod-validation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidRecipeJson() {
  return JSON.stringify({
    id: 'r-1',
    title: 'Test Recipe',
    fingerprint: 'test-fp',
    version: 1,
    intent: { occasion: 'weeknight', mood: 'easy', season: ['summer'], time: 30, effort: 'low' },
    flavour: {
      profile: ['bright'],
      dominant: 'acid-led',
      acid: [{ source: 'lemon', role: 'brightness' }],
      fat: [{ source: 'olive oil', role: 'body' }],
      heat: { level: 'mild', source: 'chilli' },
      sweet: { level: 'none', source: 'n/a' },
      texture: [],
      balance: 'Clean and bright.',
    },
    components: [
      {
        name: 'the salad',
        role: 'base',
        can_prep_ahead: false,
        prep_ahead_notes: '',
        ingredients: [
          {
            name: 'mixed greens',
            amount: 200,
            unit: 'g',
            substitutions: { common: [], dietary: [], pantry: [], flavour_shift: [] },
            sourcing: 'fresh',
            prep: 'washed',
            function: 'base',
            essential: true,
          },
        ],
        steps: [{ stepNumber: 1, instruction: 'Toss greens.', timing: null, techniqueReason: null, seasoningNote: null }],
        doneness_cues: ['Evenly dressed.'],
      },
    ],
    timeline: [{ name: 'Prep', duration: 10, parallel: false, description: 'Wash and chop.' }],
    variations: {
      dietary: [],
      pantry: [],
      scale: { min: 1, max: 8, notes: 'Scales well.' },
      profiles: [],
    },
    related: { sub_recipes: [], pairs_with: ['bread'], next_level: 'Add grilled protein.' },
    thinking: { approach: 'Simple.', architecture: 'Acid-led.', pattern: 'The salad.' },
    promptSnapshot: {
      systemCore: { text: 'core', version: 1, tokenCount: 100 },
      fingerprint: { text: 'fp', version: 1, tokenCount: 100, fingerprintId: 'fp-1', fingerprintName: 'Test' },
      chefBrain: { text: 'brain', version: 1, tokenCount: 100, userId: 'u-1' },
      requestContext: { text: 'ctx', version: 1, tokenCount: 50 },
      totalInputTokens: 350,
      totalOutputTokens: 800,
      estimatedCost: 0.01,
      assembledAt: '2025-01-01T00:00:00Z',
    },
    complexityMode: 'kitchen',
    cooked: false,
    devNotes: null,
    tags: ['salad'],
    isPublic: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  });
}

// ===========================================================================
// parseAndValidate
// ===========================================================================

describe('parseAndValidate', () => {
  it('returns success for valid recipe JSON', () => {
    const result = parseAndValidate(makeValidRecipeJson());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recipe.title).toBe('Test Recipe');
    }
  });

  it('returns error for invalid JSON', () => {
    const result = parseAndValidate('not json at all {{{');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('JSON parse error');
      expect(result.retryable).toBe(true);
    }
  });

  it('returns error for valid JSON that fails schema', () => {
    const result = parseAndValidate(JSON.stringify({ title: '' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Schema validation failed');
      expect(result.retryable).toBe(true);
    }
  });
});

// ===========================================================================
// Correction prompt builders
// ===========================================================================

describe('buildJsonParseCorrection', () => {
  it('includes the parse error in the correction prompt', () => {
    const prompt = buildJsonParseCorrection('bad json', 'Unexpected token');
    expect(prompt).toContain('Unexpected token');
    expect(prompt).toContain('not valid JSON');
  });
});

describe('buildZodValidationCorrection', () => {
  it('includes all validation errors in the correction prompt', () => {
    const errors = ['title: String must contain at least 1 character(s)', 'components: Array must contain at least 1 element(s)'];
    const prompt = buildZodValidationCorrection('{}', errors);
    expect(prompt).toContain('title: String must contain at least 1 character(s)');
    expect(prompt).toContain('components: Array must contain at least 1 element(s)');
    expect(prompt).toContain('failed schema validation');
  });
});

// ===========================================================================
// generateStructuredRecipe
// ===========================================================================

describe('generateStructuredRecipe', () => {
  it('returns recipe on first successful attempt', async () => {
    const generate: AIGenerateFn = vi.fn().mockResolvedValue(makeValidRecipeJson());

    const result = await generateStructuredRecipe({
      systemPrompt: 'system',
      userMessage: 'make a salad',
      generate,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.recipe.title).toBe('Test Recipe');
    }
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('retries on JSON parse failure and succeeds', async () => {
    const generate: AIGenerateFn = vi
      .fn()
      .mockResolvedValueOnce('not json')
      .mockResolvedValue(makeValidRecipeJson());

    const result = await generateStructuredRecipe({
      systemPrompt: 'system',
      userMessage: 'make a salad',
      generate,
    });

    expect(result.success).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    // Second call should include correction prompt
    const secondCall = (generate as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCall[1]).toContain('not valid JSON');
  });

  it('retries on Zod validation failure and succeeds', async () => {
    const invalidJson = JSON.stringify({ title: '', components: [] });
    const generate: AIGenerateFn = vi
      .fn()
      .mockResolvedValueOnce(invalidJson)
      .mockResolvedValue(makeValidRecipeJson());

    const result = await generateStructuredRecipe({
      systemPrompt: 'system',
      userMessage: 'make a salad',
      generate,
    });

    expect(result.success).toBe(true);
    expect(generate).toHaveBeenCalledTimes(2);
    const secondCall = (generate as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCall[1]).toContain('failed schema validation');
  });

  it('fails after exhausting all retries (3 attempts total)', async () => {
    const generate: AIGenerateFn = vi.fn().mockResolvedValue('not json');

    const result = await generateStructuredRecipe({
      systemPrompt: 'system',
      userMessage: 'make a salad',
      generate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('failed after 3 attempts');
      expect(result.retryable).toBe(false);
    }
    expect(generate).toHaveBeenCalledTimes(3);
  });

  it('returns error immediately when AI generate throws', async () => {
    const generate: AIGenerateFn = vi.fn().mockRejectedValue(new Error('API timeout'));

    const result = await generateStructuredRecipe({
      systemPrompt: 'system',
      userMessage: 'make a salad',
      generate,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('API timeout');
      expect(result.retryable).toBe(true);
    }
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
