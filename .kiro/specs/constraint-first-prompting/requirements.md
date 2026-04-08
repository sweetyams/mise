# Requirements Document

## Introduction

The current MISE prompt architecture treats chef fingerprints as stylistic guidance injected into the system prompt. This causes the model to pattern-match to generic dish archetypes (e.g. "what a beef short rib braise looks like") and apply fingerprint elements as aesthetic garnishes rather than structural constraints. Two different chef fingerprints producing the same dish converge on the same underlying architecture because the strong training-data signal for the dish overrides the fingerprint.

This feature introduces a Decision Lock mechanism: a set of mandatory, fingerprint-derived questions the model must answer before generating any recipe. These answers become binding constraints that redirect the dish architecture away from generic patterns and toward the chef's actual decision-making logic. The Decision Lock is injected into the user message (not the system prompt) to force active reasoning. Additionally, the recipe detail UI is redesigned for a cleaner, more polished presentation.

## Glossary

- **Prompt_Assembler**: The module (`src/lib/prompt-assembler.ts`) that fetches and joins the 4 prompt layers into a system prompt and user message for the AI provider.
- **Decision_Lock**: A set of mandatory questions derived from a chef fingerprint's non-negotiables. The model must answer each question before generating the recipe, and the answers become binding constraints on the output.
- **Fingerprint**: A structured chef persona (`ChefProfile`) containing identity, techniques, ingredients, exemplars, voice, and negative constraints that shape recipe generation.
- **Decision_Lock_Template**: A stored template of questions specific to a fingerprint, derived from that fingerprint's non-negotiables and signature moves.
- **Non_Negotiables**: The subset of a fingerprint's identity core, techniques, and negative constraints that represent hard architectural decisions (e.g. acid architecture, fat decisions, texture contrasts) rather than stylistic preferences.
- **System_Core**: The base MISE prompt layer (`src/lib/system-core.ts`) containing output format rules and universal recipe requirements.
- **Chef_Brain**: The compiled user-preference prompt fragment (Layer 3) produced by the brain compiler.
- **Recipe_Detail_View**: The client component (`recipe-detail-client.tsx`) that renders a saved recipe with display modes, dev notes, tags, version history, and The Dial.
- **Display_Renderer**: Pure functions (`src/lib/display-renderers/index.ts`) that transform stored Recipe JSON into formatted markdown for each display mode.
- **Save_Recipe_API**: The API route (`src/app/api/save-recipe/route.ts`) that persists generated recipes to the Supabase `recipes` table.
- **Recipe_Parser**: A module that extracts structured Recipe JSON fields from the AI-generated markdown output.

## Requirements

### Requirement 1: Decision Lock Template Storage

**User Story:** As a system administrator, I want each chef fingerprint to have an associated Decision Lock template, so that the system can derive binding pre-generation questions for any fingerprint.

#### Acceptance Criteria

1. THE Fingerprint SHALL include a `decision_lock` field containing an ordered array of Decision_Lock questions, each with a `question` string and a `constraint_source` string referencing which non-negotiable it enforces.
2. WHEN a Fingerprint has no `decision_lock` field, THE Prompt_Assembler SHALL skip the Decision Lock step and assemble the prompt using the existing 4-layer architecture.
3. THE Decision_Lock_Template SHALL contain between 4 and 8 questions per fingerprint.
4. WHEN a Decision_Lock_Template is loaded, THE system SHALL validate that each question references a valid constraint_source present in the fingerprint's identity_core, techniques, negative_constraints, or ingredient_lexicon.

### Requirement 2: Decision Lock Assembly

**User Story:** As a recipe generation system, I want to prepend Decision Lock questions to the user message so that the model is forced to reason through chef-specific constraints before generating any recipe content.

#### Acceptance Criteria

1. WHEN a Fingerprint with a `decision_lock` field is active, THE Prompt_Assembler SHALL retrieve the Decision_Lock_Template for that fingerprint.
2. THE Prompt_Assembler SHALL insert the Decision Lock text into the user message, before the dish description, not into the system prompt.
3. THE Decision Lock text SHALL instruct the model to answer each question using the active fingerprint's non-negotiables before generating any recipe content.
4. THE Decision Lock text SHALL include an explicit instruction that the model's answers are binding and that the generated recipe must reflect every answer.
5. THE Decision Lock text SHALL include an explicit instruction that where the model's answers conflict with generic recipe conventions for the requested dish, the model's answers take precedence.
6. WHEN the Prompt_Assembler constructs the user message, THE Prompt_Assembler SHALL place the Decision Lock block first, followed by the dish description and request context.

