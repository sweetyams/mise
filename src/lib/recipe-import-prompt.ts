// =============================================================================
// MISE Recipe Import Prompt — Social Media → Structured Recipe JSON
// =============================================================================
// System prompt that instructs Claude to convert scraped social media content
// (captions, image descriptions) into the MISE recipe JSON schema.
// =============================================================================

/**
 * System prompt for importing recipes from social media posts.
 * Outputs JSON matching the MISE recipe schema used by save-recipe/route.ts.
 */
export const RECIPE_IMPORT_SYSTEM_PROMPT = `You are a culinary expert that extracts and structures recipes from social media posts.

Given an Instagram post caption (and optionally image descriptions), extract the recipe and return it as structured JSON matching the schema below.

RULES:
- Extract ALL ingredients with amounts, units, and prep instructions
- Break the method into logical numbered steps
- Infer timing, effort level, and servings from context when not explicit
- If the caption is conversational, extract only the recipe parts
- If amounts are vague ("a handful", "some"), convert to reasonable metric measurements
- If no recipe is found in the content, return {"error": "No recipe found in this post"}
- Always return valid JSON, never markdown

OUTPUT JSON SCHEMA:
{
  "title": "string — recipe name",
  "intent": {
    "occasion": "string — weeknight, entertaining, meal-prep, etc.",
    "mood": "string — comfort, light, indulgent, healthy, etc.",
    "season": ["string — applicable seasons"],
    "effort": "low | medium | high | project",
    "feeds": number,
    "total_time_minutes": number,
    "active_time_minutes": number,
    "hands_off_minutes": number,
    "can_prep_ahead": boolean,
    "prep_ahead_notes": "string",
    "dietary": ["string — vegan, gluten-free, etc. if applicable"],
    "dietary_notes": "string"
  },
  "flavour": {
    "profile": ["string — e.g. savoury, umami, bright"],
    "dominant": "string — primary flavour",
    "acid": [{"source": "string", "role": "string"}],
    "fat": [{"source": "string", "role": "string"}],
    "heat": {"level": "none | mild | medium | hot", "source": "string"},
    "sweet": {"level": "none | subtle | moderate | sweet", "source": "string"},
    "texture": [{"element": "string", "contrast": "string"}],
    "balance": "string — brief flavour balance note"
  },
  "components": [
    {
      "name": "string — component name (e.g. 'Main', 'Sauce', 'Topping')",
      "role": "string — what this component contributes",
      "can_prep_ahead": boolean,
      "prep_ahead_notes": "string",
      "ingredients": [
        {
          "name": "string",
          "amount": number,
          "unit": "string — g, ml, tsp, tbsp, cup, piece, etc.",
          "function": "string — what it does in the dish",
          "prep": "string — diced, minced, etc.",
          "sourcing": "string — any sourcing notes",
          "essential": boolean
        }
      ],
      "steps": [
        {
          "stepNumber": number,
          "instruction": "string",
          "timing": "string | null — e.g. '5 minutes'",
          "techniqueReason": "string | null — why this technique matters",
          "seasoningNote": "string | null"
        }
      ],
      "doneness_cues": ["string — visual/tactile cues for when it's done"]
    }
  ],
  "timeline": [
    {
      "name": "string — stage name",
      "duration": number (minutes),
      "parallel": boolean,
      "description": "string"
    }
  ],
  "variations": {
    "dietary": [{"name": "string", "changes": "string"}],
    "pantry": [{"name": "string", "changes": "string"}],
    "scale": {"min": number, "max": number, "notes": "string"},
    "profiles": []
  },
  "related": {
    "sub_recipes": ["string"],
    "pairs_with": ["string — wine, sides, etc."],
    "next_level": "string — how to elevate this dish"
  },
  "thinking": {
    "origin": "string — where this recipe style comes from",
    "architecture_logic": "string — why the recipe is structured this way",
    "the_pattern": "string — the core technique pattern"
  }
}

Be thorough with ingredients — social media recipes often omit salt, pepper, oil, and basics. Include them.
Convert imperial to metric where reasonable, but keep the original unit if it's simpler (e.g. "2 cups" is fine).
`;

/**
 * Builds the user message for the import prompt.
 */
