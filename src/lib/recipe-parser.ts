// =============================================================================
// MISE Recipe Parser — Client-Side Markdown → Structured JSON
// =============================================================================
// Pure function that parses AI-generated markdown (per system-core.ts output
// format) into structured Recipe JSON fields. Never throws — returns partial
// data with warnings on parse failures.
// =============================================================================

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ParsedThinking {
  approach: string;
  architecture: string;
  pattern: string;
}

export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  function: string;
  prep: string;
  sourcing: string;
  essential: boolean;
}

export interface ParsedStep {
  stepNumber: number;
  instruction: string;
  timing: string | null;
  techniqueReason: string | null;
  seasoningNote: string | null;
}

export interface ParsedComponent {
  name: string;
  role: string;
  can_prep_ahead: boolean;
  prep_ahead_notes: string;
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
  doneness_cues: string[];
}

export interface ParsedFlavour {
  profile: string[];
  dominant: string;
  acid: Array<{ source: string; role: string }>;
  fat: Array<{ source: string; role: string }>;
  heat: { level: string; source: string };
  sweet: { level: string; source: string };
  texture: Array<{ element: string; contrast: string }>;
  balance: string;
}

export interface ParsedVariation {
  name: string;
  changes: string;
}

export interface ParsedTimelineStage {
  name: string;
  duration: number;
  parallel: boolean;
  description: string;
}

export interface ParsedIntent {
  feeds: number;
  total_time_minutes: number;
  active_time_minutes: number;
  prep_ahead_notes: string;
  effort: string;
}

export interface ParsedRecipe {
  title: string;
  intent: ParsedIntent;
  thinking: ParsedThinking;
  flavour: ParsedFlavour;
  components: ParsedComponent[];
  timeline: ParsedTimelineStage[];
  variations: { dietary: ParsedVariation[]; pantry: ParsedVariation[] };
  decisionLockAnswers?: Array<{ question: string; answer: string }>;
}

