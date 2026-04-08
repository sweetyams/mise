// =============================================================================
// Recipe Card — Cookbook Format Interfaces
// =============================================================================
// Simplified cookbook-style representation of a Recipe, generated via AI
// transformation. Stored separately from the recipe row in `recipe_cards`.
// =============================================================================

/** The six blocks of the cookbook format */
export interface CookbookFormat {
  metadata: {
    sectionTag: string;    // e.g. "WEEKNIGHT: PASTA"
    serves: string;        // e.g. "Serves 4"
    context: string;       // e.g. "45 min · medium effort · autumn"
  };
  title: string;           // ALL CAPS recipe title
  headnote: string;        // 2-4 sentences, warm-but-precise chef tone
  ingredients: CookbookIngredient[];
  method: CookbookStep[];
  plating: {
    geometry: string;      // serving geometry description
    accompaniments: string[]; // from pairs_with data
  };
}

export interface CookbookIngredient {
  name: string;            // bold ingredient name
  quantity: string;        // metric-first, imperial in parens
  preparation: string;     // prep annotation, no rationale
}

export interface CookbookStep {
  number: number;
  instruction: string;     // 2-5 sentences per step
  donenessCue?: string;    // paired with timed actions
  warning?: string;        // inline warning for critical failure points
}

export interface RecipeCard {
  id: string;
  recipe_id: string;
  user_id: string;
  recipe_version: number;
  content: CookbookFormat;
  created_at: string;
  updated_at: string;
}