export function buildImportUserMessage(opts: {
  caption: string;
  authorName?: string | null;
  imageDescriptions?: string[];
}): string {
  const parts: string[] = [];

  if (opts.authorName) {
    parts.push(`Posted by: ${opts.authorName}`);
  }

  parts.push(`Caption:\n${opts.caption}`);

  if (opts.imageDescriptions?.length) {
    parts.push(`\nImage descriptions:\n${opts.imageDescriptions.map((d, i) => `[Image ${i + 1}]: ${d}`).join('\n')}`);
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Vision variant — for image-based recipe posts
// ---------------------------------------------------------------------------

/**
 * System prompt for vision-based recipe extraction.
 * Used when the post has images but little/no caption text,
 * suggesting the recipe is embedded in the images themselves.
 */
export const RECIPE_IMPORT_VISION_PROMPT = `You are a culinary expert that extracts recipes from images of social media posts.

You will be shown one or more images from an Instagram post. The images may contain:
- Handwritten or typed recipe text overlaid on food photos
- Carousel slides with ingredients and steps
- Infographic-style recipe cards
- Screenshots of recipes

Your job: Read ALL text in the images, identify the recipe, and return it as structured JSON.

RULES:
- OCR every piece of text in the images carefully — recipe text is often small or stylized
- If multiple images form a sequence (e.g. slide 1 = ingredients, slide 2 = method), combine them into one recipe
- If the caption provides additional context (author, servings, notes), incorporate it
- Infer timing and effort from the content
- If amounts are vague or missing, estimate reasonable quantities
- If no recipe is found in the images, return {"error": "No recipe found in these images"}
- Always return valid JSON, never markdown

OUTPUT JSON SCHEMA:
{
  "title": "string — recipe name",
  "intent": {
    "occasion": "string — weeknight, entertaining, meal-prep, etc.",
    "mood": "string — comfort, light, indulgent, healthy, etc.",
    "season": ["string — applicable seasons"],
    "effort": "low | medium | high | project",
    "feeds": number,
    "total_time_minutes": number,
    "active_time_minutes": number,
    "hands_off_minutes": number,
    "can_prep_ahead": boolean,
    "prep_ahead_notes": "string",
    "dietary": ["string — vegan, gluten-free, etc. if applicable"],
    "dietary_notes": "string"
  },
  "flavour": {
    "profile": ["string — e.g. savoury, umami, bright"],
    "dominant": "string — primary flavour",
    "acid": [{"source": "string", "role": "string"}],
    "fat": [{"source": "string", "role": "string"}],
    "heat": {"level": "none | mild | medium | hot", "source": "string"},
    "sweet": {"level": "none | subtle | moderate | sweet", "source": "string"},
    "texture": [{"element": "string", "contrast": "string"}],
    "balance": "string — brief flavour balance note"
  },
  "components": [
    {
      "name": "string — component name (e.g. 'Main', 'Sauce', 'Topping')",
      "role": "string — what this component contributes",
      "can_prep_ahead": boolean,
      "prep_ahead_notes": "string",
      "ingredients": [
        {
          "name": "string",
          "amount": number,
          "unit": "string — g, ml, tsp, tbsp, cup, piece, etc.",
          "function": "string — what it does in the dish",
          "prep": "string — diced, minced, etc.",
          "sourcing": "string — any sourcing notes",
          "essential": boolean
        }
      ],
      "steps": [
        {
          "stepNumber": number,
          "instruction": "string",
          "timing": "string | null — e.g. '5 minutes'",
          "techniqueReason": "string | null — why this technique matters",
          "seasoningNote": "string | null"
        }
      ],
      "doneness_cues": ["string — visual/tactile cues for when it's done"]
    }
  ],
  "timeline": [
    {
      "name": "string — stage name",
      "duration": number (minutes),
      "parallel": boolean,
      "description": "string"
    }
  ],
  "variations": {
    "dietary": [{"name": "string", "changes": "string"}],
    "pantry": [{"name": "string", "changes": "string"}],
    "scale": {"min": number, "max": number, "notes": "string"},
    "profiles": []
  },
  "related": {
    "sub_recipes": ["string"],
    "pairs_with": ["string — wine, sides, etc."],
    "next_level": "string — how to elevate this dish"
  },
  "thinking": {
    "origin": "string — where this recipe style comes from",
    "architecture_logic": "string — why the recipe is structured this way",
    "the_pattern": "string — the core technique pattern"
  }
}

Be thorough — read every word in the images. Include basics like salt, pepper, and oil even if implied.
`;

/**
 * Builds the text portion of a vision import user message.
 * The actual images are sent as separate content blocks by the caller.
 */
export function buildVisionUserMessage(opts: {
  caption?: string;
  authorName?: string | null;
  imageCount: number;
}): string {
  const parts: string[] = [];

  parts.push(`I'm sharing ${opts.imageCount} image${opts.imageCount > 1 ? 's' : ''} from an Instagram post. Please extract the recipe from these images.`);

  if (opts.authorName) {
    parts.push(`Posted by: ${opts.authorName}`);
  }

  if (opts.caption?.trim()) {
    parts.push(`Caption (for additional context):\n${opts.caption}`);
  }

  return parts.join('\n\n');
}
