// =============================================================================
// MISE Recipe Diff — Client-safe version comparison utilities
// =============================================================================
// Pure functions with no server dependencies. Safe to import from client
// components.
// =============================================================================

import type { Recipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecipeDiff {
  componentsAdded: string[];
  componentsRemoved: string[];
  componentsChanged: Array<{
    name: string;
    ingredientsAdded: string[];
    ingredientsRemoved: string[];
    ingredientsChanged: string[];
    stepsChanged: boolean;
  }>;
  flavourChanged: boolean;
  thinkingChanged: boolean;
  summary: string;
}

// ---------------------------------------------------------------------------
// diffVersions — compare two Recipe objects
// ---------------------------------------------------------------------------

export function diffVersions(
  recipeA: Recipe,
  recipeB: Recipe
): RecipeDiff {
  const compNamesA = new Set(recipeA.components.map((c) => c.name));
  const compNamesB = new Set(recipeB.components.map((c) => c.name));

  const componentsAdded = [...compNamesB].filter((n) => !compNamesA.has(n));
  const componentsRemoved = [...compNamesA].filter((n) => !compNamesB.has(n));

  const componentsChanged: RecipeDiff['componentsChanged'] = [];

  for (const compB of recipeB.components) {
    const compA = recipeA.components.find((c) => c.name === compB.name);
    if (!compA) continue;

    const ingNamesA = new Set(compA.ingredients.map((i) => i.name));
    const ingNamesB = new Set(compB.ingredients.map((i) => i.name));

    const ingredientsAdded = [...ingNamesB].filter((n) => !ingNamesA.has(n));
    const ingredientsRemoved = [...ingNamesA].filter((n) => !ingNamesB.has(n));

    const ingredientsChanged: string[] = [];
    for (const ingB of compB.ingredients) {
      const ingA = compA.ingredients.find((i) => i.name === ingB.name);
      if (ingA && (ingA.amount !== ingB.amount || ingA.unit !== ingB.unit)) {
        ingredientsChanged.push(ingB.name);
      }
    }

    const stepsChanged =
      compA.steps.length !== compB.steps.length ||
      compA.steps.some((s, i) => s.instruction !== compB.steps[i]?.instruction);

    if (
      ingredientsAdded.length > 0 ||
      ingredientsRemoved.length > 0 ||
      ingredientsChanged.length > 0 ||
      stepsChanged
    ) {
      componentsChanged.push({
        name: compB.name,
        ingredientsAdded,
        ingredientsRemoved,
        ingredientsChanged,
        stepsChanged,
      });
    }
  }

  const flavourChanged =
    JSON.stringify(recipeA.flavour) !== JSON.stringify(recipeB.flavour);

  const thinkingChanged =
    JSON.stringify(recipeA.thinking) !== JSON.stringify(recipeB.thinking);

  const parts: string[] = [];
  if (componentsAdded.length > 0) parts.push(`Added: ${componentsAdded.join(', ')}`);
  if (componentsRemoved.length > 0) parts.push(`Removed: ${componentsRemoved.join(', ')}`);
  if (componentsChanged.length > 0) {
    for (const c of componentsChanged) {
      const changes: string[] = [];
      if (c.ingredientsAdded.length > 0) changes.push(`+${c.ingredientsAdded.join(', ')}`);
      if (c.ingredientsRemoved.length > 0) changes.push(`-${c.ingredientsRemoved.join(', ')}`);
      if (c.ingredientsChanged.length > 0) changes.push(`~${c.ingredientsChanged.join(', ')}`);
      if (c.stepsChanged) changes.push('steps modified');
      parts.push(`${c.name}: ${changes.join('; ')}`);
    }
  }
  if (flavourChanged) parts.push('Flavour architecture changed');
  if (thinkingChanged) parts.push('Thinking updated');

  return {
    componentsAdded,
    componentsRemoved,
    componentsChanged,
    flavourChanged,
    thinkingChanged,
    summary: parts.length > 0 ? parts.join('. ') + '.' : 'No changes detected.',
  };
}
