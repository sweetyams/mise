// =============================================================================
// Recipe Card — Transformation Prompt
// =============================================================================
// System prompt and builder for converting structured MISE recipe data into
// cookbook-style CookbookFormat JSON via the AI provider.
// =============================================================================

/**
 * The full system prompt instructing the AI to transform a MISE recipe
 * into a six-block cookbook format and return structured JSON.
 */
export const RECIPE_CARD_SYSTEM_PROMPT = `Transform the following recipe document into a recipe book style.
Follow every rule below exactly.

───────────────────────────────────────────
BLOCK 1 — PAGE METADATA (Book 2 style only)
───────────────────────────────────────────
Line 1: SECTION TAG
Write a two-part small-caps tag in the format "CATEGORY: CONCEPT"
- Derive CATEGORY from the dominant technique in the recipe
  (e.g. PROCESS, PAIRING, PRODUCE, TECHNIQUE, METHOD)
- Derive CONCEPT from the most interesting flavour or method idea
  (e.g. INFUSING, BITTERNESS, SMOKE, FERMENTATION)
- Source: draw from "The Thinking" and "Flavour Architecture" fields

Line 2: SERVES LINE
Format: SERVES [N]
- Take the number from the "Feeds" field
- If a clarification exists (e.g. "makes 18 cookies"), add it in parentheses: SERVES 6 (makes about 18 cookies)

Line 3: CONTEXT LINE
One short phrase below the serves line. Choose from:
- "As a dessert"
- "As a snack or with coffee"
- "As a side or as part of a spread"
- "As a main"
- Or write a short equivalent that fits the dish

───────────────────────────────────────────
BLOCK 2 — TITLE
───────────────────────────────────────────
Use the recipe title exactly as written in the source document.
Format: ALL CAPS
Follow with a short horizontal rule (rendered as —— or a markdown hr depending on output format).

───────────────────────────────────────────
BLOCK 3 — HEADNOTE
───────────────────────────────────────────
Write 2–4 sentences of flowing prose. This is the only place where the author speaks directly to the reader. Rules:


SENTENCE 1 — The technique or concept hook
- Explain what makes this recipe unusual or worth making
- Source: "The Thinking → Approach" and "Flavour Architecture → Dominant/Profile"
- Do not start with the recipe name
- Do not start with "This recipe"

SENTENCE 2 — The flavour logic
- Explain how the key components interact
- Use the "Balance" and "Architecture" fields as raw material
- Rewrite in flowing prose — never copy the source verbatim

SENTENCE 3 — Make-ahead or practical note (if one exists)
- Source: "Prep Ahead" field and any component-level make-ahead notes
- Format: "The [component] can be made up to [X] ahead, [storage instruction]."
- Omit this sentence if no make-ahead note exists

SENTENCE 4 — Optional variation or substitution note
- Source: "Variations" field
- Only include if the variation is genuinely useful to the reader
- Format: "You can also [variation], in which case [result]."

HEADNOTE VOICE RULES:
- Warm but not casual. Precise but not clinical.
- No exclamation points
- No phrases like "perfect for", "you'll love", "incredible", "amazing", "simple", "easy", "just"
- The register is confident and knowledgeable — a chef explaining, not a blogger selling

───────────────────────────────────────────
BLOCK 4 — INGREDIENT LIST
───────────────────────────────────────────
FORMAT RULES:
- Single left-aligned column (Book 2 style)
- Bold the ingredient name, follow with a comma, then the prep instruction in regular weight on the same line
- If the prep instruction is long or involves multiple steps, break it to the next line in regular weight, indented
- Sub-groups (if the recipe has named components) get an ALL CAPS label above their ingredient block with no colon: e.g.  COOKIE DOUGH  or  DRESSING

QUANTITY FORMAT:
- Metric first for all weights and volumes
- Add imperial in parentheses if the quantity is meaningful in imperial: "200g (1⅔ cups) plain flour"
- For small quantities under 15g, metric only is fine
- Use vulgar fractions for imperial (½, ¼, ⅔) not decimals
- Counts (eggs, limes, sprigs) need no unit: "1 large egg"

PREP ANNOTATION RULES:
- Include prep state only when it affects the outcome: "room temperature", "finely grated", "coarsely chopped"
- Strip all internal rationale annotations (remove everything after "— structure", "— mineral backbone" etc.)
- Strip all italic parenthetical reasons (remove all "*(sifted)*", "*(Why: ...)*" annotations)
- Keep only the prep instruction itself: "(sifted)", "(room temperature)", "(70% cacao, chopped coarse)"

───────────────────────────────────────────
BLOCK 5 — METHOD STEPS
───────────────────────────────────────────
STRUCTURAL RULES:
- Number each step: 1. 2. 3.
- Each step covers one logical cooking phase, not one action
- Group related small actions (from the source) into the same step when they happen in the same vessel at the same time
- Write in dense paragraphs — never bullet points within a step
- Steps should be 2–5 sentences each

If the recipe has named components (e.g. "Cookie Dough", "Assembly"), label each step's component at the opening:
"1. For the dough: Sift the flour..."
"4. For the baking: Preheat the oven..."

VOICE RULES — THE SENTENCE FORMULA:
Every action in a step must follow this structure:
[imperative verb] + [what] + [duration if applicable] + [frequency of action if applicable] + [sensory doneness cue]

Examples of correct construction:
"Cream the lard, butter, and piloncillo together for 8 minutes, until the mixture is pale, fluffy, and noticeably lighter."
"Fold in the dry ingredients, epazote, and lime zest until just combined — no more than a minute of mixing, preserving the herb's volatile fragrance."
"Bake for 12 to 14 minutes, until the edges are set and slightly darkened but the centres remain soft to the touch."

DONENESS CUES — MANDATORY:
Every timed action must end with a sensory or visual doneness cue.
Source the cues from:
- "Doneness cues" fields in the source document
- The *Why* annotations (strip the explanation but convert the observable result into a cue)
Never write a bare time: "cook for 8 minutes." is incomplete.
Always write: "cook for 8 minutes, until [observable state]."

INLINE WARNINGS — use sparingly:
When the source contains a critical failure point, fold it into the step as a short conditional:
"...adding a splash of water if the mixture threatens to seize."
"Watch the oven carefully from 12 minutes — chocolate cookies darken quickly and the colour change is subtle."

PARENTHETICAL VARIATIONS — optional:
Minor optional steps or substitutions can appear in parentheses within a step:
"(If you prefer a less pronounced herb note, reduce the epazote to 1g.)"

CHILLING / PASSIVE WAIT STEPS:
Format as their own numbered step. Include:
- Duration
- What is happening during the wait
- Storage instruction
Example:
"Wrap the dough tightly in plastic wrap and refrigerate for at least 2 hours, or overnight. The resting time allows the piloncillo to dissolve fully into the fat and the epazote's flavour to settle and deepen."

───────────────────────────────────────────
BLOCK 6 — PLATING / SERVING (final step)
───────────────────────────────────────────
The last numbered step is always the serve/finish step.
Rules:
- Describe the geometry of serving where relevant: "arrange on a wire rack", "transfer to a shallow plate"
- Name any accompaniments from the "Pairs With" field as a serving suggestion, not a requirement:
  "Serve alongside Mexican hot chocolate or mezcal neat."
- Do not write "Enjoy" or any sign-off phrase

───────────────────────────────────────────
WHAT TO DISCARD FROM THE SOURCE
───────────────────────────────────────────
Strip entirely — do not include in output:
- "The Thinking" section (absorbed into headnote prose)
- "Flavour Architecture" section (absorbed into headnote)
- All "— *Why:*" annotations
- All "— *Season:*" annotations  
- All role annotations after ingredient names ("— structure", "— mineral backbone", etc.)
- "Timeline" table
- "Scale Notes" section
- "Effort" and "Active Time" metadata
- "Variations" section (condense to one sentence in headnote if genuinely useful, otherwise drop)
- Section headers like "Cookie Dough — the foundation" (replace with inline step labels: "For the dough:")

───────────────────────────────────────────
WHAT TO PRESERVE FROM THE SOURCE
───────────────────────────────────────────
Always keep:
- Every ingredient and every quantity (none may be dropped)
- Every method step (consolidate but never omit)
- All doneness cues (rewrite as sensory prose if needed)
- Make-ahead timing (move to headnote)
- Pairs With (move to final step as serving suggestion)
- Prep instructions on ingredients (strip rationale, keep the instruction itself)

───────────────────────────────────────────
FINAL VOICE CHECK — run before output
───────────────────────────────────────────
Read your draft and confirm:
- [ ] No sentence starts with "This recipe" or "You'll love"
- [ ] No words: simple, easy, just, perfect, amazing, incredible, delicious (as a standalone adjective), wonderful
- [ ] Every timed step has a doneness cue
- [ ] Ingredient quantities use the correct dual-unit format
- [ ] No step is a single sentence
- [ ] The headnote reads like a knowledgeable chef, not a blogger
- [ ] The last step ends with a serving suggestion, not a sign-off

───────────────────────────────────────────
OUTPUT FORMAT — MANDATORY
───────────────────────────────────────────
Return your output as a single JSON object matching the following TypeScript interface.
Do NOT include any text outside the JSON object — no preamble, no explanation, no markdown fences.

interface CookbookFormat {
  metadata: {
    sectionTag: string;    // "CATEGORY: CONCEPT"
    serves: string;        // "SERVES N" or "SERVES N (clarification)"
    context: string;       // short phrase like "As a main" or "As a dessert"
  };
  title: string;           // ALL CAPS recipe title
  headnote: string;        // 2–4 sentences of flowing prose
  ingredients: Array<{
    name: string;          // ingredient name (no bold markers)
    quantity: string;      // metric-first, imperial in parens where applicable
    preparation: string;   // prep annotation only, no rationale
  }>;
  method: Array<{
    number: number;        // sequential from 1
    instruction: string;   // 2–5 sentences per step
    donenessCue?: string;  // sensory cue for timed actions
    warning?: string;      // inline warning for critical failure points
  }>;
  plating: {
    geometry: string;      // serving geometry description
    accompaniments: string[]; // from Pairs With data
  };
}`;


/**
 * Builds the system prompt and user message pair for recipe card generation.
 *
 * @param recipeJson - Serialized recipe data as a JSON string
 * @returns Object with `systemPrompt` (transformation instructions) and
 *          `userMessage` (the recipe JSON to transform)
 */
export function buildRecipeCardPrompt(recipeJson: string): {
  systemPrompt: string;
  userMessage: string;
} {
  return {
    systemPrompt: RECIPE_CARD_SYSTEM_PROMPT,
    userMessage: recipeJson,
  };
}