export interface ParseResult {
  recipe: ParsedRecipe;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


/** Split markdown into sections by ## headings. Returns map of heading → body. */
function splitSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  // Split on lines that start with ## (but not ###)
  const parts = markdown.split(/^(?=## (?!#))/m);
  for (const part of parts) {
    const match = part.match(/^## (.+)/);
    if (match) {
      const heading = match[1].trim();
      const body = part.slice(match[0].length).trim();
      sections.set(heading, body);
    }
  }
  return sections;
}

/** Extract the first H1 title from markdown. */
function extractTitle(markdown: string): string {
  const match = markdown.match(/^# (.+)/m);
  return match ? match[1].trim() : '';
}

/** Parse a key-value line like "**Key:** value" */
function parseKeyValue(text: string, key: string): string {
  const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

/** Parse a "source — role" pair from a line. */
function parseSourceRole(text: string): { source: string; role: string } {
  const parts = text.split('—').map((s) => s.trim());
  return {
    source: parts[0] || '',
    role: parts.slice(1).join('—').trim() || '',
  };
}

/** Parse a number from a string, returning 0 on failure. */
function safeParseNumber(str: string): number {
  const cleaned = str.replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Parse duration string like "30 min", "1h", "1 hour 30 min" into minutes. */
function parseDurationMinutes(str: string): number {
  if (!str) return 0;
  const lower = str.toLowerCase().trim();

  // Try "Xh Ym" or "X hour(s) Y min(s)"
  const hm = lower.match(/(\d+)\s*h(?:ours?)?[\s,]*(\d+)?\s*m(?:in(?:utes?)?)?/);
  if (hm) {
    return (parseInt(hm[1], 10) || 0) * 60 + (parseInt(hm[2], 10) || 0);
  }

  // Try just hours
  const hours = lower.match(/(\d+)\s*h(?:ours?)?/);
  if (hours) return (parseInt(hours[1], 10) || 0) * 60;

  // Try just minutes
  const mins = lower.match(/(\d+)\s*m(?:in(?:utes?)?)?/);
  if (mins) return parseInt(mins[1], 10) || 0;

  // Try bare number (assume minutes)
  const bare = safeParseNumber(lower);
  return bare;
}

// ---------------------------------------------------------------------------
// Section Parsers
// ---------------------------------------------------------------------------

function parseDecisionLockAnswers(
  body: string
): Array<{ question: string; answer: string }> {
  const answers: Array<{ question: string; answer: string }> = [];
  // Format: 1. **Q:** [question] **A:** [answer]
  const regex = /\d+\.\s*\*\*Q:\*\*\s*(.+?)\s*\*\*A:\*\*\s*(.+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    answers.push({
      question: match[1].trim(),
      answer: match[2].trim(),
    });
  }
  return answers;
}

function parseThinking(body: string): ParsedThinking {
  return {
    approach: parseKeyValue(body, 'Approach'),
    architecture: parseKeyValue(body, 'Architecture'),
    pattern: parseKeyValue(body, 'Pattern'),
  };
}

function parseFlavour(body: string): ParsedFlavour {
  const profileStr = parseKeyValue(body, 'Profile');
  const profile = profileStr
    ? profileStr.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const dominant = parseKeyValue(body, 'Dominant');

  // Acid and Fat can have multiple lines: "- **Acid:** source — role"
  const acidLines = body.match(/[-*]\s*\*\*Acid:\*\*\s*(.+)/gi) || [];
  const acid = acidLines.map((line) => {
    const val = line.replace(/[-*]\s*\*\*Acid:\*\*\s*/i, '').trim();
    return parseSourceRole(val);
  });

  const fatLines = body.match(/[-*]\s*\*\*Fat:\*\*\s*(.+)/gi) || [];
  const fat = fatLines.map((line) => {
    const val = line.replace(/[-*]\s*\*\*Fat:\*\*\s*/i, '').trim();
    return parseSourceRole(val);
  });

  // Heat: "level from source"
  const heatStr = parseKeyValue(body, 'Heat');
  const heatMatch = heatStr.match(/(.+?)\s+from\s+(.+)/i);
  const heat = heatMatch
    ? { level: heatMatch[1].trim(), source: heatMatch[2].trim() }
    : { level: heatStr, source: '' };

  // Sweet (optional in the format — may not always be present)
  const sweetStr = parseKeyValue(body, 'Sweet');
  const sweetMatch = sweetStr.match(/(.+?)\s+from\s+(.+)/i);
  const sweet = sweetMatch
    ? { level: sweetMatch[1].trim(), source: sweetMatch[2].trim() }
    : { level: sweetStr, source: '' };

  // Texture: can be a single line or multiple
  const textureStr = parseKeyValue(body, 'Texture');
  const texture: Array<{ element: string; contrast: string }> = [];
  if (textureStr) {
    // Try splitting by comma or semicolon for multiple contrasts
    const parts = textureStr.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const vs = part.split(/\s+(?:vs\.?|against|and)\s+/i);
      if (vs.length >= 2) {
        texture.push({ element: vs[0].trim(), contrast: vs[1].trim() });
      } else {
        texture.push({ element: part, contrast: '' });
      }
    }
  }

  const balance = parseKeyValue(body, 'Balance');

  return { profile, dominant, acid, fat, heat, sweet, texture, balance };
}


function parseIngredientLine(line: string): ParsedIngredient | null {
  // Format: - [amount]g [name] — [function] *([prep note])*
  // Or:     - [amount] [unit] [name] — [function] *([prep note])*
  const trimmed = line.replace(/^[-*]\s*/, '').trim();
  if (!trimmed) return null;

  // Extract prep note: *([prep note])*
  let prep = '';
  let remaining = trimmed;
  const prepMatch = remaining.match(/\*\(([^)]*)\)\*/);
  if (prepMatch) {
    prep = prepMatch[1].trim();
    remaining = remaining.replace(prepMatch[0], '').trim();
  }

  // Split on " — " to separate name part from function
  const dashParts = remaining.split(/\s*—\s*/);
  const namePart = dashParts[0].trim();
  const funcPart = dashParts.length > 1 ? dashParts.slice(1).join('—').trim() : '';

  // Parse amount and unit from namePart
  // Try: "250g ingredient" or "250 g ingredient" or "2 tbsp ingredient"
  // Longer units listed before shorter ones to prevent partial matches (e.g. "large" before "l")
  // \s+ (not \s*) between unit and name prevents "l" matching the start of "large"
  const amountMatch = namePart.match(
    /^(\d+(?:\.\d+)?)\s*(kg|ml|litres?|large|medium|small|tbsp|tsp|cups?|bunches?|cloves?|pieces?|slices?|sprigs?|leaves|sheets?|pinch(?:es)?|handfuls?|whole|cm|mm|g|l)\s+(.+)/i
  );

  let amount = 0;
  let unit = '';
  let name = namePart;

  if (amountMatch) {
    amount = safeParseNumber(amountMatch[1]);
    unit = amountMatch[2].toLowerCase();
    name = amountMatch[3].trim();
  } else {
    // No unit matched — try just a number followed by the ingredient name (e.g. "2 eggs")
    const simpleMatch = namePart.match(/^(\d+(?:\.\d+)?)\s+(.+)/);
    if (simpleMatch) {
      amount = safeParseNumber(simpleMatch[1]);
      unit = '';
      name = simpleMatch[2].trim();
    }
  }

  return {
    name,
    amount,
    unit,
    function: funcPart,
    prep,
    sourcing: '',
    essential: true,
  };
}

function parseStepLine(line: string): ParsedStep | null {
  // Format: 1. [instruction] ([timing]) — *Why: [reason]* — *Season: [note]*
  const stepMatch = line.match(/^(\d+)\.\s*(.+)/);
  if (!stepMatch) return null;

  const stepNumber = parseInt(stepMatch[1], 10);
  let rest = stepMatch[2].trim();

  // Extract seasoning note: — *Season: [note]*
  let seasoningNote: string | null = null;
  const seasonMatch = rest.match(/—\s*\*Season:\s*(.+?)\*/);
  if (seasonMatch) {
    seasoningNote = seasonMatch[1].trim();
    rest = rest.replace(seasonMatch[0], '').trim();
  }

  // Extract technique reason: — *Why: [reason]*
  let techniqueReason: string | null = null;
  const whyMatch = rest.match(/—\s*\*Why:\s*(.+?)\*/);
  if (whyMatch) {
    techniqueReason = whyMatch[1].trim();
    rest = rest.replace(whyMatch[0], '').trim();
  }

  // Extract timing: ([timing])
  let timing: string | null = null;
  const timingMatch = rest.match(/\(([^)]+)\)\s*$/);
  if (timingMatch) {
    timing = timingMatch[1].trim();
    rest = rest.replace(timingMatch[0], '').trim();
  } else {
    // Try inline timing: (timing) anywhere
    const inlineTimingMatch = rest.match(/\((\d+[^)]*(?:min|sec|hour|minute)[^)]*)\)/i);
    if (inlineTimingMatch) {
      timing = inlineTimingMatch[1].trim();
      rest = rest.replace(inlineTimingMatch[0], '').trim();
    }
  }

  // Clean trailing dashes
  rest = rest.replace(/\s*—\s*$/, '').trim();

  return {
    stepNumber,
    instruction: rest,
    timing,
    techniqueReason,
    seasoningNote,
  };
}

function parseComponents(body: string): ParsedComponent[] {
  const components: ParsedComponent[] = [];
  // Split by ### headings
  const parts = body.split(/^(?=### )/m);

  for (const part of parts) {
    const headerMatch = part.match(/^### (.+)/);
    if (!headerMatch) continue;

    const headerLine = headerMatch[1].trim();
    // Format: "Component Name — role"
    const nameParts = headerLine.split(/\s*—\s*/);
    const name = nameParts[0].trim();
    const role = nameParts.length > 1 ? nameParts.slice(1).join('—').trim() : '';

    // Check for prep ahead note
    let can_prep_ahead = false;
    let prep_ahead_notes = '';
    const prepAheadMatch = part.match(
      /\*(?:Can be prepped ahead|Prep ahead):\s*(.+?)\*/i
    );
    if (prepAheadMatch) {
      can_prep_ahead = true;
      prep_ahead_notes = prepAheadMatch[1].trim();
    }

    // Parse ingredients
    const ingredients: ParsedIngredient[] = [];
    const ingredientSection = part.match(
      /\*\*Ingredients:\*\*\s*\n([\s\S]*?)(?=\*\*Method:\*\*|\*\*Doneness|$)/i
    );
    if (ingredientSection) {
      const lines = ingredientSection[1].split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          const ingredient = parseIngredientLine(line.trim());
          if (ingredient) ingredients.push(ingredient);
        }
      }
    }

    // Parse steps
    const steps: ParsedStep[] = [];
    const methodSection = part.match(
      /\*\*Method:\*\*\s*\n([\s\S]*?)(?=\*\*Doneness|### |$)/i
    );
    if (methodSection) {
      const lines = methodSection[1].split('\n');
      for (const line of lines) {
        if (/^\d+\./.test(line.trim())) {
          const step = parseStepLine(line.trim());
          if (step) steps.push(step);
        }
      }
    }

    // Parse doneness cues
    const doneness_cues: string[] = [];
    const donenessSection = part.match(
      /\*\*Doneness cues:\*\*\s*\n([\s\S]*?)(?=### |$)/i
    );
    if (donenessSection) {
      const lines = donenessSection[1].split('\n');
      for (const line of lines) {
        const trimmed = line.replace(/^[-*]\s*/, '').trim();
        if (trimmed) doneness_cues.push(trimmed);
      }
    }

    components.push({
      name,
      role,
      can_prep_ahead,
      prep_ahead_notes,
      ingredients,
      steps,
      doneness_cues,
    });
  }

  return components;
}

function parseVariations(
  body: string
): { dietary: ParsedVariation[]; pantry: ParsedVariation[] } {
  const variations: ParsedVariation[] = [];
  const lines = body.split('\n');
  for (const line of lines) {
    // Format: - **Name:** what changes
    const match = line.match(/^[-*]\s*\*\*(.+?):\*\*\s*(.+)/);
    if (match) {
      variations.push({
        name: match[1].trim(),
        changes: match[2].trim(),
      });
    }
  }
  // Split into dietary and pantry heuristically — if the name contains
  // dietary keywords, classify as dietary; otherwise pantry
  const dietaryKeywords = [
    'vegan', 'vegetarian', 'gluten', 'dairy', 'nut', 'keto', 'paleo',
    'low-carb', 'pescatarian', 'halal', 'kosher',
  ];
  const dietary: ParsedVariation[] = [];
  const pantry: ParsedVariation[] = [];
  for (const v of variations) {
    const lower = (v.name + ' ' + v.changes).toLowerCase();
    if (dietaryKeywords.some((kw) => lower.includes(kw))) {
      dietary.push(v);
    } else {
      pantry.push(v);
    }
  }
  return { dietary, pantry };
}

function parseTimeline(body: string): ParsedTimelineStage[] {
  const stages: ParsedTimelineStage[] = [];
  const lines = body.split('\n');
  for (const line of lines) {
    // Table row format: | stage | duration | notes |
    const match = line.match(/^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (match) {
      const name = match[1].trim();
      const durationStr = match[2].trim();
      const description = match[3].trim();

      // Skip header and separator rows
      if (name.toLowerCase() === 'stage' || /^[-:]+$/.test(name)) continue;
      if (/^[-:]+$/.test(durationStr)) continue;

      const duration = parseDurationMinutes(durationStr);
      // Heuristic: if description mentions "parallel" or "while", mark as parallel
      const parallel =
        /parallel|while|simultaneously|at the same time/i.test(description);

      stages.push({ name, duration, parallel, description });
    }
  }
  return stages;
}

// ---------------------------------------------------------------------------
// Main Parser
// ---------------------------------------------------------------------------

export function parseRecipeMarkdown(markdown: string): ParseResult {
  const warnings: string[] = [];

  const emptyIntent: ParsedIntent = { feeds: 0, total_time_minutes: 0, active_time_minutes: 0, prep_ahead_notes: '', effort: '' };
  const emptyThinking: ParsedThinking = { approach: '', architecture: '', pattern: '' };
  const emptyFlavour: ParsedFlavour = {
    profile: [],
    dominant: '',
    acid: [],
    fat: [],
    heat: { level: '', source: '' },
    sweet: { level: '', source: '' },
    texture: [],
    balance: '',
  };

  const recipe: ParsedRecipe = {
    title: '',
    intent: emptyIntent,
    thinking: emptyThinking,
    flavour: emptyFlavour,
    components: [],
    timeline: [],
    variations: { dietary: [], pantry: [] },
  };

  if (!markdown || typeof markdown !== 'string') {
    warnings.push('Empty or invalid markdown input');
    return { recipe, warnings };
  }

  // Extract title
  recipe.title = extractTitle(markdown);
  if (!recipe.title) {
    warnings.push('Could not extract recipe title (no H1 heading found)');
  }

  // Split into sections
  const sections = splitSections(markdown);

  // Intent
  const intentBody = sections.get('Intent');
  if (intentBody) {
    const feedsStr = parseKeyValue(intentBody, 'Feeds');
    const totalTimeStr = parseKeyValue(intentBody, 'Total Time');
    const activeTimeStr = parseKeyValue(intentBody, 'Active Time');
    const prepAheadStr = parseKeyValue(intentBody, 'Prep Ahead');
    const effortStr = parseKeyValue(intentBody, 'Effort');

    recipe.intent = {
      feeds: feedsStr ? safeParseNumber(feedsStr) : 0,
      total_time_minutes: totalTimeStr ? parseDurationMinutes(totalTimeStr) : 0,
      active_time_minutes: activeTimeStr ? parseDurationMinutes(activeTimeStr) : 0,
      prep_ahead_notes: prepAheadStr && !/^no$/i.test(prepAheadStr.trim()) ? prepAheadStr : '',
      effort: effortStr ? effortStr.toLowerCase() : '',
    };
  }

  // Decision Lock Answers
  const dlBody = sections.get('Decision Lock Answers');
  if (dlBody) {
    const answers = parseDecisionLockAnswers(dlBody);
    if (answers.length > 0) {
      recipe.decisionLockAnswers = answers;
    }
  }

  // The Thinking
  const thinkingBody = sections.get('The Thinking');
  if (thinkingBody) {
    recipe.thinking = parseThinking(thinkingBody);
  } else {
    warnings.push('Missing "The Thinking" section');
  }

  // Flavour Architecture
  const flavourBody = sections.get('Flavour Architecture');
  if (flavourBody) {
    recipe.flavour = parseFlavour(flavourBody);
  } else {
    warnings.push('Missing "Flavour Architecture" section');
  }

  // Components
  const componentsBody = sections.get('Components');
  if (componentsBody) {
    recipe.components = parseComponents(componentsBody);
    if (recipe.components.length === 0) {
      warnings.push('Components section found but no components parsed');
    }
  } else {
    warnings.push('Missing "Components" section');
  }

  // Variations
  const variationsBody = sections.get('Variations');
  if (variationsBody) {
    recipe.variations = parseVariations(variationsBody);
  } else {
    warnings.push('Missing "Variations" section');
  }

  // Timeline
  const timelineBody = sections.get('Timeline');
  if (timelineBody) {
    recipe.timeline = parseTimeline(timelineBody);
    if (recipe.timeline.length === 0) {
      warnings.push('Timeline section found but no stages parsed');
    }
  } else {
    warnings.push('Missing "Timeline" section');
  }

  return { recipe, warnings };
}
