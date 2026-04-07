// =============================================================================
// MISE Recipe Data Model — TypeScript Interfaces
// =============================================================================
// Component-based recipe model: a recipe is a set of Components (the braise,
// the sauce, the garnish), each with their own ingredients, steps, and
// doneness cues. Mirrors how professional kitchens think about dishes.
// =============================================================================

// ---------------------------------------------------------------------------
// Flavour Architecture Types
// ---------------------------------------------------------------------------

export interface AcidNote {
  source: string;
  role: string;
}

export interface FatNote {
  source: string;
  role: string;
}

export interface HeatNote {
  level: string;
  source: string;
}

export interface SweetNote {
  level: string;
  source: string;
}

export interface TextureContrast {
  element: string;
  contrast: string;
}

// ---------------------------------------------------------------------------
// Variation & Scale Types
// ---------------------------------------------------------------------------

export interface Variation {
  name: string;
  changes: string;
}

export interface ScaleNote {
  min: number;
  max: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Taste Profile (instant preview adjustments stored at creation time)
// ---------------------------------------------------------------------------

export interface TasteProfile {
  name: string; // "Current", "More Acid", "More Heat", etc.
  adjustments: Array<{
    componentName: string;
    ingredientChanges: Array<{
      name: string;
      amount: number;
      unit: string;
      action: 'add' | 'replace' | 'remove';
    }>;
    techniqueChanges: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface TimelineStage {
  name: string;
  duration: number;
  parallel: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

export interface Substitution {
  name: string;
  amount: number;
  unit: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// Ingredient
// ---------------------------------------------------------------------------

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  substitutions: {
    common: Substitution[];
    dietary: Substitution[];
    pantry: Substitution[];
    flavour_shift: Substitution[];
  };
  sourcing: string;
  prep: string;
  function: string; // "acid structure", "fat", "texture"
  essential: boolean;
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export interface Step {
  stepNumber: number;
  instruction: string;
  timing: string | null;
  techniqueReason: string | null;
  seasoningNote: string | null;
}

// ---------------------------------------------------------------------------
// Component — the core building block of a recipe
// ---------------------------------------------------------------------------

export interface Component {
  name: string;             // "the braise", "the tahini sauce"
  role: string;             // "base", "sauce", "texture", "garnish", "acid element"
  can_prep_ahead: boolean;
  prep_ahead_notes: string;
  ingredients: Ingredient[];
  steps: Step[];
  doneness_cues: string[];  // what it should look, smell, feel like when done
}

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

export interface Intent {
  occasion: string;       // weeknight, dinner party, meal prep
  mood: string;           // comfort, impressive, experimental
  season: string[];
  time: number;           // total minutes
  effort: 'low' | 'medium' | 'high' | 'project';
}

// ---------------------------------------------------------------------------
// Flavour Architecture
// ---------------------------------------------------------------------------

export interface Flavour {
  profile: string[];      // ['bright', 'umami', 'herbaceous']
  dominant: string;       // 'acid-led', 'fat-led', 'spice-led'
  acid: AcidNote[];
  fat: FatNote[];
  heat: HeatNote;
  sweet: SweetNote;
  texture: TextureContrast[];
  balance: string;        // chef's note on the flavour architecture
}

// ---------------------------------------------------------------------------
// Thinking — chef's reasoning behind the dish
// ---------------------------------------------------------------------------

export interface Thinking {
  approach: string;       // how the chef approached this dish
  architecture: string;   // the logic behind the flavour decisions
  pattern: string;        // what culinary pattern this recipe teaches
}

// ---------------------------------------------------------------------------
// Related
// ---------------------------------------------------------------------------

export interface Related {
  sub_recipes: string[];  // IDs of standalone sub-recipe objects
  pairs_with: string[];   // what to serve alongside
  next_level: string;     // what to try after mastering this
}

// ---------------------------------------------------------------------------
// Variations
// ---------------------------------------------------------------------------

export interface Variations {
  dietary: Variation[];
  pantry: Variation[];
  scale: ScaleNote;
  profiles: TasteProfile[];
}

// ---------------------------------------------------------------------------
// Complexity Mode
// ---------------------------------------------------------------------------

export type ComplexityMode = 'foundation' | 'kitchen' | 'riff';

// ---------------------------------------------------------------------------
// The Dial — recipe evolution directions
// ---------------------------------------------------------------------------

export type DialDirection =
  | 'more_acid'
  | 'more_heat'
  | 'more_umami'
  | 'smokier'
  | 'lighter'
  | 'funkier'
  | 'different_region'
  | 'riff_mode';

// ---------------------------------------------------------------------------
// Prompt Layer & Assembly
// ---------------------------------------------------------------------------

export interface PromptLayer {
  text: string;
  version: number;
  tokenCount: number;
}

export interface AssembledPrompt {
  systemPrompt: string;       // Layers 1+2+3 joined
  userMessage: string;        // Layer 4
  layers: {
    systemCore: PromptLayer;
    fingerprint: PromptLayer;
    chefBrain: PromptLayer;
    requestContext: PromptLayer;
  };
}

export interface PromptSnapshot {
  systemCore: PromptLayer;
  fingerprint: PromptLayer & { fingerprintId: string; fingerprintName: string };
  chefBrain: PromptLayer & { userId: string };
  requestContext: PromptLayer;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  assembledAt: string; // ISO timestamp
}

// ---------------------------------------------------------------------------
// Recipe — the top-level data model
// ---------------------------------------------------------------------------

export interface Recipe {
  // identity
  id: string;
  title: string;
  fingerprint: string;
  version: number;

  // intent
  intent: Intent;

  // flavour architecture
  flavour: Flavour;

  // components (NOT flat ingredients)
  components: Component[];

  // timeline
  timeline: TimelineStage[];

  // variations
  variations: Variations;

  // related
  related: Related;

  // the thinking — chef's reasoning behind the dish
  thinking: Thinking;

  // metadata
  promptSnapshot: PromptSnapshot;
  complexityMode: ComplexityMode;
  cooked: boolean;
  devNotes: string | null;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Scaled Recipe (Batch Scaler output)
// ---------------------------------------------------------------------------

export interface ScaledRecipe {
  original: Recipe;
  scaled: Recipe;
  multiplier: number;
}

// ---------------------------------------------------------------------------
// Shopping List View (Display Renderer output)
// ---------------------------------------------------------------------------

export interface ShoppingListView {
  sections: Array<{
    section: string;
    items: Array<{
      name: string;
      amount: number;
      unit: string;
      checkStock: boolean;
    }>;
  }>;
  alreadyHave: string[];
  theOneThingWorthGetting: string;
}

// ---------------------------------------------------------------------------
// Multi-Dish Timeline (Display Renderer output)
// ---------------------------------------------------------------------------

export interface MultiDishTimeline {
  startTime: Date;
  serveTime: Date;
  schedule: Array<{
    time: Date;
    recipeName: string;
    componentName: string;
    duration: number;
  }>;
  freeWindows: Array<{
    start: Date;
    end: Date;
    duration: number;
  }>;
  prepAhead: Array<{
    recipeName: string;
    componentName: string;
    notes: string;
  }>;
}