### Requirement 3: Decision Lock Question Derivation

**User Story:** As a fingerprint author, I want Decision Lock questions to target specific architectural decisions (acid, fat, texture, technique, emotional register) so that the model cannot fall back to generic dish patterns.

#### Acceptance Criteria

1. THE Decision_Lock_Template SHALL include at least one question addressing the acid architecture for the dish.
2. THE Decision_Lock_Template SHALL include at least one question addressing the fat decision for the dish.
3. THE Decision_Lock_Template SHALL include at least one question addressing textural contrast.
4. THE Decision_Lock_Template SHALL include at least one question addressing the chef's signature technique or approach that distinguishes the dish from a generic version.
5. WHEN a Fingerprint's negative_constraints contain avoid items, THE Decision_Lock_Template SHALL include at least one question that forces the model to identify what conventional element it is replacing and with what.

### Requirement 4: Prompt Architecture Restructuring

**User Story:** As a developer, I want the prompt assembler to support the new 5-layer architecture (System Core + Fingerprint + Chef Brain + Decision Lock + Request Context) so that the Decision Lock is a distinct, auditable layer.

#### Acceptance Criteria

1. THE Prompt_Assembler SHALL treat the Decision Lock as a distinct prompt layer with its own text, version, and token count in the AssembledPrompt output.
2. THE Prompt_Assembler SHALL join layers 1 through 3 (System_Core, Fingerprint, Chef_Brain) and the complexity mode instruction as the system prompt.
3. THE Prompt_Assembler SHALL join the Decision Lock and the request context as the user message, with the Decision Lock preceding the request context.
4. THE PromptSnapshot SHALL capture the Decision Lock layer separately for reproducibility and debugging.
5. WHEN the Decision Lock layer is present, THE Prompt_Assembler SHALL log the Decision Lock token count alongside the existing fingerprint token count.

### Requirement 5: Decision Lock Enforcement in Output

**User Story:** As a user, I want the generated recipe to structurally reflect the Decision Lock answers so that two different fingerprints produce architecturally distinct recipes for the same dish.

#### Acceptance Criteria

1. THE Decision Lock text SHALL instruct the model to output its answers to the Decision Lock questions in a clearly delimited section before the recipe markdown.
2. WHEN the model outputs Decision Lock answers, THE system SHALL parse and store the answers alongside the recipe for auditability.
3. THE Decision Lock answers SHALL be accessible in the Recipe_Detail_View for user inspection.
4. IF the model fails to produce Decision Lock answers before the recipe content, THEN THE system SHALL log a warning and proceed with the recipe content as-is.

### Requirement 6: Fingerprint Cache Integration

**User Story:** As a developer, I want the fingerprint cache to include Decision Lock templates so that the Decision Lock is available without additional database queries during prompt assembly.

#### Acceptance Criteria

1. WHEN the fingerprint cache loads a fingerprint, THE cache SHALL include the `decision_lock` field from the `full_profile` JSONB column.
2. WHEN the fingerprint cache is invalidated for a fingerprint, THE cache SHALL also invalidate the associated Decision Lock data.
3. THE cached Decision Lock data SHALL be available to the Prompt_Assembler without a separate database query.

### Requirement 7: Recipe Output Parsing and Structured Storage

**User Story:** As a user, I want my generated recipes to be parsed from the AI markdown output into structured Recipe JSON and saved to the database, so that the recipe data is queryable, renderable in multiple display modes, and not stored as raw markdown.

#### Acceptance Criteria

1. WHEN the AI generation stream completes, THE system SHALL parse the full markdown output into the structured `Recipe` interface fields (intent, flavour, components with ingredients and steps, timeline, variations, thinking).
2. THE parser SHALL extract each Component's ingredients with amount, unit, name, preparation, function, and sourcing_note fields populated from the markdown.
3. THE parser SHALL extract each Component's steps with instruction, technique, timing, doneness_cues, technique_note, and seasoning information populated from the markdown.
4. THE parser SHALL extract the Flavour Architecture section into the structured `FlavourArchitecture` fields (dominant_element, acid, fat, heat, sweetness, umami, texture_contrasts, flavour_profile, balance_note, the_move).
5. THE parser SHALL extract The Thinking section into the structured `Thinking` fields (origin, architecture_logic, the_pattern, fingerprint_note).
6. WHEN Decision Lock answers are present in the AI output, THE parser SHALL extract and store them in the recipe's `decision_lock_answers` field.
7. IF the parser fails to extract a structured field, THE system SHALL store the raw value and log a warning rather than failing the entire save operation.
8. THE save-recipe API route SHALL persist the fully parsed structured Recipe JSON to the database, replacing the current behaviour of storing raw markdown in the `dev_notes` field with empty placeholder objects for structured fields.

