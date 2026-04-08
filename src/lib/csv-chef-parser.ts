// =============================================================================
// MISE CSV Chef Profile Parser
// =============================================================================
// Parses a CSV file into a chef profile structure for import.
// CSV format: section, key, value
// =============================================================================

import type {
  ChefProfile,
  TechniqueSection,
  IngredientSection,
  DishExemplar,
  SeasonalFilter,
} from '@/lib/types/fingerprint-profile';
import type { DecisionLockQuestion } from '@/lib/types/recipe';

interface ParsedChef {
  name: string;
  slug: string;
  prompt_text: string;
  full_profile: ChefProfile;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseChefCSV(csvText: string): ParsedChef {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  // Skip header row
  const dataLines = lines.slice(1).map(parseCSVLine);

  let name = '';
  let slug = '';
  let prompt_text = '';

  const profile: ChefProfile = {
    identity_core: { philosophy: '', personality: '', signature_moves: '' },
    negative_constraints: { avoid: [] },
    techniques: [],
    ingredient_lexicon: [],
    dish_exemplars: [],
    voice: { writing_style: '', tone: '', vocabulary: '', formatting: '' },
    seasonal_filters: [],
    decision_lock: [],
  };

  // Temp accumulators for grouped rows
  let currentTechnique: Partial<TechniqueSection> = {};
  let currentIngredient: Partial<IngredientSection> = {};
  let currentExemplar: Partial<DishExemplar> = {};
  let currentExemplarDecisions: Record<string, string> = {};
  let currentSeasonal: Partial<SeasonalFilter> = {};
  let currentSeasonalSwapIn: string[] = [];
  let currentSeasonalSwapOut: string[] = [];
  let pendingDLQuestion: string | null = null;

  function flushTechnique() {
    if (currentTechnique.name) {
      profile.techniques.push({
        name: currentTechnique.name,
        approach: currentTechnique.approach ?? '',
        signature_details: currentTechnique.signature_details ?? '',
      });
    }
    currentTechnique = {};
  }

  function flushIngredient() {
    if (currentIngredient.category) {
      profile.ingredient_lexicon.push({
        category: currentIngredient.category,
        perspective: currentIngredient.perspective ?? '',
        pairings: currentIngredient.pairings ?? '',
        rules: currentIngredient.rules ?? '',
      });
    }
    currentIngredient = {};
  }

  function flushExemplar() {
    if (currentExemplar.dish) {
      profile.dish_exemplars.push({
        dish: currentExemplar.dish,
        key_decisions: { ...currentExemplarDecisions },
        the_move: currentExemplar.the_move ?? '',
      });
    }
    currentExemplar = {};
    currentExemplarDecisions = {};
  }

  function flushSeasonal() {
    if (currentSeasonal.season) {
      profile.seasonal_filters.push({
        season: currentSeasonal.season,
        region: currentSeasonal.region ?? '',
        adjust: {
          swap_in: [...currentSeasonalSwapIn],
          swap_out: [...currentSeasonalSwapOut],
          preserve_fingerprint: true,
        },
      });
    }
    currentSeasonal = {};
    currentSeasonalSwapIn = [];
    currentSeasonalSwapOut = [];
  }

  for (const [section, key, value] of dataLines) {
    if (!section || !key) continue;
    const v = value ?? '';

    switch (section) {
      case 'meta':
        if (key === 'name') name = v;
        else if (key === 'slug') slug = v;
        else if (key === 'prompt_text') prompt_text = v;
        break;

      case 'identity_core':
        if (key === 'philosophy') profile.identity_core.philosophy = v;
        else if (key === 'personality') profile.identity_core.personality = v;
        else if (key === 'signature_moves') profile.identity_core.signature_moves = v;
        break;

      case 'negative':
        if (key === 'avoid' && v) profile.negative_constraints.avoid.push(v);
        break;

      case 'technique':
        if (key === 'name') { flushTechnique(); currentTechnique.name = v; }
        else if (key === 'approach') currentTechnique.approach = v;
        else if (key === 'signature_details') currentTechnique.signature_details = v;
        break;

      case 'ingredient':
        if (key === 'category') { flushIngredient(); currentIngredient.category = v; }
        else if (key === 'perspective') currentIngredient.perspective = v;
        else if (key === 'pairings') currentIngredient.pairings = v;
        else if (key === 'rules') currentIngredient.rules = v;
        break;

      case 'exemplar':
        if (key === 'dish') { flushExemplar(); currentExemplar.dish = v; }
        else if (key === 'the_move') currentExemplar.the_move = v;
        else currentExemplarDecisions[key] = v;
        break;

      case 'voice':
        if (key === 'writing_style') profile.voice.writing_style = v;
        else if (key === 'tone') profile.voice.tone = v;
        else if (key === 'vocabulary') profile.voice.vocabulary = v;
        else if (key === 'formatting') profile.voice.formatting = v;
        break;

      case 'seasonal':
        if (key === 'season') { flushSeasonal(); currentSeasonal.season = v; }
        else if (key === 'region') currentSeasonal.region = v;
        else if (key === 'swap_in') currentSeasonalSwapIn = v.split(',').map((s) => s.trim()).filter(Boolean);
        else if (key === 'swap_out') currentSeasonalSwapOut = v.split(',').map((s) => s.trim()).filter(Boolean);
        break;

      case 'decision_lock':
        if (key === 'question') {
          pendingDLQuestion = v;
        } else if (key === 'constraint_source' && pendingDLQuestion !== null) {
          profile.decision_lock!.push({ question: pendingDLQuestion, constraint_source: v });
          pendingDLQuestion = null;
        }
        break;
    }
  }

  // Flush remaining
  flushTechnique();
  flushIngredient();
  flushExemplar();
  flushSeasonal();

  return { name, slug, prompt_text, full_profile: profile };
}

// ---------------------------------------------------------------------------
// Export a chef profile to CSV
// ---------------------------------------------------------------------------

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportChefCSV(
  name: string,
  slug: string,
  prompt_text: string,
  profile: ChefProfile
): string {
  const rows: string[][] = [['section', 'key', 'value']];

  rows.push(['meta', 'name', name]);
  rows.push(['meta', 'slug', slug]);
  rows.push(['meta', 'prompt_text', prompt_text]);

  rows.push(['identity_core', 'philosophy', profile.identity_core.philosophy]);
  rows.push(['identity_core', 'personality', profile.identity_core.personality]);
  rows.push(['identity_core', 'signature_moves', profile.identity_core.signature_moves]);

  for (const a of profile.negative_constraints.avoid) {
    rows.push(['negative', 'avoid', a]);
  }

  for (const t of profile.techniques) {
    rows.push(['technique', 'name', t.name]);
    rows.push(['technique', 'approach', t.approach]);
    rows.push(['technique', 'signature_details', t.signature_details]);
  }

  for (const ing of profile.ingredient_lexicon) {
    rows.push(['ingredient', 'category', ing.category]);
    rows.push(['ingredient', 'perspective', ing.perspective]);
    rows.push(['ingredient', 'pairings', ing.pairings]);
    rows.push(['ingredient', 'rules', ing.rules]);
  }

  for (const ex of profile.dish_exemplars) {
    rows.push(['exemplar', 'dish', ex.dish]);
    for (const [k, v] of Object.entries(ex.key_decisions)) {
      if (v) rows.push(['exemplar', k, v]);
    }
    rows.push(['exemplar', 'the_move', ex.the_move]);
  }

  rows.push(['voice', 'writing_style', profile.voice.writing_style]);
  rows.push(['voice', 'tone', profile.voice.tone]);
  rows.push(['voice', 'vocabulary', profile.voice.vocabulary]);
  rows.push(['voice', 'formatting', profile.voice.formatting]);

  for (const sf of profile.seasonal_filters) {
    rows.push(['seasonal', 'season', sf.season]);
    rows.push(['seasonal', 'region', sf.region]);
    rows.push(['seasonal', 'swap_in', sf.adjust.swap_in.join(', ')]);
    rows.push(['seasonal', 'swap_out', sf.adjust.swap_out.join(', ')]);
  }

  if (profile.decision_lock) {
    for (const dl of profile.decision_lock) {
      rows.push(['decision_lock', 'question', dl.question]);
      rows.push(['decision_lock', 'constraint_source', dl.constraint_source]);
    }
  }

  return rows.map((r) => r.map(escapeCSV).join(',')).join('\n');
}
