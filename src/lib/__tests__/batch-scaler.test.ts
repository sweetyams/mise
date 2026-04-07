// =============================================================================
// MISE Batch Scaler — Unit Tests
// =============================================================================
// Tests for roundToKitchenPrecision, scaleComponent, and scaleRecipe.
// Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
// =============================================================================

import { describe, it, expect } from 'vitest';
import { roundToKitchenPrecision, scaleComponent, scaleRecipe } from '@/lib/batch-scaler';
import type { Component, Recipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Helpers — minimal valid objects for testing
// ---------------------------------------------------------------------------

function makeIngredient(name: string, amount: number, unit = 'g') {
  return {
    name,
    amount,
    unit,
    substitutions: {
      common: [{ name: 'alt', amount: amount * 0.5, unit, notes: '' }],
      dietary: [],
      pantry: [],
      flavour_shift: [],
    },
    sourcing: '',
    prep: '',
    function: 'base',
    essential: true,
  };
}

function makeComponent(name: string, ingredients: ReturnType<typeof makeIngredient>[]): Component {
  return {
    name,
    role: 'base',
    can_prep_ahead: false,
    prep_ahead_notes: '',
    ingredients,
    steps: [{ stepNumber: 1, instruction: 'Cook it.', timing: null, techniqueReason: null, seasoningNote: null }],
    doneness_cues: ['Golden brown'],
  };
}

function makeRecipe(components: Component[]): Recipe {
  return {
    id: 'test-recipe',
    title: 'Test Recipe',
    fingerprint: 'test-fp',
    version: 1,
    intent: { occasion: 'weeknight', mood: 'comfort', season: ['winter'], time: 60, effort: 'medium' },
    flavour: {
      profile: ['umami'],
      dominant: 'fat-led',
      acid: [{ source: 'lemon', role: 'brightness' }],
      fat: [{ source: 'butter', role: 'richness' }],
      heat: { level: 'mild', source: 'black pepper' },
      sweet: { level: 'none', source: '' },
      texture: [{ element: 'croutons', contrast: 'crunch' }],
      balance: 'Well balanced.',
    },
    components,
    timeline: [{ name: 'Prep', duration: 15, parallel: false, description: 'Prep ingredients' }],
    variations: {
      dietary: [],
      pantry: [],
      scale: { min: 2, max: 12, notes: 'Scales well' },
      profiles: [],
    },
    related: { sub_recipes: [], pairs_with: [], next_level: '' },
    thinking: { approach: 'Simple', architecture: 'Classic', pattern: 'Braise' },
    promptSnapshot: {
      systemCore: { text: '', version: 1, tokenCount: 0 },
      fingerprint: { text: '', version: 1, tokenCount: 0, fingerprintId: '', fingerprintName: '' },
      chefBrain: { text: '', version: 1, tokenCount: 0, userId: '' },
      requestContext: { text: '', version: 1, tokenCount: 0 },
      totalInputTokens: 0,
      totalOutputTokens: 0,
      estimatedCost: 0,
      assembledAt: new Date().toISOString(),
    },
    complexityMode: 'kitchen',
    cooked: false,
    devNotes: null,
    tags: [],
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}


// ---------------------------------------------------------------------------
// roundToKitchenPrecision
// ---------------------------------------------------------------------------

describe('roundToKitchenPrecision', () => {
  it('rounds values >10 to nearest whole number', () => {
    expect(roundToKitchenPrecision(15.3)).toBe(15);
    expect(roundToKitchenPrecision(15.7)).toBe(16);
    expect(roundToKitchenPrecision(100.4)).toBe(100);
    expect(roundToKitchenPrecision(10.6)).toBe(11);
  });

  it('rounds values ≤10 to nearest 0.5', () => {
    expect(roundToKitchenPrecision(3.3)).toBe(3.5);
    expect(roundToKitchenPrecision(3.1)).toBe(3);
    expect(roundToKitchenPrecision(5.75)).toBe(6);
    expect(roundToKitchenPrecision(10)).toBe(10);
    expect(roundToKitchenPrecision(7.25)).toBe(7.5);
  });

  it('enforces minimum of 0.5', () => {
    expect(roundToKitchenPrecision(0.1)).toBe(0.5);
    expect(roundToKitchenPrecision(0)).toBe(0.5);
    expect(roundToKitchenPrecision(0.2)).toBe(0.5);
  });

  it('handles exact boundary at 10', () => {
    // 10 is ≤10, so nearest 0.5 → 10
    expect(roundToKitchenPrecision(10)).toBe(10);
  });

  it('handles values just above 10', () => {
    // 10.1 is >10, so nearest whole → 10
    expect(roundToKitchenPrecision(10.1)).toBe(10);
    expect(roundToKitchenPrecision(10.5)).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// scaleComponent
// ---------------------------------------------------------------------------

describe('scaleComponent', () => {
  it('scales ingredient amounts by multiplier', () => {
    const comp = makeComponent('the sauce', [
      makeIngredient('butter', 50, 'g'),
      makeIngredient('flour', 30, 'g'),
    ]);

    const scaled = scaleComponent(comp, 2);

    expect(scaled.ingredients[0].amount).toBe(100);
    expect(scaled.ingredients[1].amount).toBe(60);
  });

  it('preserves component metadata unchanged', () => {
    const comp = makeComponent('the braise', [makeIngredient('onion', 200, 'g')]);
    const scaled = scaleComponent(comp, 1.5);

    expect(scaled.name).toBe('the braise');
    expect(scaled.role).toBe('base');
    expect(scaled.steps).toEqual(comp.steps);
    expect(scaled.doneness_cues).toEqual(comp.doneness_cues);
    expect(scaled.can_prep_ahead).toBe(comp.can_prep_ahead);
    expect(scaled.prep_ahead_notes).toBe(comp.prep_ahead_notes);
  });

  it('scales substitution amounts too', () => {
    const comp = makeComponent('sauce', [makeIngredient('cream', 100, 'ml')]);
    const scaled = scaleComponent(comp, 2);

    // Original substitution amount was 50 (100 * 0.5), scaled by 2 = 100
    expect(scaled.ingredients[0].substitutions.common[0].amount).toBe(100);
  });

  it('applies kitchen precision rounding to scaled amounts', () => {
    const comp = makeComponent('garnish', [makeIngredient('salt', 3, 'g')]);
    // 3 * 1.5 = 4.5 → ≤10, nearest 0.5 → 4.5
    const scaled = scaleComponent(comp, 1.5);
    expect(scaled.ingredients[0].amount).toBe(4.5);
  });
});

// ---------------------------------------------------------------------------
// scaleRecipe
// ---------------------------------------------------------------------------

describe('scaleRecipe', () => {
  it('scales all components proportionally', () => {
    const recipe = makeRecipe([
      makeComponent('the braise', [makeIngredient('beef', 500, 'g')]),
      makeComponent('the sauce', [makeIngredient('tomato', 200, 'g')]),
    ]);

    // Default base servings = 4, target = 8 → multiplier = 2
    const result = scaleRecipe(recipe, 8);

    expect(result.multiplier).toBe(2);
    expect(result.scaled.components[0].ingredients[0].amount).toBe(1000);
    expect(result.scaled.components[1].ingredients[0].amount).toBe(400);
  });

  it('preserves original recipe unchanged', () => {
    const recipe = makeRecipe([
      makeComponent('base', [makeIngredient('rice', 300, 'g')]),
    ]);

    const result = scaleRecipe(recipe, 8);

    expect(result.original.components[0].ingredients[0].amount).toBe(300);
    expect(result.scaled.components[0].ingredients[0].amount).toBe(600);
  });

  it('uses custom base servings when provided', () => {
    const recipe = makeRecipe([
      makeComponent('base', [makeIngredient('pasta', 400, 'g')]),
    ]);

    // Base = 2, target = 6 → multiplier = 3
    const result = scaleRecipe(recipe, 6, 2);

    expect(result.multiplier).toBe(3);
    expect(result.scaled.components[0].ingredients[0].amount).toBe(1200);
  });

  it('scales down correctly', () => {
    const recipe = makeRecipe([
      makeComponent('base', [makeIngredient('chicken', 800, 'g')]),
    ]);

    // Default base = 4, target = 2 → multiplier = 0.5
    const result = scaleRecipe(recipe, 2);

    expect(result.multiplier).toBe(0.5);
    expect(result.scaled.components[0].ingredients[0].amount).toBe(400);
  });

  it('preserves non-ingredient fields', () => {
    const recipe = makeRecipe([
      makeComponent('base', [makeIngredient('flour', 250, 'g')]),
    ]);

    const result = scaleRecipe(recipe, 8);

    expect(result.scaled.title).toBe(recipe.title);
    expect(result.scaled.intent).toEqual(recipe.intent);
    expect(result.scaled.flavour).toEqual(recipe.flavour);
    expect(result.scaled.thinking).toEqual(recipe.thinking);
    expect(result.scaled.timeline).toEqual(recipe.timeline);
    expect(result.scaled.variations).toEqual(recipe.variations);
  });
});
