import { describe, it, expect } from 'vitest';
import {
  RecipeSchema,
  ComponentSchema,
  IntentSchema,
  FlavourSchema,
  validateRecipe,
} from '@/lib/zod-schemas';

// ---------------------------------------------------------------------------
// Test helpers — minimal valid objects
// ---------------------------------------------------------------------------

function makeSubstitution(overrides = {}) {
  return { name: 'butter', amount: 30, unit: 'g', notes: 'unsalted', ...overrides };
}

function makeIngredient(overrides = {}) {
  return {
    name: 'olive oil',
    amount: 30,
    unit: 'ml',
    substitutions: {
      common: [makeSubstitution()],
      dietary: [],
      pantry: [],
      flavour_shift: [],
    },
    sourcing: 'extra virgin',
    prep: 'room temperature',
    function: 'fat',
    essential: true,
    ...overrides,
  };
}

function makeStep(overrides = {}) {
  return {
    stepNumber: 1,
    instruction: 'Heat oil in a large pan over medium heat.',
    timing: '2 minutes',
    techniqueReason: 'Even heat distribution prevents burning.',
    seasoningNote: 'Season with salt now.',
    ...overrides,
  };
}

function makeComponent(overrides = {}) {
  return {
    name: 'the braise',
    role: 'base',
    can_prep_ahead: true,
    prep_ahead_notes: 'Can be made a day ahead.',
    ingredients: [makeIngredient()],
    steps: [makeStep()],
    doneness_cues: ['Meat should be fork-tender and falling apart.'],
    ...overrides,
  };
}

function makePromptLayer(overrides = {}) {
  return { text: 'prompt text', version: 1, tokenCount: 100, ...overrides };
}

