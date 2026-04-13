// =============================================================================
// MISE Recipe Data Model — V2 TypeScript Interfaces
// =============================================================================
// Component-based recipe model with full flavour architecture, timeline,
// scaling, variations, and version lineage. Every recipe is a set of
// Components, each with ingredients, steps, doneness cues, and prep-ahead
// guidance. Mirrors how professional kitchens think about dishes.
// =============================================================================

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
  | 'riff_mode'
  | 'custom_prompt';

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

export type Occasion = 'weeknight' | 'dinner party' | 'meal prep' | 'project cook' | 'snack' | 'breakfast' | 'event';
export type Mood = 'comfort' | 'impressive' | 'experimental' | 'restorative' | 'celebratory' | 'weekday easy';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'year-round';
export type Effort = 'low' | 'medium' | 'high' | 'project';

export interface Intent {
  occasion: Occasion;
  mood: Mood;
  season: Season;
  effort: Effort;
  feeds: number;
  total_time_minutes: number;
  active_time_minutes: number;
  hands_off_minutes: number;
  can_prep_ahead: boolean;
  prep_ahead_notes: string;
  dietary: string[];
  dietary_notes: string;
}

// ---------------------------------------------------------------------------
// Flavour Architecture
// ---------------------------------------------------------------------------

export interface AcidProfile {
  present: boolean;
  sources: string[];
  timing: 'structural' | 'finishing' | 'both';
  character: 'bright' | 'dark' | 'tannic' | 'fermented' | 'wine-adjacent' | 'citrus';
  note: string;
}

export interface FatProfile {
  primary_fat: string;
  character: 'neutral' | 'flavoured' | 'rendered' | 'dairy';
  technique: 'roasted' | 'browned' | 'emulsified' | 'raw';
  note: string;
}

export interface HeatProfile {
  present: boolean;
  type: 'front' | 'background' | 'building' | 'absent';
  sources: string[];
  intensity: 'none' | 'gentle' | 'moderate' | 'assertive' | 'hot';
}

export interface SweetnessProfile {
  present: boolean;
  sources: string[];
  role: 'balance' | 'featured' | 'background';
}

export interface UmamiProfile {
  present: boolean;
  sources: string[];
}

export interface TextureContrast {
  element_a: string;
  element_b: string;
  how: string;
}

export interface FlavourArchitecture {
  dominant_element: 'acid-led' | 'fat-led' | 'spice-led' | 'umami-led' | 'herb-led' | 'smoke-led';
  acid: AcidProfile;
  fat: FatProfile;
  heat: HeatProfile;
  sweetness: SweetnessProfile;
  umami: UmamiProfile;
  texture_contrasts: TextureContrast[];
  flavour_profile: string[];
  balance_note: string;
  the_move: string;
}

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

export interface Substitution {
  ingredient: string;
  amount_adjustment: string;
  method_adjustment: string;
  flavour_note: string;
}

// ---------------------------------------------------------------------------
// Ingredient
// ---------------------------------------------------------------------------

export type ScalingBehaviour = 'linear' | 'non-linear' | 'fixed';

export interface Ingredient {
  id: string;
  component_id: string;
  name: string;
  preparation: string;
  amount: number;
  unit: string;
  amount_note: string;
  is_essential: boolean;
  function: string;
  sourcing_note: string;
  substitutions: {
    common: Substitution[];
    dietary: Substitution[];
    pantry: Substitution[];
    flavour_shift: Substitution[];
  };
  scaling_behaviour: ScalingBehaviour;
  scaling_note: string;
}

// ---------------------------------------------------------------------------
// Recovery Path (Foundation mode)
// ---------------------------------------------------------------------------

export interface RecoveryPath {
  trigger: string;
  response: string;
  outcome: string;
}

// ---------------------------------------------------------------------------
// Doneness Cues
// ---------------------------------------------------------------------------

export interface DonenessCues {
  visual: string;
  smell: string;
  sound: string;
  texture: string;
  taste: string;
}

// ---------------------------------------------------------------------------
// Step Timing
// ---------------------------------------------------------------------------

