// =============================================================================
// MISE Display Renderers — Seven Modes from One Data Source
// =============================================================================
// All renderers are PURE FUNCTIONS over stored Recipe JSON — no API calls,
// no markdown storage. Same input always produces same output.
// Canadian English throughout (flavour, colour, favourite).
// Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 21.1–21.4
// =============================================================================

import type { Recipe, Component, Ingredient, ShoppingListView } from '@/lib/types/recipe';

// ---------------------------------------------------------------------------
// Store section categorisation for shopping list
// ---------------------------------------------------------------------------

const SECTION_PATTERNS: Array<{ section: string; patterns: RegExp }> = [
  { section: 'Butcher', patterns: /\b(beef|pork|lamb|chicken|turkey|duck|veal|sausage|bacon|prosciutto|pancetta|chorizo|steak|brisket|ribs|thigh|breast|drumstick|wing|mince|ground meat|fish|salmon|tuna|cod|shrimp|prawn|crab|lobster|mussel|clam|oyster|scallop|anchov|squid|octopus)\b/i },
  { section: 'Produce', patterns: /\b(onion|garlic|ginger|carrot|celery|potato|tomato|pepper|chili|chilli|jalapeño|lettuce|spinach|kale|arugula|cabbage|broccoli|cauliflower|zucchini|courgette|eggplant|aubergine|mushroom|corn|pea|bean|lentil|cucumber|radish|beet|turnip|parsnip|squash|pumpkin|sweet potato|leek|shallot|scallion|spring onion|avocado|lemon|lime|orange|apple|pear|berry|berries|strawberr|blueberr|raspberr|mango|banana|grape|peach|plum|cherry|fig|date|herb|parsley|cilantro|coriander|basil|mint|dill|thyme|rosemary|sage|oregano|chive|tarragon)\b/i },
  { section: 'Fridge', patterns: /\b(milk|cream|butter|cheese|yogurt|yoghurt|sour cream|crème fraîche|creme fraiche|egg|eggs|mozzarella|parmesan|cheddar|feta|ricotta|goat cheese|mascarpone|brie|camembert|gruyère|gruyere|tofu|tempeh)\b/i },
  { section: 'Spice', patterns: /\b(salt|pepper|cumin|coriander seed|paprika|turmeric|cinnamon|nutmeg|clove|cardamom|star anise|fennel seed|mustard seed|chili flake|chilli flake|red pepper flake|cayenne|saffron|sumac|za'atar|zaatar|garam masala|curry powder|five spice|allspice|bay leaf|bay leaves|dried oregano|dried thyme|dried basil|smoked paprika|black pepper|white pepper|szechuan|sichuan|peppercorn)\b/i },
  { section: 'Pantry', patterns: /.*/ }, // catch-all
];

function categoriseIngredient(name: string): string {
  for (const { section, patterns } of SECTION_PATTERNS) {
    if (section === 'Pantry') continue; // skip catch-all in loop
    if (patterns.test(name)) return section;
  }
  return 'Pantry';
}

// ---------------------------------------------------------------------------
// Helper: format ingredient line
// ---------------------------------------------------------------------------

function formatIngredientLine(ing: Ingredient): string {
  return `  - ${ing.amount} ${ing.unit} ${ing.name}${ing.prep ? ` (${ing.prep})` : ''}`;
}

// ---------------------------------------------------------------------------
// Helper: format component block
// ---------------------------------------------------------------------------

function formatComponentFull(comp: Component): string {
  const lines: string[] = [];
  lines.push(`### ${comp.name} (${comp.role})`);
  if (comp.can_prep_ahead) {
    lines.push(`_Prep ahead: ${comp.prep_ahead_notes}_`);
  }
  lines.push('');
  lines.push('**Ingredients:**');
  for (const ing of comp.ingredients) {
    const fn = ing.function ? ` — ${ing.function}` : '';
    lines.push(`  - ${ing.amount} ${ing.unit} ${ing.name}${ing.prep ? `, ${ing.prep}` : ''}${fn}`);
  }
  lines.push('');
  lines.push('**Steps:**');
  for (const step of comp.steps) {
    let line = `  ${step.stepNumber}. ${step.instruction}`;
    if (step.timing) line += ` (${step.timing})`;
    lines.push(line);
    if (step.techniqueReason) lines.push(`     _Why: ${step.techniqueReason}_`);
    if (step.seasoningNote) lines.push(`     _Seasoning: ${step.seasoningNote}_`);
  }
  if (comp.doneness_cues.length > 0) {
    lines.push('');
    lines.push('**Doneness cues:**');
    for (const cue of comp.doneness_cues) {
      lines.push(`  - ${cue}`);
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 1. renderFullRecipe — default view, all detail
// ---------------------------------------------------------------------------

export function renderFullRecipe(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.title}`);
  lines.push('');

  // Intent (defensive — may not exist on parsed recipes)
  if (recipe.intent?.occasion || recipe.intent?.mood) {
    lines.push(`**Occasion:** ${recipe.intent.occasion ?? ''} | **Mood:** ${recipe.intent.mood ?? ''} | **Effort:** ${recipe.intent.effort ?? ''} | **Time:** ${recipe.intent.time ?? 0} min`);
    if (recipe.intent.season?.length > 0) {
      lines.push(`**Season:** ${recipe.intent.season.join(', ')}`);
    }
    lines.push('');
  }

  // The Thinking
  if (recipe.thinking?.approach || recipe.thinking?.architecture || recipe.thinking?.pattern) {
    lines.push('## The Thinking');
    if (recipe.thinking.approach) lines.push(`**Approach:** ${recipe.thinking.approach}`);
    if (recipe.thinking.architecture) lines.push(`**Architecture:** ${recipe.thinking.architecture}`);
    if (recipe.thinking.pattern) lines.push(`**Pattern:** ${recipe.thinking.pattern}`);
    lines.push('');
  }

  // Decision Lock
  if (recipe.decision_lock_answers?.length) {
    lines.push('## Decision Lock');
    for (const dla of recipe.decision_lock_answers) {
      lines.push(`  - **Q:** ${dla.question}`);
      lines.push(`    **A:** ${dla.answer}`);
    }
    lines.push('');
  }

  // Flavour Architecture
  if (recipe.flavour?.profile || recipe.flavour?.dominant) {
    lines.push('## Flavour Architecture');
    if (recipe.flavour.profile?.length) lines.push(`**Profile:** ${recipe.flavour.profile.join(', ')}`);
    if (recipe.flavour.dominant) lines.push(`**Dominant:** ${recipe.flavour.dominant}`);
    if (recipe.flavour.balance) lines.push(`**Balance:** ${recipe.flavour.balance}`);
    lines.push('');
  }

  // Components
  lines.push('## Components');
  lines.push('');
  for (const comp of recipe.components) {
    lines.push(formatComponentFull(comp));
    lines.push('');
  }

  // Variations
  if ((recipe.variations?.dietary?.length > 0) || (recipe.variations?.pantry?.length > 0)) {
    lines.push('## Variations');
    for (const v of (recipe.variations.dietary ?? [])) {
      lines.push(`  - **${v.name}:** ${v.changes}`);
    }
    for (const v of (recipe.variations.pantry ?? [])) {
      lines.push(`  - **${v.name}:** ${v.changes}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. renderBrief — single-screen summary, compact
// ---------------------------------------------------------------------------

export function renderBrief(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.title}`);
  if (recipe.intent?.occasion) {
    lines.push(`${recipe.intent.occasion} · ${recipe.intent.mood ?? ''} · ${recipe.intent.time ?? 0} min · ${recipe.intent.effort ?? ''}`);
  }
  lines.push('');

  for (const comp of recipe.components) {
    lines.push(`**${comp.name}:** ${comp.ingredients.map((i) => `${i.amount}${i.unit} ${i.name}`).join(', ')}`);
    for (const step of comp.steps) {
      lines.push(`  ${step.stepNumber}. ${step.instruction}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 3. renderCookMode — one stage at a time with doneness cues
// ---------------------------------------------------------------------------

export function renderCookMode(recipe: Recipe, currentStage: number): string {
  const lines: string[] = [];
  const stageIndex = Math.max(0, Math.min(currentStage, recipe.components.length - 1));
  const comp = recipe.components[stageIndex];

  lines.push(`# ${recipe.title} — Cook Mode`);
  lines.push(`**Stage ${stageIndex + 1} of ${recipe.components.length}: ${comp.name}**`);
  lines.push('');

  lines.push('**Ingredients for this stage:**');
  for (const ing of comp.ingredients) {
    lines.push(formatIngredientLine(ing));
  }
  lines.push('');

  lines.push('**Steps:**');
  for (const step of comp.steps) {
    let line = `  ${step.stepNumber}. ${step.instruction}`;
    if (step.timing) line += ` (${step.timing})`;
    lines.push(line);
    if (step.seasoningNote) lines.push(`     _Seasoning: ${step.seasoningNote}_`);
  }
  lines.push('');

  if (comp.doneness_cues.length > 0) {
    lines.push('**Doneness cues — look for:**');
    for (const cue of comp.doneness_cues) {
      lines.push(`  ✓ ${cue}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 4. renderFlavourMap — flavour architecture only, NO amounts or method
// ---------------------------------------------------------------------------

export function renderFlavourMap(recipe: Recipe): string {
  const lines: string[] = [];
  const f = recipe.flavour;

  lines.push(`# ${recipe.title} — Flavour Map`);
  lines.push('');
  if (f?.profile?.length) lines.push(`**Profile:** ${f.profile.join(', ')}`);
  if (f?.dominant) lines.push(`**Dominant direction:** ${f.dominant}`);
  lines.push('');

  if (f?.acid?.length > 0) {
    lines.push('**Acid:**');
    for (const a of f.acid) lines.push(`  - ${a.source} — ${a.role}`);
  }
  if (f?.fat?.length > 0) {
    lines.push('**Fat:**');
    for (const ft of f.fat) lines.push(`  - ${ft.source} — ${ft.role}`);
  }
  if (f?.heat) lines.push(`**Heat:** ${f.heat.level} (${f.heat.source})`);
  if (f?.sweet) lines.push(`**Sweet:** ${f.sweet.level} (${f.sweet.source})`);
  lines.push('');

  if (f?.texture?.length > 0) {
    lines.push('**Texture contrasts:**');
    for (const t of f.texture) lines.push(`  - ${t.element} → ${t.contrast}`);
  }
  lines.push('');
  if (f?.balance) lines.push(`**Balance:** ${f.balance}`);

  return lines.join('\n');
}


// ---------------------------------------------------------------------------
// 5. renderShoppingList — grouped by store section, pantry check, Quality Highlight
// ---------------------------------------------------------------------------

export function renderShoppingList(recipe: Recipe, userPantry: string[]): ShoppingListView {
  // Normalise pantry items for case-insensitive matching
  const pantrySet = new Set(userPantry.map((p) => p.toLowerCase().trim()));

  // Aggregate ingredients across ALL components, dedup by name (sum quantities)
  const aggregated = new Map<string, { amount: number; unit: string }>();
  const allIngredients: Ingredient[] = [];

  for (const comp of recipe.components) {
    for (const ing of comp.ingredients) {
      allIngredients.push(ing);
      const key = ing.name.toLowerCase().trim();
      const existing = aggregated.get(key);
      if (existing) {
        existing.amount += ing.amount;
      } else {
        aggregated.set(key, { amount: ing.amount, unit: ing.unit });
      }
    }
  }

  // Group by store section
  const sectionMap = new Map<string, Array<{ name: string; amount: number; unit: string; checkStock: boolean }>>();

  for (const [key, { amount, unit }] of aggregated) {
    // Find original ingredient name (preserve casing from first occurrence)
    const originalIng = allIngredients.find((i) => i.name.toLowerCase().trim() === key);
    const displayName = originalIng?.name ?? key;
    const section = categoriseIngredient(displayName);
    const isPantry = pantrySet.has(key);

    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push({
      name: displayName,
      amount,
      unit,
      checkStock: isPantry,
    });
  }

  // Build sections array (sorted by section name)
  const sections = Array.from(sectionMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, items]) => ({ section, items }));

  // Already-have list
  const alreadyHave = Array.from(aggregated.keys())
    .filter((key) => pantrySet.has(key))
    .map((key) => {
      const orig = allIngredients.find((i) => i.name.toLowerCase().trim() === key);
      return orig?.name ?? key;
    });

  // Quality Highlight — find the ingredient whose function is most critical
  // to the dominant flavour direction and whose sourcing note suggests quality matters
  const theOneThingWorthGetting = deriveQualityHighlight(recipe, allIngredients);

  return {
    sections,
    alreadyHave,
    theOneThingWorthGetting: theOneThingWorthGetting,
  };
}

// ---------------------------------------------------------------------------
// Quality Highlight derivation
// ---------------------------------------------------------------------------

function deriveQualityHighlight(recipe: Recipe, allIngredients: Ingredient[]): string {
  const dominant = recipe.flavour.dominant.toLowerCase();

  // Score each ingredient by relevance to dominant flavour + sourcing quality signal
  let bestIngredient: Ingredient | null = null;
  let bestScore = -1;

  for (const ing of allIngredients) {
    let score = 0;
    const fn = ing.function.toLowerCase();
    const sourcing = ing.sourcing.toLowerCase();

    // Boost if function aligns with dominant direction
    if (dominant.includes('acid') && fn.includes('acid')) score += 3;
    if (dominant.includes('fat') && fn.includes('fat')) score += 3;
    if (dominant.includes('spice') && (fn.includes('spice') || fn.includes('heat'))) score += 3;
    if (dominant.includes('umami') && fn.includes('umami')) score += 3;

    // Boost if sourcing note suggests quality matters
    if (sourcing.includes('quality') || sourcing.includes('good') || sourcing.includes('best') || sourcing.includes('fresh') || sourcing.includes('matters')) {
      score += 2;
    }

    // Boost essential ingredients
    if (ing.essential) score += 1;

    // Boost if sourcing note is non-empty (author cared enough to write one)
    if (ing.sourcing.trim().length > 0) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestIngredient = ing;
    }
  }

  if (!bestIngredient || bestScore <= 0) {
    // Fallback: pick the first essential ingredient with a sourcing note
    bestIngredient = allIngredients.find((i) => i.essential && i.sourcing.trim().length > 0)
      ?? allIngredients[0];
  }

  if (!bestIngredient) {
    return 'Get the freshest ingredients you can find — quality always shows.';
  }

  const sourcingHint = bestIngredient.sourcing.trim();
  if (sourcingHint) {
    return `Spend the extra on the ${bestIngredient.name} — ${sourcingHint.charAt(0).toLowerCase()}${sourcingHint.slice(1)}`;
  }

  return `The ${bestIngredient.name} is doing the heavy lifting here — get the best you can find.`;
}

// ---------------------------------------------------------------------------
// 6. renderTimeline — working backward from serve time
// ---------------------------------------------------------------------------

export function renderTimeline(recipe: Recipe, serveTime: Date): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.title} — Timeline`);
  lines.push(`**Serve at:** ${serveTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('');

  // Build schedule working backward from serve time
  // Collect all stages from timeline + component prep-ahead info
  const timelineArr = Array.isArray(recipe.timeline) ? recipe.timeline : [];
  if (timelineArr.length === 0) {
    lines.push('No timeline data available.');
    return lines.join('\n');
  }

  const stages = timelineArr.map((stage) => ({
    name: stage.name,
    duration: stage.duration,
    parallel: stage.parallel,
    description: stage.description,
  }));

  // Calculate total sequential time
  let totalMinutes = 0;
  for (const stage of stages) {
    if (!stage.parallel) {
      totalMinutes += stage.duration;
    }
  }

  const startTime = new Date(serveTime.getTime() - totalMinutes * 60 * 1000);
  lines.push(`**Start at:** ${startTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`**Total time:** ${totalMinutes} min`);
  lines.push('');

  // Walk through stages
  let currentTime = new Date(startTime);
  const parallelTasks: string[] = [];

  for (const stage of stages) {
    const endTime = new Date(currentTime.getTime() + stage.duration * 60 * 1000);
    const timeStr = `${currentTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`;
    const endStr = `${endTime.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`;

    if (stage.parallel) {
      parallelTasks.push(`  ↳ [parallel] ${stage.name} (${stage.duration} min) — ${stage.description}`);
    } else {
      lines.push(`**${timeStr} → ${endStr}** | ${stage.name} (${stage.duration} min)`);
      lines.push(`  ${stage.description}`);
      // Flush any parallel tasks
      for (const pt of parallelTasks) {
        lines.push(pt);
      }
      parallelTasks.length = 0;
      currentTime = endTime;
    }
  }

  // Prep-ahead notes
  const prepAhead = recipe.components.filter((c) => c.can_prep_ahead);
  if (prepAhead.length > 0) {
    lines.push('');
    lines.push('**Prep ahead:**');
    for (const comp of prepAhead) {
      lines.push(`  - ${comp.name}: ${comp.prep_ahead_notes}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 7. renderRiff — intention and architecture only, NO amounts
// ---------------------------------------------------------------------------

export function renderRiff(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.title} — Riff`);
  lines.push('');

  // The Thinking
  if (recipe.thinking?.approach || recipe.thinking?.architecture || recipe.thinking?.pattern) {
    lines.push('## The Thinking');
    if (recipe.thinking.approach) lines.push(recipe.thinking.approach);
    if (recipe.thinking.architecture) lines.push(recipe.thinking.architecture);
    if (recipe.thinking.pattern) lines.push(recipe.thinking.pattern);
    lines.push('');
  }

  // Decision Lock — compact inline for riff mode
  if (recipe.decision_lock_answers?.length) {
    lines.push('**Constraint Decisions:**');
    for (const dla of recipe.decision_lock_answers) {
      lines.push(`  - ${dla.question} → ${dla.answer}`);
    }
    lines.push('');
  }

  // Flavour Map
  if (recipe.flavour?.profile || recipe.flavour?.dominant) {
    lines.push('## Flavour Architecture');
    if (recipe.flavour.profile?.length) lines.push(`**Profile:** ${recipe.flavour.profile.join(', ')}`);
    if (recipe.flavour.dominant) lines.push(`**Dominant:** ${recipe.flavour.dominant}`);
    if (recipe.flavour.balance) lines.push(`**Balance:** ${recipe.flavour.balance}`);
    lines.push('');
  }

  // Technique direction — components without amounts
  lines.push('## Technique Direction');
  for (const comp of recipe.components) {
    lines.push(`**${comp.name}** (${comp.role})`);
    lines.push(`  Ingredients: ${comp.ingredients.map((i) => i.name).join(', ')}`);
    for (const step of comp.steps) {
      lines.push(`  - ${step.instruction}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