function makePromptSnapshot(overrides = {}) {
  return {
    systemCore: makePromptLayer(),
    fingerprint: {
      ...makePromptLayer(),
      fingerprintId: 'fp-1',
      fingerprintName: 'Matty Matheson',
    },
    chefBrain: { ...makePromptLayer(), userId: 'user-1' },
    requestContext: makePromptLayer(),
    totalInputTokens: 850,
    totalOutputTokens: 1200,
    estimatedCost: 0.021,
    assembledAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRecipe(overrides = {}) {
  return {
    id: 'recipe-1',
    title: 'Braised Short Ribs',
    fingerprint: 'matty-matheson',
    version: 1,
    intent: {
      occasion: 'dinner party',
      mood: 'comfort',
      season: ['winter'],
      time: 180,
      effort: 'high' as const,
    },
    flavour: {
      profile: ['rich', 'umami', 'herbaceous'],
      dominant: 'fat-led',
      acid: [{ source: 'red wine', role: 'deglazing and brightness' }],
      fat: [{ source: 'beef fat', role: 'richness and body' }],
      heat: { level: 'mild', source: 'black pepper' },
      sweet: { level: 'subtle', source: 'caramelised onions' },
      texture: [{ element: 'crispy shallots', contrast: 'crunch against soft braise' }],
      balance: 'Rich and unctuous with enough acid to cut through.',
    },
    components: [makeComponent()],
    timeline: [
      { name: 'Prep', duration: 20, parallel: false, description: 'Mise en place' },
      { name: 'Braise', duration: 150, parallel: false, description: 'Low and slow' },
    ],
    variations: {
      dietary: [{ name: 'Vegetarian', changes: 'Replace short ribs with mushrooms.' }],
      pantry: [{ name: 'No red wine', changes: 'Use beef stock with a splash of vinegar.' }],
      scale: { min: 2, max: 12, notes: 'Scales linearly.' },
      profiles: [],
    },
    related: {
      sub_recipes: [],
      pairs_with: ['crusty bread', 'creamy polenta'],
      next_level: 'Try a 48-hour braise with bone marrow.',
    },
    thinking: {
      approach: 'Classic French technique adapted for home kitchen.',
      architecture: 'Fat-led with acid counterpoint from wine reduction.',
      pattern: 'The braise: sear, deglaze, low-and-slow, rest.',
    },
    promptSnapshot: makePromptSnapshot(),
    complexityMode: 'kitchen' as const,
    cooked: false,
    devNotes: null,
    tags: ['braise', 'beef', 'winter'],
    isPublic: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('RecipeSchema', () => {
  it('validates a complete valid recipe', () => {
    const result = validateRecipe(makeRecipe());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects recipe with empty title', () => {
    const result = validateRecipe(makeRecipe({ title: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('title'))).toBe(true);
  });

  it('rejects recipe with empty components array', () => {
    const result = validateRecipe(makeRecipe({ components: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('components'))).toBe(true);
  });

  it('rejects recipe with missing title field', () => {
    const recipe = makeRecipe();
    delete (recipe as Record<string, unknown>).title;
    const result = validateRecipe(recipe);
    expect(result.valid).toBe(false);
  });

  it('rejects recipe with invalid effort level', () => {
    const result = validateRecipe(
      makeRecipe({ intent: { occasion: 'weeknight', mood: 'easy', season: [], time: 30, effort: 'extreme' } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('effort') || e.includes('intent'))).toBe(true);
  });

  it('accepts all valid effort levels', () => {
    for (const effort of ['low', 'medium', 'high', 'project'] as const) {
      const result = validateRecipe(
        makeRecipe({ intent: { occasion: 'weeknight', mood: 'easy', season: [], time: 30, effort } })
      );
      expect(result.valid).toBe(true);
    }
  });

  it('accepts all valid complexity modes', () => {
    for (const mode of ['foundation', 'kitchen', 'riff'] as const) {
      const result = validateRecipe(makeRecipe({ complexityMode: mode }));
      expect(result.valid).toBe(true);
    }
  });

  it('rejects invalid complexity mode', () => {
    const result = validateRecipe(makeRecipe({ complexityMode: 'expert' }));
    expect(result.valid).toBe(false);
  });
});

describe('ComponentSchema', () => {
  it('validates a complete component', () => {
    const result = ComponentSchema.safeParse(makeComponent());
    expect(result.success).toBe(true);
  });

  it('rejects component with empty ingredients', () => {
    const result = ComponentSchema.safeParse(makeComponent({ ingredients: [] }));
    expect(result.success).toBe(false);
  });

  it('rejects component with empty steps', () => {
    const result = ComponentSchema.safeParse(makeComponent({ steps: [] }));
    expect(result.success).toBe(false);
  });

  it('rejects component with empty doneness_cues', () => {
    const result = ComponentSchema.safeParse(makeComponent({ doneness_cues: [] }));
    expect(result.success).toBe(false);
  });
});

describe('IntentSchema', () => {
  it('validates valid intent', () => {
    const result = IntentSchema.safeParse({
      occasion: 'weeknight',
      mood: 'comfort',
      season: ['fall'],
      time: 45,
      effort: 'medium',
    });
    expect(result.success).toBe(true);
  });

  it('rejects intent with invalid effort', () => {
    const result = IntentSchema.safeParse({
      occasion: 'weeknight',
      mood: 'comfort',
      season: [],
      time: 45,
      effort: 'impossible',
    });
    expect(result.success).toBe(false);
  });
});

describe('FlavourSchema', () => {
  it('validates valid flavour architecture', () => {
    const result = FlavourSchema.safeParse({
      profile: ['bright'],
      dominant: 'acid-led',
      acid: [{ source: 'lemon', role: 'brightness' }],
      fat: [{ source: 'olive oil', role: 'body' }],
      heat: { level: 'none', source: 'n/a' },
      sweet: { level: 'none', source: 'n/a' },
      texture: [],
      balance: 'Bright and clean.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects flavour missing heat object', () => {
    const result = FlavourSchema.safeParse({
      profile: ['bright'],
      dominant: 'acid-led',
      acid: [],
      fat: [],
      sweet: { level: 'none', source: 'n/a' },
      texture: [],
      balance: 'Bright.',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateRecipe round-trip', () => {
  it('JSON.stringify → JSON.parse → validate produces valid result', () => {
    const recipe = makeRecipe();
    const json = JSON.stringify(recipe);
    const parsed = JSON.parse(json);
    const result = RecipeSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Braised Short Ribs');
      expect(result.data.components).toHaveLength(1);
      expect(result.data.intent.effort).toBe('high');
    }
  });
});
