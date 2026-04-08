// =============================================================================
// MISE Recipe Library — Utility Functions
// =============================================================================
// Pure utility functions for recipe card metadata extraction, facet filtering,
// brain stats computation, and brain diff. No server/DB dependencies.
// =============================================================================

import type { RecipeRow } from '@/app/(studio)/library/actions';
import type { Recipe } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardMetadata {
  occasion: string;
  mood: string;
  effort: string;
  totalTime: number;
  feeds: number;
  dietary: string[];
  dominantElement: string;
  ingredientCount: number;
}

export interface FacetFilters {
  occasion: string | null;
  mood: string | null;
  effort: string | null;
  season: string | null;
  dietary: string | null;
  dominantElement: string | null;
}

export interface BrainStats {
  flavourDistribution: Record<string, number>;
  occasionDistribution: Record<string, number>;
  moodDistribution: Record<string, number>;
  complexityDistribution: Record<string, number>;
  topIngredients: Array<{ name: string; count: number }>;
  activityTimeline: Array<{ date: string; count: number }>;
  totalRecipes: number;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

// ---------------------------------------------------------------------------
// 1.1 formatDuration
// ---------------------------------------------------------------------------

/**
 * Converts total minutes to a human-readable duration string.
 * - 0 → "0 min"
 * - < 60 → "{n} min"
 * - exact hours → "{h}h"
 * - otherwise → "{h}h {m}m"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// 1.3 computeIngredientCount
// ---------------------------------------------------------------------------

/**
 * Counts unique ingredient names across all components.
 * Normalises names to lowercase for deduplication.
 */
export function computeIngredientCount(
  components: Recipe['components'] | null | undefined,
): number {
  if (!components || !Array.isArray(components)) return 0;
  const names = new Set<string>();
  for (const comp of components) {
    const ingredients = (comp as { ingredients?: Array<{ name?: string }> })?.ingredients;
    if (!Array.isArray(ingredients)) continue;
    for (const ing of ingredients) {
      const name = ing?.name;
      if (typeof name === 'string' && name.trim()) {
        names.add(name.trim().toLowerCase());
      }
    }
  }
  return names.size;
}

// ---------------------------------------------------------------------------
// 1.2 extractCardMetadata
// ---------------------------------------------------------------------------

/**
 * Extracts display-ready metadata from a RecipeRow for card rendering.
 * Uses optional chaining throughout since JSONB fields may be null/undefined.
 */
export function extractCardMetadata(recipe: RecipeRow): CardMetadata {
  const intent = recipe.intent as Recipe['intent'] | null | undefined;
  const flavour = recipe.flavour as Recipe['flavour'] | null | undefined;

  return {
    occasion: intent?.occasion ?? '',
    mood: intent?.mood ?? '',
    effort: intent?.effort ?? '',
    totalTime: intent?.total_time_minutes ?? 0,
    feeds: intent?.feeds ?? 0,
    dietary: Array.isArray(intent?.dietary) ? intent.dietary : [],
    dominantElement: flavour?.dominant_element ?? '',
    ingredientCount: computeIngredientCount(recipe.components),
  };
}

// ---------------------------------------------------------------------------
// 1.4 filterByFacets
// ---------------------------------------------------------------------------

/**
 * Filters recipes by AND-ing all non-null facet values.
 * Missing intent/flavour fields on a recipe are treated as non-matching
 * when that facet is active.
 */
export function filterByFacets(
  recipes: RecipeRow[],
  filters: FacetFilters,
): RecipeRow[] {
  // If every filter is null, return the full set
  const hasActiveFilter = Object.values(filters).some((v) => v != null);
  if (!hasActiveFilter) return recipes;

  return recipes.filter((recipe) => {
    const intent = recipe.intent as Recipe['intent'] | null | undefined;
    const flavour = recipe.flavour as Recipe['flavour'] | null | undefined;

    if (filters.occasion != null) {
      if (intent?.occasion !== filters.occasion) return false;
    }
    if (filters.mood != null) {
      if (intent?.mood !== filters.mood) return false;
    }
    if (filters.effort != null) {
      if (intent?.effort !== filters.effort) return false;
    }
    if (filters.season != null) {
      const season = intent?.season;
      if (typeof season === 'string') {
        if (season !== filters.season) return false;
      } else if (Array.isArray(season)) {
        if (!season.includes(filters.season)) return false;
      } else {
        return false;
      }
    }
    if (filters.dietary != null) {
      const dietary = Array.isArray(intent?.dietary) ? intent.dietary : [];
      if (!dietary.includes(filters.dietary)) return false;
    }
    if (filters.dominantElement != null) {
      if (flavour?.dominant_element !== filters.dominantElement) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// 1.6 computeTopIngredients
// ---------------------------------------------------------------------------

/**
 * Flattens all component ingredients across recipes, counts by normalised
 * name, and returns the top N sorted by frequency descending.
 */
export function computeTopIngredients(
  recipes: RecipeRow[],
  limit: number = 15,
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();

  for (const recipe of recipes) {
    const components = recipe.components as Recipe['components'] | null | undefined;
    if (!components || !Array.isArray(components)) continue;
    for (const comp of components) {
      const ingredients = (comp as { ingredients?: Array<{ name?: string }> })?.ingredients;
      if (!Array.isArray(ingredients)) continue;
      for (const ing of ingredients) {
        const name = ing?.name;
        if (typeof name === 'string' && name.trim()) {
          const key = name.trim().toLowerCase();
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// 1.7 computeActivityTimeline
// ---------------------------------------------------------------------------

/**
 * Groups recipes by month (YYYY-MM) from created_at, sorted chronologically.
 */
export function computeActivityTimeline(
  recipes: RecipeRow[],
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();

  for (const recipe of recipes) {
    const createdAt = recipe.created_at;
    if (!createdAt) continue;
    // Extract YYYY-MM from ISO date string
    const month = createdAt.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// 1.5 computeBrainStats
// ---------------------------------------------------------------------------

/**
 * Computes all Brain dashboard statistics from a set of recipes.
 */
export function computeBrainStats(recipes: RecipeRow[]): BrainStats {
  const flavourDistribution: Record<string, number> = {};
  const occasionDistribution: Record<string, number> = {};
  const moodDistribution: Record<string, number> = {};
  const complexityDistribution: Record<string, number> = {};

  for (const recipe of recipes) {
    const intent = recipe.intent as Recipe['intent'] | null | undefined;
    const flavour = recipe.flavour as Recipe['flavour'] | null | undefined;

    if (flavour?.dominant_element) {
      const key = flavour.dominant_element;
      flavourDistribution[key] = (flavourDistribution[key] ?? 0) + 1;
    }
    if (intent?.occasion) {
      const key = intent.occasion;
      occasionDistribution[key] = (occasionDistribution[key] ?? 0) + 1;
    }
    if (intent?.mood) {
      const key = intent.mood;
      moodDistribution[key] = (moodDistribution[key] ?? 0) + 1;
    }
    if (recipe.complexity_mode) {
      const key = recipe.complexity_mode;
      complexityDistribution[key] = (complexityDistribution[key] ?? 0) + 1;
    }
  }

  return {
    flavourDistribution,
    occasionDistribution,
    moodDistribution,
    complexityDistribution,
    topIngredients: computeTopIngredients(recipes, 15),
    activityTimeline: computeActivityTimeline(recipes),
    totalRecipes: recipes.length,
  };
}

// ---------------------------------------------------------------------------
// 1.8 computeBrainDiff
// ---------------------------------------------------------------------------

/**
 * Computes a line-by-line diff between two strings using a simple LCS-based
 * algorithm. Returns an array of DiffLine entries classified as 'added',
 * 'removed', or 'unchanged'. No external dependencies.
 */
export function computeBrainDiff(current: string, previous: string): DiffLine[] {
  const currentLines = current.split('\n');
  const previousLines = previous.split('\n');

  // Build LCS table
  const m = previousLines.length;
  const n = currentLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (previousLines[i - 1] === currentLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && previousLines[i - 1] === currentLines[j - 1]) {
      result.push({ type: 'unchanged', text: currentLines[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: currentLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: previousLines[i - 1] });
      i--;
    }
  }

  return result.reverse();
}
