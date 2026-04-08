// =============================================================================
// MISE Intolerance Constants — Shared Configuration
// =============================================================================
// Canonical list of food intolerances grouped by category. Used by the
// settings UI, the intolerance API, and the generate route to inject
// dietary constraints into the prompt pipeline.
// Requirements: 1.1, 1.3, 2.4, 4.2
// =============================================================================

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface IntoleranceItem {
  id: string;       // e.g. "gluten", "lactose"
  label: string;    // e.g. "Gluten", "Lactose"
  category: string; // e.g. "Grains & Gluten"
}

export interface IntoleranceCategory {
  name: string;
  items: IntoleranceItem[];
}

// ---------------------------------------------------------------------------
// Categories & Items
// ---------------------------------------------------------------------------

export const INTOLERANCE_CATEGORIES: IntoleranceCategory[] = [
  {
    name: 'Dairy & Eggs',
    items: [
      { id: 'lactose', label: 'Lactose', category: 'Dairy & Eggs' },
      { id: 'casein', label: 'Casein', category: 'Dairy & Eggs' },
      { id: 'eggs', label: 'Eggs', category: 'Dairy & Eggs' },
    ],
  },
  {
    name: 'Grains & Gluten',
    items: [
      { id: 'gluten', label: 'Gluten', category: 'Grains & Gluten' },
      { id: 'wheat', label: 'Wheat', category: 'Grains & Gluten' },
      { id: 'corn', label: 'Corn', category: 'Grains & Gluten' },
    ],
  },
  {
    name: 'Nuts & Seeds',
    items: [
      { id: 'tree-nuts', label: 'Tree nuts', category: 'Nuts & Seeds' },
      { id: 'peanuts', label: 'Peanuts', category: 'Nuts & Seeds' },
      { id: 'sesame', label: 'Sesame', category: 'Nuts & Seeds' },
    ],
  },
  {
    name: 'Seafood',
    items: [
      { id: 'shellfish', label: 'Shellfish', category: 'Seafood' },
      { id: 'fish', label: 'Fish', category: 'Seafood' },
      { id: 'mollusks', label: 'Mollusks', category: 'Seafood' },
    ],
  },
  {
    name: 'Other Common Intolerances',
    items: [
      { id: 'soy', label: 'Soy', category: 'Other Common Intolerances' },
      { id: 'sulfites', label: 'Sulfites', category: 'Other Common Intolerances' },
      { id: 'nightshades', label: 'Nightshades', category: 'Other Common Intolerances' },
      { id: 'fodmaps', label: 'FODMAPs', category: 'Other Common Intolerances' },
      { id: 'histamine', label: 'Histamine', category: 'Other Common Intolerances' },
      { id: 'mustard', label: 'Mustard', category: 'Other Common Intolerances' },
      { id: 'celery', label: 'Celery', category: 'Other Common Intolerances' },
      { id: 'lupin', label: 'Lupin', category: 'Other Common Intolerances' },
      { id: 'alcohol', label: 'Alcohol', category: 'Other Common Intolerances' },
      { id: 'fructose', label: 'Fructose', category: 'Other Common Intolerances' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Derived lookups
// ---------------------------------------------------------------------------

const allItems: IntoleranceItem[] = INTOLERANCE_CATEGORIES.flatMap((c) => c.items);

export const ALL_INTOLERANCE_IDS: Set<string> = new Set(allItems.map((i) => i.id));

const itemById: Map<string, IntoleranceItem> = new Map(allItems.map((i) => [i.id, i]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns `true` when `id` is a recognised intolerance identifier. */
export function isValidIntoleranceId(id: string): boolean {
  return ALL_INTOLERANCE_IDS.has(id);
}

/**
 * Maps intolerance IDs to human-readable constraint strings.
 * Unknown IDs are silently skipped.
 *
 * @example formatIntoleranceConstraints(["gluten", "lactose"])
 * // => ["No Gluten", "No Lactose"]
 */
export function formatIntoleranceConstraints(ids: string[]): string[] {
  return ids
    .map((id) => itemById.get(id))
    .filter((item): item is IntoleranceItem => item !== undefined)
    .map((item) => `No ${item.label}`);
}
