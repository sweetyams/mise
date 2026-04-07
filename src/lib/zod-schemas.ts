// =============================================================================
// MISE Zod Schemas — Recipe Validation
// =============================================================================
// Validates AI-generated Recipe JSON against the component-based data model.
// Used for structured generation validation with retry on failure.
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Flavour Architecture Schemas
// ---------------------------------------------------------------------------

export const AcidNoteSchema = z.object({
  source: z.string(),
  role: z.string(),
});

export const FatNoteSchema = z.object({
  source: z.string(),
  role: z.string(),
});

export const HeatNoteSchema = z.object({
  level: z.string(),
  source: z.string(),
});

export const SweetNoteSchema = z.object({
  level: z.string(),
  source: z.string(),
});

export const TextureContrastSchema = z.object({
  element: z.string(),
  contrast: z.string(),
});

// ---------------------------------------------------------------------------
// Variation & Scale Schemas
// ---------------------------------------------------------------------------

export const VariationSchema = z.object({
  name: z.string(),
  changes: z.string(),
});

export const ScaleNoteSchema = z.object({
  min: z.number(),
  max: z.number(),
  notes: z.string(),
});

// ---------------------------------------------------------------------------
// Taste Profile Schema
// ---------------------------------------------------------------------------

export const TasteProfileSchema = z.object({
  name: z.string(),
  adjustments: z.array(
    z.object({
      componentName: z.string(),
      ingredientChanges: z.array(
        z.object({
          name: z.string(),
          amount: z.number(),
          unit: z.string(),
          action: z.enum(['add', 'replace', 'remove']),
        })
      ),
      techniqueChanges: z.array(z.string()),
    })
  ),
});

// ---------------------------------------------------------------------------
// Timeline Schema
// ---------------------------------------------------------------------------

export const TimelineStageSchema = z.object({
  name: z.string(),
  duration: z.number(),
  parallel: z.boolean(),
  description: z.string(),
});

// ---------------------------------------------------------------------------
// Substitution Schema
// ---------------------------------------------------------------------------

export const SubstitutionSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  notes: z.string(),
});

// ---------------------------------------------------------------------------
// Ingredient Schema
// ---------------------------------------------------------------------------

export const IngredientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  substitutions: z.object({
    common: z.array(SubstitutionSchema),
    dietary: z.array(SubstitutionSchema),
    pantry: z.array(SubstitutionSchema),
    flavour_shift: z.array(SubstitutionSchema),
  }),
  sourcing: z.string(),
  prep: z.string(),
  function: z.string(),
  essential: z.boolean(),
});

// ---------------------------------------------------------------------------
// Step Schema
// ---------------------------------------------------------------------------

export const StepSchema = z.object({
  stepNumber: z.number(),
  instruction: z.string(),
  timing: z.string().nullable(),
  techniqueReason: z.string().nullable(),
  seasoningNote: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Component Schema
// ---------------------------------------------------------------------------

export const ComponentSchema = z.object({
  name: z.string(),
  role: z.string(),
  can_prep_ahead: z.boolean(),
  prep_ahead_notes: z.string(),
  ingredients: z.array(IngredientSchema).min(1),
  steps: z.array(StepSchema).min(1),
  doneness_cues: z.array(z.string()).min(1),
});

// ---------------------------------------------------------------------------
// Intent Schema
// ---------------------------------------------------------------------------

export const IntentSchema = z.object({
  occasion: z.string(),
  mood: z.string(),
  season: z.array(z.string()),
  time: z.number(),
  effort: z.enum(['low', 'medium', 'high', 'project']),
});

// ---------------------------------------------------------------------------
// Flavour Schema
// ---------------------------------------------------------------------------

export const FlavourSchema = z.object({
  profile: z.array(z.string()),
  dominant: z.string(),
  acid: z.array(AcidNoteSchema),
  fat: z.array(FatNoteSchema),
  heat: HeatNoteSchema,
  sweet: SweetNoteSchema,
  texture: z.array(TextureContrastSchema),
  balance: z.string(),
});

// ---------------------------------------------------------------------------
// Thinking Schema
// ---------------------------------------------------------------------------

export const ThinkingSchema = z.object({
  approach: z.string(),
  architecture: z.string(),
  pattern: z.string(),
});

// ---------------------------------------------------------------------------
// Related Schema
// ---------------------------------------------------------------------------

export const RelatedSchema = z.object({
  sub_recipes: z.array(z.string()),
  pairs_with: z.array(z.string()),
  next_level: z.string(),
});

// ---------------------------------------------------------------------------
// Variations Schema
// ---------------------------------------------------------------------------

export const VariationsSchema = z.object({
  dietary: z.array(VariationSchema),
  pantry: z.array(VariationSchema),
  scale: ScaleNoteSchema,
  profiles: z.array(TasteProfileSchema),
});

// ---------------------------------------------------------------------------
// Prompt Layer & Snapshot Schemas
// ---------------------------------------------------------------------------

export const PromptLayerSchema = z.object({
  text: z.string(),
  version: z.number(),
  tokenCount: z.number(),
});

export const PromptSnapshotSchema = z.object({
  systemCore: PromptLayerSchema,
  fingerprint: PromptLayerSchema.extend({
    fingerprintId: z.string(),
    fingerprintName: z.string(),
  }),
  chefBrain: PromptLayerSchema.extend({
    userId: z.string(),
  }),
  requestContext: PromptLayerSchema,
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  estimatedCost: z.number(),
  assembledAt: z.string(),
});

// ---------------------------------------------------------------------------
// Recipe Schema — the full validation schema
// ---------------------------------------------------------------------------

export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  fingerprint: z.string(),
  version: z.number(),

  intent: IntentSchema,
  flavour: FlavourSchema,
  components: z.array(ComponentSchema).min(1),
  timeline: z.array(TimelineStageSchema),
  variations: VariationsSchema,
  related: RelatedSchema,
  thinking: ThinkingSchema,

  promptSnapshot: PromptSnapshotSchema,
  complexityMode: z.enum(['foundation', 'kitchen', 'riff']),
  cooked: z.boolean(),
  devNotes: z.string().nullable(),
  tags: z.array(z.string()),
  isPublic: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// validateRecipe — validates unknown data against the Recipe schema
// ---------------------------------------------------------------------------

export function validateRecipe(data: unknown): { valid: boolean; errors: string[] } {
  const result = RecipeSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { valid: false, errors };
}
