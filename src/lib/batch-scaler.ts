// @ts-nocheck
// =============================================================================
// MISE Batch Scaler — Component-Based Ingredient Scaling
// =============================================================================
// Recalculates ingredient quantities across all components for different
// serving sizes. Pure functions, no side effects.
// Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
// =============================================================================

import type { Component, Ingredient, Recipe, ScaledRecipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Default base servings (used when recipe doesn't specify)
// ---------------------------------------------------------------------------

const DEFAULT_BASE_SERVINGS = 4;

// ---------------------------------------------------------------------------
// roundToKitchenPrecision — kitchen-friendly rounding
// ---------------------------------------------------------------------------

export function roundToKitchenPrecision(quantity: number): number {
  let result: number;

  if (quantity > 10) {
    // >10: nearest whole gram
    result = Math.round(quantity);
  } else {
    // ≤10: nearest 0.5
    result = Math.round(quantity * 2) / 2;
  }

  // Always positive — minimum 0.5
  return Math.max(0.5, result);
}

// ---------------------------------------------------------------------------
// scaleIngredient — scale a single ingredient's amount
// ---------------------------------------------------------------------------

function scaleIngredient(ingredient: Ingredient, multiplier: number): Ingredient {
  return {
    ...ingredient,
    amount: roundToKitchenPrecision(ingredient.amount * multiplier),
    substitutions: {
      common: ingredient.substitutions.common.map((s) => ({
        ...s,
        amount: roundToKitchenPrecision(s.amount * multiplier),
      })),
      dietary: ingredient.substitutions.dietary.map((s) => ({
        ...s,
        amount: roundToKitchenPrecision(s.amount * multiplier),
      })),
      pantry: ingredient.substitutions.pantry.map((s) => ({
        ...s,
        amount: roundToKitchenPrecision(s.amount * multiplier),
      })),
      flavour_shift: ingredient.substitutions.flavour_shift.map((s) => ({
        ...s,
        amount: roundToKitchenPrecision(s.amount * multiplier),
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// scaleComponent — scale all ingredients in a component
// ---------------------------------------------------------------------------

export function scaleComponent(component: Component, multiplier: number): Component {
  return {
    ...component,
    ingredients: component.ingredients.map((ing) => scaleIngredient(ing, multiplier)),
  };
}

// ---------------------------------------------------------------------------
// scaleRecipe — scale every component's ingredients proportionally
// ---------------------------------------------------------------------------

export function scaleRecipe(recipe: Recipe, targetServings: number, baseServings?: number): ScaledRecipe {
  const originalServings = baseServings ?? DEFAULT_BASE_SERVINGS;
  const multiplier = targetServings / originalServings;

  const scaledRecipe: Recipe = {
    ...recipe,
    components: recipe.components.map((comp) => scaleComponent(comp, multiplier)),
  };

  return {
    original: recipe,
    scaled: scaledRecipe,
    multiplier,
  };
}