### Requirement 8: Recipe Display from Structured Data

**User Story:** As a user, I want saved recipes to render from their structured JSON data using the display renderers, so that I see a polished, consistent presentation rather than raw markdown.

#### Acceptance Criteria

1. THE Recipe_Detail_View SHALL render saved recipes using the structured Recipe JSON fields via the display renderers, not by displaying raw markdown from the `dev_notes` field.
2. THE Recipe_Detail_View SHALL use the `DisplayModeSwitcher` component to allow switching between the seven display modes (Full, Brief, Cook Mode, Flavour Map, Shopping List, Timeline, Riff), each rendering from the same structured data.
3. WHEN a recipe has structured component data, THE Recipe_Detail_View SHALL render ingredients with amounts, units, names, and function annotations in a formatted list within each component.
4. WHEN a recipe has structured component data, THE Recipe_Detail_View SHALL render steps with numbered instructions, timing, technique reasons, and seasoning notes.
5. WHEN a recipe has no structured data (legacy recipes saved as raw markdown), THE Recipe_Detail_View SHALL fall back to rendering the raw markdown from `dev_notes`.

### Requirement 9: Recipe Detail UI Redesign

**User Story:** As a user, I want a cleaner, more polished recipe detail page so that the recipe presentation feels professional and is easier to read.

#### Acceptance Criteria

1. THE Recipe_Detail_View SHALL display the recipe title, subtitle, and fingerprint name in a visually distinct header section with clear typographic hierarchy.
2. THE Recipe_Detail_View SHALL present the Flavour Architecture section using a structured visual layout (cards or labelled fields) rather than raw markdown rendering.
3. THE Recipe_Detail_View SHALL render each Component as a visually separated card with the component name, role badge, ingredients list, and numbered steps.
4. THE Recipe_Detail_View SHALL display ingredient amounts, units, names, and function annotations in a consistent tabular or list format within each component card.
5. THE Recipe_Detail_View SHALL present The Thinking section (approach, architecture, pattern) in a distinct callout or panel above the components.
6. THE Recipe_Detail_View SHALL display the Timeline as a visual timeline or structured table rather than raw markdown.
7. WHEN Decision Lock answers are present on a recipe, THE Recipe_Detail_View SHALL display the Decision Lock answers in a collapsible panel within the recipe detail page.
8. THE Recipe_Detail_View SHALL maintain all existing functionality (display mode switching, dev notes, tags, cooked toggle, version history, The Dial, export, ingredient substitutions).

### Requirement 10: Display Renderer Updates

**User Story:** As a developer, I want the display renderers to support the Decision Lock answers section so that all seven display modes can optionally include the constraint reasoning.

#### Acceptance Criteria

1. WHEN a Recipe includes Decision Lock answers, THE renderFullRecipe function SHALL include a "Decision Lock" section after The Thinking section showing each question and its binding answer.
2. WHEN a Recipe includes Decision Lock answers, THE renderRiff function SHALL include the Decision Lock answers as part of the architecture overview.
3. THE renderBrief, renderCookMode, renderFlavourMap, renderShoppingList, and renderTimeline functions SHALL omit the Decision Lock answers to keep their output focused.

### Requirement 11: Type System Updates

**User Story:** As a developer, I want the TypeScript type definitions to reflect the Decision Lock data structures so that the feature is type-safe throughout the codebase.

#### Acceptance Criteria

1. THE `ChefProfile` interface SHALL include an optional `decision_lock` field typed as an array of `DecisionLockQuestion` objects, each containing `question: string` and `constraint_source: string`.
2. THE `Recipe` interface SHALL include an optional `decision_lock_answers` field typed as an array of objects, each containing `question: string` and `answer: string`.
3. THE `AssembledPrompt` interface SHALL include a `decisionLock` field in its `layers` object, typed as `PromptLayer`.
4. THE `PromptSnapshot` interface SHALL include a `decisionLock` field typed as `PromptLayer`.
