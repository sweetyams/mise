// =============================================================================
// MISE Fingerprint Loader — Selective Layer Assembly
// =============================================================================
// Loads fingerprint sections based on recipe context. Stays within
// ~750 typical / ~1,650 max token budget.
//
// Always loads: identity_core + negative_constraints (~300 tokens)
// Selectively: techniques (2), ingredients (3), exemplars (3),
//              voice (when needed), seasonal filter (when matched)
// =============================================================================

import type {
  ChefProfile,
  FingerprintRecipeContext,
  AssembledFingerprint,
  TechniqueSection,
  IngredientSection,
  DishExemplar,
  SeasonalFilter,
} from '@/lib/types/fingerprint-profile';

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Fuzzy matching — find best matching sections by keyword overlap
// ---------------------------------------------------------------------------

function scoreMatch(sectionKey: string, queries: string[]): number {
  const key = sectionKey.toLowerCase();
  let score = 0;
  for (const q of queries) {
    const query = q.toLowerCase();
    if (key === query) score += 10;
    else if (key.includes(query) || query.includes(key)) score += 5;
    else {
      // partial word overlap
      const keyWords = key.split(/[\s-_]+/);
      const queryWords = query.split(/[\s-_]+/);
      for (const kw of keyWords) {
        for (const qw of queryWords) {
          if (kw === qw) score += 3;
          else if (kw.includes(qw) || qw.includes(kw)) score += 1;
        }
      }
    }
  }
  return score;
}

function selectTopN<T extends { name?: string; category?: string; dish?: string }>(
  items: T[],
  queries: string[],
  n: number
): T[] {
  if (!queries.length || !items.length) return items.slice(0, n);

  const scored = items.map((item) => {
    const key = item.name ?? item.category ?? item.dish ?? '';
    return { item, score: scoreMatch(key, queries) };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.item);
}

// ---------------------------------------------------------------------------
// Format sections into prompt text
// ---------------------------------------------------------------------------

function formatIdentityCore(profile: ChefProfile): string {
  const c = profile.identity_core;
  return [
    `## Chef Identity`,
    c.philosophy,
    c.personality,
    c.signature_moves,
  ].join('\n');
}

function formatNegativeConstraints(profile: ChefProfile): string {
  if (!profile.negative_constraints?.avoid?.length) return '';
  return [
    `## Avoid`,
    ...profile.negative_constraints.avoid.map((a) => `× ${a}`),
  ].join('\n');
}

function formatTechniques(sections: TechniqueSection[]): string {
  if (!sections.length) return '';
  const parts = ['## Techniques'];
  for (const t of sections) {
    parts.push(`### ${t.name}`);
    parts.push(t.approach);
    if (t.signature_details) parts.push(t.signature_details);
  }
  return parts.join('\n');
}

function formatIngredients(sections: IngredientSection[]): string {
  if (!sections.length) return '';
  const parts = ['## Ingredients'];
  for (const i of sections) {
    parts.push(`### ${i.category}`);
    parts.push(i.perspective);
    if (i.pairings) parts.push(`Pairs with: ${i.pairings}`);
    if (i.rules) parts.push(`Rules: ${i.rules}`);
  }
  return parts.join('\n');
}

function formatExemplars(exemplars: DishExemplar[]): string {
  if (!exemplars.length) return '';
  const parts = ['## Reference Dishes'];
  for (const e of exemplars) {
    parts.push(`### ${e.dish}`);
    const decisions = Object.entries(e.key_decisions)
      .filter(([, v]) => v)
      .map(([k, v]) => `- ${k}: ${v}`);
    parts.push(...decisions);
    parts.push(`The move: ${e.the_move}`);
  }
  return parts.join('\n');
}

function formatVoice(profile: ChefProfile): string {
  const v = profile.voice;
  if (!v) return '';
  return [
    `## Voice`,
    v.writing_style,
    v.tone,
    v.vocabulary,
    v.formatting,
  ].filter(Boolean).join('\n');
}

function formatSeasonalFilter(filter: SeasonalFilter): string {
  return [
    `## Seasonal Adjustments (${filter.season}, ${filter.region})`,
    `Prefer: ${filter.adjust.swap_in.join(', ')}`,
    `Avoid: ${filter.adjust.swap_out.join(', ')}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// loadFingerprint — main entry point for selective assembly
// ---------------------------------------------------------------------------

export function assembleFingerprint(
  profile: ChefProfile,
  context: FingerprintRecipeContext
): AssembledFingerprint {
  const sections: string[] = [];
  const included: string[] = [];

  // Layer A — always loads
  const core = formatIdentityCore(profile);
  if (core) { sections.push(core); included.push('identity_core'); }

  // Negative constraints — always loads with core
  const negatives = formatNegativeConstraints(profile);
  if (negatives) { sections.push(negatives); included.push('negative_constraints'); }

  // Layer B — 2 most relevant techniques
  if (profile.techniques?.length) {
    const selected = selectTopN(profile.techniques, context.techniques ?? [], 2);
    const text = formatTechniques(selected);
    if (text) { sections.push(text); included.push(...selected.map((t) => `technique:${t.name}`)); }
  }

  // Layer C — 3 most relevant ingredient sections
  if (profile.ingredient_lexicon?.length) {
    const selected = selectTopN(profile.ingredient_lexicon, context.ingredients ?? [], 3);
    const text = formatIngredients(selected);
    if (text) { sections.push(text); included.push(...selected.map((i) => `ingredient:${i.category}`)); }
  }

  // Dish exemplars — 3 most relevant for grounding
  if (profile.dish_exemplars?.length) {
    const allKeywords = [...(context.techniques ?? []), ...(context.ingredients ?? [])];
    const selected = selectTopN(profile.dish_exemplars, allKeywords, 3);
    const text = formatExemplars(selected);
    if (text) { sections.push(text); included.push('dish_exemplars'); }
  }

  // Layer D — voice, only when needed
  if (context.needsVoice && profile.voice) {
    const text = formatVoice(profile);
    if (text) { sections.push(text); included.push('voice'); }
  }

  // Seasonal filter — match season + region
  if (context.season && profile.seasonal_filters?.length) {
    const match = profile.seasonal_filters.find(
      (f) =>
        f.season.toLowerCase() === context.season!.toLowerCase() &&
        (!context.region || f.region.toLowerCase() === context.region.toLowerCase())
    );
    if (match) {
      sections.push(formatSeasonalFilter(match));
      included.push(`seasonal:${match.season}:${match.region}`);
    }
  }

  const text = sections.join('\n\n');

  return {
    text,
    sections: included,
    tokenEstimate: estimateTokens(text),
  };
}

// ---------------------------------------------------------------------------
// Fallback — if no full_profile exists, use flat prompt_text
// ---------------------------------------------------------------------------

export function assembleFlatFingerprint(promptText: string): AssembledFingerprint {
  return {
    text: promptText,
    sections: ['flat_prompt_text'],
    tokenEstimate: estimateTokens(promptText),
  };
}
