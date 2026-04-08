// =============================================================================
// MISE Fingerprint Profile — Layered Chef Persona Structure
// =============================================================================
// Each chef has a structured profile stored as JSONB in fingerprints.full_profile.
// Sections are selectively loaded based on recipe context to stay within
// ~750 typical / ~1,650 max token budget for the fingerprint layer.
// =============================================================================

import { DecisionLockQuestion } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Layer A — Identity Core (~200 tokens, always loads)
// ---------------------------------------------------------------------------

export interface IdentityCore {
  philosophy: string;       // chef's fundamental cooking philosophy
  personality: string;      // voice baseline, attitude
  signature_moves: string;  // what makes this chef's food recognizable
}

// ---------------------------------------------------------------------------
// Negative Constraints (~100 tokens, always loads with core)
// ---------------------------------------------------------------------------

export interface NegativeConstraints {
  avoid: string[];          // specific failure modes to prevent
}

// ---------------------------------------------------------------------------
// Layer B — Techniques (keyed, ~200 tokens each, load 2 relevant)
// ---------------------------------------------------------------------------

export interface TechniqueSection {
  name: string;             // e.g. "roasting", "braising", "fermentation"
  approach: string;         // how this chef thinks about this technique
  signature_details: string; // specific moves, temps, timings
}

// ---------------------------------------------------------------------------
// Layer C — Ingredient Lexicon (keyed, ~120 tokens each, load 3 relevant)
// ---------------------------------------------------------------------------

export interface IngredientSection {
  category: string;         // e.g. "lamb", "tahini", "preserved-lemon", "alliums"
  perspective: string;      // how this chef uses/thinks about this ingredient
  pairings: string;         // what they pair it with
  rules: string;            // non-negotiable rules for this ingredient
}

// ---------------------------------------------------------------------------
// Dish Exemplars (~50 tokens each, load 3 relevant for grounding)
// ---------------------------------------------------------------------------

export interface DishExemplar {
  dish: string;
  key_decisions: {
    acid?: string;
    fat?: string;
    texture?: string;
    surprise?: string;
    spice?: string;
    herb?: string;
    [key: string]: string | undefined;
  };
  the_move: string;         // the single insight that makes this dish work
}

// ---------------------------------------------------------------------------
// Layer D — Voice (~400 tokens, loads when output needs distinctive style)
// ---------------------------------------------------------------------------

export interface VoiceLayer {
  writing_style: string;    // how the chef writes/speaks about food
  tone: string;             // emotional register
  vocabulary: string;       // characteristic words and phrases
  formatting: string;       // how they structure recipe text
}

// ---------------------------------------------------------------------------
// Seasonal Filters (~50 tokens each, load 1 when relevant)
// ---------------------------------------------------------------------------

export interface SeasonalFilter {
  season: string;
  region: string;
  adjust: {
    swap_in: string[];
    swap_out: string[];
    preserve_fingerprint: boolean;
  };
}

// ---------------------------------------------------------------------------
// Full Profile — the complete JSONB structure
// ---------------------------------------------------------------------------

export interface ChefProfile {
  identity_core: IdentityCore;
  negative_constraints: NegativeConstraints;
  techniques: TechniqueSection[];
  ingredient_lexicon: IngredientSection[];
  dish_exemplars: DishExemplar[];
  voice: VoiceLayer;
  seasonal_filters: SeasonalFilter[];
  decision_lock?: DecisionLockQuestion[];
}

// ---------------------------------------------------------------------------
// Recipe context used to select which sections to load
// ---------------------------------------------------------------------------

export interface FingerprintRecipeContext {
  techniques?: string[];    // e.g. ['roasting', 'sauce']
  ingredients?: string[];   // e.g. ['lamb', 'preserved lemon', 'tahini']
  season?: string;          // e.g. 'winter'
  region?: string;          // e.g. 'canada'
  needsVoice?: boolean;     // true when output needs distinctive writing style
}

// ---------------------------------------------------------------------------
// Assembled fingerprint — the output of selective loading
// ---------------------------------------------------------------------------

export interface AssembledFingerprint {
  text: string;
  sections: string[];       // which sections were included (for debugging/snapshots)
  tokenEstimate: number;
}
