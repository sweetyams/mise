# Requirements Document

## Introduction

The Recipe Card feature transforms a generated MISE recipe into a simplified, cookbook-style page. Users explicitly trigger this transformation via an "Add to Cookbook" action on the recipe detail page. The recipe card is stored as a separate entity in the database, decoupled from the recipe row and its version history. The AI provider generates the card by applying a strict cookbook-format transformation prompt to the structured recipe data.

## Glossary

- **Recipe_Card**: A simplified, cookbook-style representation of a Recipe, stored as a separate database record linked to a Recipe by foreign key.
- **Recipe**: The full structured recipe data model containing components, ingredients, steps, thinking, flavour architecture, variations, relationships, timeline, and scaling.
- **Cookbook_Format**: A strict output format consisting of six ordered blocks: Page Metadata, Title, Headnote, Ingredient List, Method Steps, and Plating/Serving.
- **Transformation_Prompt**: The system prompt sent to the AI provider that instructs it to convert structured Recipe data into Cookbook_Format, specifying what to strip, preserve, and how to voice each block.
- **AI_Provider**: The service interface that handles AI model interactions, supporting both streaming and non-streaming generation methods.
- **Recipe_Detail_Page**: The client-side page at `/library/[id]` that displays a recipe in editorial layout with side panel controls.
- **The_Dial**: The recipe evolution feature that creates new recipe versions by adjusting flavour directions. Dial-created versions do not auto-regenerate a Recipe_Card.
- **Headnote**: A 2–4 sentence prose block in the Cookbook_Format covering technique hook, flavour logic, make-ahead note, and optional variation in a warm-but-precise chef tone.
- **Doneness_Cue**: A sensory indicator (visual, smell, sound, texture, taste) attached to a recipe step that signals completion of a cooking action.

## Requirements

### Requirement 1: Add to Cookbook Action

**User Story:** As a user viewing a recipe, I want to explicitly trigger recipe card generation via an "Add to Cookbook" action, so that I control when a cookbook-style card is created.

#### Acceptance Criteria

1. WHEN the user activates the "Add to Cookbook" action on the Recipe_Detail_Page, THE System SHALL send the structured Recipe data to the AI_Provider with the Transformation_Prompt to generate a Recipe_Card.
2. WHILE the Recipe_Card generation is in progress, THE Recipe_Detail_Page SHALL display a loading indicator on the "Add to Cookbook" action.
3. WHEN the Recipe_Card generation completes successfully, THE System SHALL store the Recipe_Card as a separate record in the database linked to the source Recipe by foreign key.
4. IF the AI_Provider returns an error during Recipe_Card generation, THEN THE System SHALL display an error message to the user and allow the user to retry the action.

### Requirement 2: Recipe Card Storage

**User Story:** As a system operator, I want recipe cards stored separately from recipe rows, so that recipe data and cookbook cards have independent lifecycles.

#### Acceptance Criteria

1. THE System SHALL store each Recipe_Card in a dedicated `recipe_cards` database table, separate from the `recipes` table.
2. THE `recipe_cards` table SHALL contain a foreign key reference to the source Recipe's `id`.
3. THE `recipe_cards` table SHALL contain the user's `id` as a foreign key for ownership.
4. THE System SHALL store the full Cookbook_Format output as a structured field on the Recipe_Card record.
5. THE System SHALL store a `created_at` timestamp and an `updated_at` timestamp on each Recipe_Card record.
6. THE System SHALL store a reference to the Recipe version number used to generate the Recipe_Card.

### Requirement 3: Recipe Card Does Not Auto-Regenerate

**User Story:** As a user, I want my cookbook card to remain stable when I create new recipe versions via The_Dial, so that my curated cookbook page is not overwritten without my consent.

#### Acceptance Criteria