export interface StepTiming {
  duration_minutes: number;
  is_passive: boolean;
  timer_label: string;
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export interface Step {
  id: string;
  component_id: string;
  sequence: number;
  instruction: string;
  technique: string;
  timing: StepTiming;
  doneness_cues: DonenessCues;
  recovery_paths: RecoveryPath[];
  technique_note: string;
  is_critical: boolean;
  tools_required: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface Component {
  id: string;
  name: string;
  role: 'base' | 'sauce' | 'texture' | 'acid-element' | 'fat-element' | 'garnish' | 'side' | 'bread';
  is_optional: boolean;
  optional_note: string;
  can_prep_ahead: boolean;
  prep_ahead_window: string;
  prep_ahead_notes: string;
  time_minutes: number;
  active_time_minutes: number;
  serves_as_standalone: boolean;
  standalone_uses: string[];
  sub_recipe_id: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  doneness_description: string;
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export interface TimelineStage {
  label: string;
  component_ids: string[];
  duration_minutes: number;
  offset_from_start: number;
  is_passive: boolean;
  advance_prep: boolean;
}

export interface Timeline {
  total_duration_minutes: number;
  serve_time: string | null;
  stages: TimelineStage[];
  parallel_possible: boolean;
  parallel_notes: string;
  critical_path: string[];
}

// ---------------------------------------------------------------------------
// Scaling
// ---------------------------------------------------------------------------

export interface Scaling {
  base_serves: number;
  min_serves: number;
  max_serves: number;
  non_linear_notes: string[];
  equipment_notes: string;
  batch_notes: string;
}

// ---------------------------------------------------------------------------
// Variations
// ---------------------------------------------------------------------------

export interface DietaryVariation {
  type: string;
  changes: string[];
  significant_impact: boolean;
  impact_note: string;
}

export interface TasteProfile {
  name: string;
  changes: string[];
  dial_prompt: string;
}

export interface TechniqueVariation {
  name: string;
  changes: string[];
  tradeoffs: string;
}

export interface RegionalVariation {
  direction: string;
  changes: string[];
  fingerprint_note: string;
}

export interface Variations {
  dietary: DietaryVariation[];
  taste_profiles: TasteProfile[];
  technique: TechniqueVariation[];
  regional: RegionalVariation[];
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export interface Relationships {
  sub_recipes: string[];
  pairs_with: string[];
  part_of_menus: string[];
  requires_sub_recipe: string[];
  forks: string[];
  forked_from: string | null;
  teaches: string[];
  next_level: string;
  commonly_cooked_with: string[];
}

// ---------------------------------------------------------------------------
// Decision Lock
// ---------------------------------------------------------------------------

export interface DecisionLockQuestion {
  question: string;
  constraint_source: string;
}

export interface DecisionLockAnswer {
  question: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Thinking
// ---------------------------------------------------------------------------

export interface Thinking {
  origin: string;
  architecture_logic: string;
  the_pattern: string;
  fingerprint_note: string;
}

// ---------------------------------------------------------------------------
// Shopping List
// ---------------------------------------------------------------------------

export interface ShoppingLineItem {
  ingredient_name: string;
  amount: string;
  quality_note: string;
}

export interface ShoppingSection {
  section: string;
  items: ShoppingLineItem[];
}

export interface ShoppingList {
  grouped_by_section: ShoppingSection[];
  pantry_assumed: string[];
  the_one_thing: string;
}

// ---------------------------------------------------------------------------
// Development Log
// ---------------------------------------------------------------------------

export interface DevelopmentRating {
  cook_again: 'yes' | 'tweaked' | 'no';
  highlight: 'flavour' | 'technique' | 'occasion' | 'surprised me';
  overall: number;
}

export interface DevelopmentEntry {
  version: number;
  cooked_at: string;
  rating: DevelopmentRating;
  notes: string;
  changes_made: string[];
  questions_asked: string[];
  substitutions_used: string[];
  would_dial: string[];
  fed_to_memory: boolean;
}

// ---------------------------------------------------------------------------
// Token Usage
// ---------------------------------------------------------------------------

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  fingerprint_layers_loaded: string[];
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export interface RecipeMeta {
  is_public: boolean;
  public_slug: string;
  share_card_generated: boolean;
  times_generated: number;
  times_cooked: number;
  tags: string[];
  source_prompt: string;
  token_usage: TokenUsage;
  language: string;
}

// ---------------------------------------------------------------------------
// Prompt Layer & Assembly (unchanged — used by prompt assembler)
// ---------------------------------------------------------------------------

export interface PromptLayer {
  text: string;
  version: number;
  tokenCount: number;
}

export interface AssembledPrompt {
  systemPrompt: string;
  userMessage: string;
  layers: {
    systemCore: PromptLayer;
    fingerprint: PromptLayer;
    chefBrain: PromptLayer;
    decisionLock: PromptLayer;
    requestContext: PromptLayer;
  };
}

export interface PromptSnapshot {
  systemCore: PromptLayer;
  fingerprint: PromptLayer & { fingerprintId: string; fingerprintName: string };
  chefBrain: PromptLayer & { userId: string };
  decisionLock: PromptLayer;
  requestContext: PromptLayer;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  assembledAt: string;
}

// ---------------------------------------------------------------------------
// Recipe — the top-level data model
// ---------------------------------------------------------------------------

export interface Recipe {
  // identity
  id: string;
  title: string;
  subtitle: string;
  fingerprint_id: string;
  fingerprint_version: number;
  complexity_mode: ComplexityMode;
  version: number;
  parent_id: string | null;
  root_id: string | null;
  created_at: string;
  generated_by: string;
  chef_brain_version: number;

  // intent
  intent: Intent;

  // flavour architecture
  flavour: FlavourArchitecture;

  // components
  components: Component[];

  // timeline
  timeline: Timeline;

  // scaling
  scaling: Scaling;

  // variations
  variations: Variations;

  // relationships
  relationships: Relationships;

  // thinking
  thinking: Thinking;

  // decision lock answers
  decision_lock_answers?: DecisionLockAnswer[];

  // shopping list
  shopping_list: ShoppingList;

  // development log
  development_log: DevelopmentEntry[];

  // meta
  meta: RecipeMeta;

  // legacy compat fields (used by rowToRecipe mappers)
  devNotes?: string | null;
  tags: string[];
  cooked: boolean;
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
// Shopping List View (Display Renderer output — backward compat)
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
