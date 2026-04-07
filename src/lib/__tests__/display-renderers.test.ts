// =============================================================================
// MISE Display Renderers — Unit Tests
// =============================================================================
// Tests for all 7 display renderers: renderFullRecipe, renderBrief,
// renderCookMode, renderFlavourMap, renderShoppingList, renderTimeline,
// renderRiff.
// Requirements: 19.1–19.9, 21.1–21.4
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  renderFullRecipe,
  renderBrief,
  renderCookMode,
  renderFlavourMap,
  renderShoppingList,
  renderTimeline,
  renderRiff,
} from '@/lib/display-renderers';
import type { Recipe, Component, Ingredient } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Helpers — minimal valid objects for testing
// ---------------------------------------------------------------------------

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    name: 'butter',
    amount: 50,
    unit: 'g',
    substitutions: { common: [], dietary: [], pantry: [], flavour_shift: [] },
    sourcing: 'use good quality, it matters here',
    prep: 'room temperature',
    function: 'fat',
    essential: true,
    ...overrides,
  };
}

function makeComponent(overrides: Partial<Component> = {}): Component {
  return {
    name: 'the braise',
    role: 'base',
    can_prep_ahead: false,
    prep_ahead_notes: '',
    ingredients: [makeIngredient()],
    steps: [
      { stepNumber: 1, instruction: 'Melt the butter.', timing: '2 min', techniqueReason: 'Even heat distribution', seasoningNote: 'Season with salt' },
    ],
    doneness_cues: ['Golden and fragrant'],
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'test-recipe-1',
    title: 'Braised Lamb Shoulder',
    fingerprint: 'matty-matheson',
    version: 1,
    intent: { occasion: 'dinner party', mood: 'comfort', season: ['winter'], time: 180, effort: 'high' },
    flavour: {
      profile: ['umami', 'herbaceous'],
      dominant: 'fat-led',
      acid: [{ source: 'red wine', role: 'brightness' }],
      fat: [{ source: 'lamb fat', role: 'richness' }],
      heat: { level: 'mild', source: 'black pepper' },
      sweet: { level: 'low', source: 'caramelised onion' },
      texture: [{ element: 'crispy skin', contrast: 'against tender meat' }],
      balance: 'Rich and deeply savoury with a bright acid lift.',
    },
    components: [
      makeComponent(),
      makeComponent({
        name: 'the sauce',
        role: 'sauce',
        ingredients: [
          makeIngredient({ name: 'tomato', amount: 200, unit: 'g', function: 'acid structure', sourcing: '' }),
          makeIngredient({ name: 'butter', amount: 30, unit: 'g', function: 'fat', sourcing: 'use good quality, it matters here' }),
        ],
        steps: [{ stepNumber: 1, instruction: 'Simmer the sauce.', timing: '20 min', techniqueReason: null, seasoningNote: null }],
        doneness_cues: ['Thick and glossy'],
      }),
    ],
    timeline: [
      { name: 'Prep', duration: 30, parallel: false, description: 'Prep all ingredients' },
      { name: 'Braise', duration: 120, parallel: false, description: 'Low and slow in the oven' },
      { name: 'Make sauce', duration: 20, parallel: true, description: 'While braise rests' },
      { name: 'Rest & plate', duration: 10, parallel: false, description: 'Rest meat, plate up' },
    ],
    variations: {
      dietary: [{ name: 'Vegetarian', changes: 'Replace lamb with mushrooms' }],
      pantry: [],
      scale: { min: 2, max: 8, notes: 'Scales well' },
      profiles: [],
    },
    related: { sub_recipes: [], pairs_with: ['crusty bread'], next_level: 'Try a tagine' },
    thinking: {
      approach: 'Classic French braise technique applied to lamb shoulder.',
      architecture: 'Fat-led with acid brightness from wine reduction.',
      pattern: 'The braise — low, slow, transformative.',
    },
    promptSnapshot: {
      systemCore: { text: 'core', version: 1, tokenCount: 10 },
      fingerprint: { text: 'fp', version: 1, tokenCount: 10, fingerprintId: 'fp1', fingerprintName: 'Matty' },
      chefBrain: { text: 'brain', version: 1, tokenCount: 10, userId: 'u1' },
      requestContext: { text: 'req', version: 1, tokenCount: 10 },
      totalInputTokens: 40,
      totalOutputTokens: 100,
      estimatedCost: 0.002,
      assembledAt: '2025-01-01T00:00:00.000Z',
    },
    complexityMode: 'kitchen',
    cooked: false,
    devNotes: null,
    tags: ['braise', 'lamb'],
    isPublic: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// renderFullRecipe
// ---------------------------------------------------------------------------

describe('renderFullRecipe', () => {
  it('includes the recipe title', () => {
    const result = renderFullRecipe(makeRecipe());
    expect(result).toContain('Braised Lamb Shoulder');
  });

  it('includes intent details', () => {
    const result = renderFullRecipe(makeRecipe());
    expect(result).toContain('dinner party');
    expect(result).toContain('comfort');
    expect(result).toContain('180 min');
  });

  it('includes the thinking section', () => {
    const result = renderFullRecipe(makeRecipe());
    expect(result).toContain('The Thinking');
    expect(result).toContain('Classic French braise technique');
  });

  it('includes flavour architecture', () => {
    const result = renderFullRecipe(makeRecipe());
    expect(result).toContain('Flavour Architecture');
    expect(result).toContain('fat-led');
  });

  it('includes all components with ingredients and steps', () => {
    const result = renderFullRecipe(makeRecipe());
    expect(result).toContain('the braise');
    expect(result).toContain('the sauce');
    expect(result).toContain('butter');
    expect(result).toContain('Melt the butter');
  });

  it('includes variations', () => {
    const result = renderFullRecipe(makeRecipe());
    expect(result).toContain('Vegetarian');
  });

  it('is deterministic — same input produces same output', () => {
    const recipe = makeRecipe();
    expect(renderFullRecipe(recipe)).toBe(renderFullRecipe(recipe));
  });
});

// ---------------------------------------------------------------------------
// renderBrief
// ---------------------------------------------------------------------------

describe('renderBrief', () => {
  it('includes the recipe title', () => {
    const result = renderBrief(makeRecipe());
    expect(result).toContain('Braised Lamb Shoulder');
  });

  it('includes compact intent line', () => {
    const result = renderBrief(makeRecipe());
    expect(result).toContain('dinner party');
    expect(result).toContain('180 min');
  });

  it('lists components with ingredients inline', () => {
    const result = renderBrief(makeRecipe());
    expect(result).toContain('the braise');
    expect(result).toContain('50g butter');
  });

  it('is shorter than full recipe', () => {
    const recipe = makeRecipe();
    expect(renderBrief(recipe).length).toBeLessThan(renderFullRecipe(recipe).length);
  });

  it('is deterministic', () => {
    const recipe = makeRecipe();
    expect(renderBrief(recipe)).toBe(renderBrief(recipe));
  });
});

// ---------------------------------------------------------------------------
// renderCookMode
// ---------------------------------------------------------------------------

describe('renderCookMode', () => {
  it('includes the recipe title', () => {
    const result = renderCookMode(makeRecipe(), 0);
    expect(result).toContain('Braised Lamb Shoulder');
  });

  it('shows the correct stage', () => {
    const result = renderCookMode(makeRecipe(), 0);
    expect(result).toContain('Stage 1 of 2');
    expect(result).toContain('the braise');
  });

  it('shows second stage when requested', () => {
    const result = renderCookMode(makeRecipe(), 1);
    expect(result).toContain('Stage 2 of 2');
    expect(result).toContain('the sauce');
  });

  it('includes doneness cues', () => {
    const result = renderCookMode(makeRecipe(), 0);
    expect(result).toContain('Golden and fragrant');
  });

  it('clamps stage index to valid range', () => {
    const result = renderCookMode(makeRecipe(), 99);
    expect(result).toContain('Stage 2 of 2'); // clamped to last
  });

  it('is deterministic', () => {
    const recipe = makeRecipe();
    expect(renderCookMode(recipe, 0)).toBe(renderCookMode(recipe, 0));
  });
});

// ---------------------------------------------------------------------------
// renderFlavourMap
// ---------------------------------------------------------------------------

describe('renderFlavourMap', () => {
  it('includes the recipe title', () => {
    const result = renderFlavourMap(makeRecipe());
    expect(result).toContain('Braised Lamb Shoulder');
  });

  it('shows flavour profile and dominant direction', () => {
    const result = renderFlavourMap(makeRecipe());
    expect(result).toContain('umami, herbaceous');
    expect(result).toContain('fat-led');
  });

  it('shows acid, fat, heat, sweet, texture', () => {
    const result = renderFlavourMap(makeRecipe());
    expect(result).toContain('red wine');
    expect(result).toContain('lamb fat');
    expect(result).toContain('black pepper');
    expect(result).toContain('caramelised onion');
    expect(result).toContain('crispy skin');
  });

  it('shows balance note', () => {
    const result = renderFlavourMap(makeRecipe());
    expect(result).toContain('Rich and deeply savoury');
  });

  it('does NOT contain amounts or method steps', () => {
    const result = renderFlavourMap(makeRecipe());
    expect(result).not.toContain('50 g');
    expect(result).not.toContain('Melt the butter');
  });

  it('is deterministic', () => {
    const recipe = makeRecipe();
    expect(renderFlavourMap(recipe)).toBe(renderFlavourMap(recipe));
  });
});

// ---------------------------------------------------------------------------
// renderShoppingList
// ---------------------------------------------------------------------------

describe('renderShoppingList', () => {
  it('returns a ShoppingListView with sections', () => {
    const result = renderShoppingList(makeRecipe(), []);
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('aggregates duplicate ingredients across components (sums quantities)', () => {
    const result = renderShoppingList(makeRecipe(), []);
    // butter appears in both components: 50 + 30 = 80
    const allItems = result.sections.flatMap((s) => s.items);
    const butterItem = allItems.find((i) => i.name.toLowerCase() === 'butter');
    expect(butterItem).toBeDefined();
    expect(butterItem!.amount).toBe(80);
  });

  it('marks pantry items as checkStock', () => {
    const result = renderShoppingList(makeRecipe(), ['butter']);
    const allItems = result.sections.flatMap((s) => s.items);
    const butterItem = allItems.find((i) => i.name.toLowerCase() === 'butter');
    expect(butterItem?.checkStock).toBe(true);
  });

  it('lists pantry items in alreadyHave', () => {
    const result = renderShoppingList(makeRecipe(), ['butter']);
    expect(result.alreadyHave.map((n) => n.toLowerCase())).toContain('butter');
  });

  it('generates a Quality Highlight sentence', () => {
    const result = renderShoppingList(makeRecipe(), []);
    expect(result.theOneThingWorthGetting).toBeTruthy();
    expect(typeof result.theOneThingWorthGetting).toBe('string');
    expect(result.theOneThingWorthGetting.length).toBeGreaterThan(0);
  });

  it('categorises ingredients by store section', () => {
    const recipe = makeRecipe({
      components: [
        makeComponent({
          ingredients: [
            makeIngredient({ name: 'chicken thigh', amount: 500, unit: 'g' }),
            makeIngredient({ name: 'onion', amount: 200, unit: 'g' }),
            makeIngredient({ name: 'cumin', amount: 5, unit: 'g' }),
            makeIngredient({ name: 'cream', amount: 100, unit: 'ml' }),
            makeIngredient({ name: 'olive oil', amount: 30, unit: 'ml' }),
          ],
        }),
      ],
    });
    const result = renderShoppingList(recipe, []);
    const sectionNames = result.sections.map((s) => s.section);
    expect(sectionNames).toContain('Butcher');
    expect(sectionNames).toContain('Produce');
    expect(sectionNames).toContain('Spice');
    expect(sectionNames).toContain('Fridge');
  });

  it('is deterministic', () => {
    const recipe = makeRecipe();
    const a = renderShoppingList(recipe, ['butter']);
    const b = renderShoppingList(recipe, ['butter']);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// renderTimeline
// ---------------------------------------------------------------------------

describe('renderTimeline', () => {
  it('includes the recipe title', () => {
    const serveTime = new Date('2025-06-15T18:00:00');
    const result = renderTimeline(makeRecipe(), serveTime);
    expect(result).toContain('Braised Lamb Shoulder');
  });

  it('shows serve time', () => {
    const serveTime = new Date('2025-06-15T18:00:00');
    const result = renderTimeline(makeRecipe(), serveTime);
    expect(result).toContain('Serve at:');
  });

  it('calculates start time working backward', () => {
    const serveTime = new Date('2025-06-15T18:00:00');
    const result = renderTimeline(makeRecipe(), serveTime);
    // Total sequential time: 30 + 120 + 10 = 160 min (make sauce is parallel)
    expect(result).toContain('Start at:');
    expect(result).toContain('160 min');
  });

  it('identifies parallel tasks', () => {
    const serveTime = new Date('2025-06-15T18:00:00');
    const result = renderTimeline(makeRecipe(), serveTime);
    expect(result).toContain('[parallel]');
    expect(result).toContain('Make sauce');
  });

  it('includes prep-ahead notes for components that support it', () => {
    const recipe = makeRecipe({
      components: [
        makeComponent({ can_prep_ahead: true, prep_ahead_notes: 'Can be done the day before' }),
      ],
    });
    const result = renderTimeline(recipe, new Date());
    expect(result).toContain('Prep ahead');
    expect(result).toContain('Can be done the day before');
  });

  it('is deterministic', () => {
    const recipe = makeRecipe();
    const serveTime = new Date('2025-06-15T18:00:00');
    expect(renderTimeline(recipe, serveTime)).toBe(renderTimeline(recipe, serveTime));
  });
});


// ---------------------------------------------------------------------------
// renderRiff
// ---------------------------------------------------------------------------

describe('renderRiff', () => {
  it('includes the recipe title', () => {
    const result = renderRiff(makeRecipe());
    expect(result).toContain('Braised Lamb Shoulder');
  });

  it('includes the thinking section', () => {
    const result = renderRiff(makeRecipe());
    expect(result).toContain('The Thinking');
    expect(result).toContain('Classic French braise technique');
  });

  it('includes flavour architecture', () => {
    const result = renderRiff(makeRecipe());
    expect(result).toContain('Flavour Architecture');
    expect(result).toContain('fat-led');
  });

  it('lists ingredient names without amounts', () => {
    const result = renderRiff(makeRecipe());
    expect(result).toContain('butter');
    // Should NOT contain "50 g butter" style amounts
    expect(result).not.toMatch(/\d+\s*g\s+butter/);
  });

  it('includes technique direction with steps', () => {
    const result = renderRiff(makeRecipe());
    expect(result).toContain('Technique Direction');
    expect(result).toContain('Melt the butter');
  });

  it('is deterministic', () => {
    const recipe = makeRecipe();
    expect(renderRiff(recipe)).toBe(renderRiff(recipe));
  });
});

// ---------------------------------------------------------------------------
// Cross-renderer: all produce non-empty output with title
// ---------------------------------------------------------------------------

describe('all renderers', () => {
  const recipe = makeRecipe();

  it('all produce non-empty output containing the title', () => {
    const outputs = [
      renderFullRecipe(recipe),
      renderBrief(recipe),
      renderCookMode(recipe, 0),
      renderFlavourMap(recipe),
      renderTimeline(recipe, new Date()),
      renderRiff(recipe),
    ];

    for (const output of outputs) {
      expect(output.length).toBeGreaterThan(0);
      expect(output).toContain(recipe.title);
    }

    // Shopping list is structured, not a string
    const shopping = renderShoppingList(recipe, []);
    expect(shopping.sections.length).toBeGreaterThan(0);
    expect(shopping.theOneThingWorthGetting.length).toBeGreaterThan(0);
  });
});