1. WHEN a new version of a Recipe is created via The_Dial, THE System SHALL retain the existing Recipe_Card without modification.
2. WHEN the user views a Recipe that has an existing Recipe_Card and a newer Recipe version, THE Recipe_Detail_Page SHALL indicate that the Recipe_Card was generated from an earlier version.
3. WHEN the user activates the "Add to Cookbook" action on a Recipe that already has a Recipe_Card, THE System SHALL regenerate the Recipe_Card using the current Recipe data and replace the previous Recipe_Card content.

### Requirement 4: Transformation Prompt — Cookbook Format Blocks

**User Story:** As a user, I want the recipe card to follow a strict cookbook-page format, so that the output reads like a professional cookbook entry.

#### Acceptance Criteria

1. THE Transformation_Prompt SHALL instruct the AI_Provider to produce output containing exactly six ordered blocks: Page Metadata, Title, Headnote, Ingredient List, Method Steps, and Plating/Serving.
2. THE Page Metadata block SHALL contain a section tag formatted as `CATEGORY: CONCEPT`, a serves line, and a context line derived from the Recipe intent data.
3. THE Title block SHALL render the recipe title in ALL CAPS followed by a horizontal rule.
4. THE Headnote block SHALL contain 2–4 sentences of flowing prose covering technique hook, flavour logic, make-ahead note, and optional variation condensed from the Recipe variations data.
5. THE Headnote block SHALL use a warm-but-precise, confident chef tone and exclude blogger-style language.
6. THE Ingredient List block SHALL render ingredients in a single column with bold ingredient names, metric-first quantities with imperial in parentheses, and preparation annotations stripped of rationale.
7. THE Method Steps block SHALL render numbered steps covering logical cooking phases consolidated from individual Recipe steps, with each step containing 2–5 sentences.
8. WHEN a Method Step contains a timed action, THE Transformation_Prompt SHALL require a Doneness_Cue paired with that timed action.
9. WHEN a Method Step involves a critical failure point, THE Transformation_Prompt SHALL require an inline warning for that failure point.
10. THE Plating/Serving block SHALL contain serving geometry and accompaniment suggestions derived from the Recipe relationships `pairs_with` data.

### Requirement 5: Transformation Prompt — Data Stripping and Preservation

**User Story:** As a user, I want the recipe card to omit development-oriented sections while preserving all essential cooking information, so that the card is clean and actionable.

#### Acceptance Criteria

1. THE Transformation_Prompt SHALL instruct the AI_Provider to strip the following sections from the output: Thinking, Flavour Architecture, Why annotations, Timeline table, Scale Notes, Effort metadata, and Variations (except useful content condensed into the Headnote).
2. THE Transformation_Prompt SHALL instruct the AI_Provider to preserve the following data in the output: every ingredient with its quantity, every method step (consolidated into logical phases), all Doneness_Cues, make-ahead timing, Pairs With data, and preparation instructions.

### Requirement 6: Recipe Card Display

**User Story:** As a user, I want to view my generated recipe card on the recipe detail page, so that I can read the cookbook-style version alongside the full recipe.

#### Acceptance Criteria

1. WHEN a Recipe has an associated Recipe_Card, THE Recipe_Detail_Page SHALL provide a way to view the Recipe_Card content.
2. WHEN a Recipe does not have an associated Recipe_Card, THE Recipe_Detail_Page SHALL display the "Add to Cookbook" action without any Recipe_Card content.
3. THE Recipe_Detail_Page SHALL render the Recipe_Card content preserving the Cookbook_Format structure including all six blocks.

### Requirement 7: AI Provider Integration

**User Story:** As a developer, I want the AI provider interface extended to support recipe card generation, so that the transformation uses the established provider pattern.

#### Acceptance Criteria

1. THE AI_Provider interface SHALL include a `generateRecipeCard` method that accepts structured Recipe data and the Transformation_Prompt and returns the generated Cookbook_Format content.
2. THE `generateRecipeCard` method SHALL return a non-streaming response containing the complete Recipe_Card content.
3. IF the AI_Provider encounters an error during `generateRecipeCard`, THEN THE AI_Provider SHALL return a structured error with an error code, message, and retryable flag consistent with the existing AIProviderError type.
