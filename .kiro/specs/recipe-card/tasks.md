# Implementation Plan: Recipe Card

## Overview

Transform a full MISE recipe into a simplified cookbook-style card via AI. Implementation follows the existing patterns: TypeScript interfaces, Zod validation, AIProvider interface extension, server actions with `ActionResult<T>`, and editorial-styled UI in the recipe detail page.

## Tasks

- [x] 1. Define types and validation schemas
  - [x] 1.1 Create `src/lib/types/recipe-card.ts` with `CookbookFormat`, `CookbookIngredient`, `CookbookStep`, and `RecipeCard` interfaces
    - Match the interface definitions from the design document exactly
    - _Requirements: 2.4, 4.1_

  - [x] 1.2 Add Zod validation schemas to `src/lib/zod-schemas.ts`: `CookbookIngredientSchema`, `CookbookStepSchema`, `CookbookFormatSchema`
    - Follow existing schema patterns in the file (e.g. `IngredientSchema`, `StepSchema`)
    - `CookbookFormatSchema` validates all six blocks: metadata, title, headnote, ingredients, method, plating
    - _Requirements: 2.4, 4.1, 4.6, 4.7_

  - [ ]* 1.3 Write property test: CookbookFormat storage round-trip (Property 1)
    - **Property 1: CookbookFormat storage round-trip**
    - Generate arbitrary `CookbookFormat` objects via `fast-check`, serialize to JSON, parse back with `CookbookFormatSchema`, assert deep equality
    - **Validates: Requirements 2.4**

  - [ ]* 1.4 Write property test: Method steps are sequentially numbered (Property 4)
    - **Property 4: Method steps are sequentially numbered**
    - Generate arrays of `CookbookStep` with random content, assert `method[i].number === i + 1` for all `i`
    - **Validates: Requirements 4.7**

- [x] 2. Create transformation prompt module
  - [x] 2.1 Create `src/lib/recipe-card-prompt.ts` with `RECIPE_CARD_SYSTEM_PROMPT` constant and `buildRecipeCardPrompt(recipeJson: string)` function
    - System prompt contains the full transformation instructions: six-block cookbook format, stripping rules (Thinking, Flavour Architecture, Why annotations, Timeline table, Scale Notes, Effort metadata, Variations), preservation rules (all ingredients, all method steps consolidated, doneness cues, make-ahead timing, pairs_with, prep instructions)
    - `buildRecipeCardPrompt` returns `{ systemPrompt: string; userMessage: string }`
    - The user message contains the serialized recipe JSON
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 5.1, 5.2_

  - [ ]* 2.2 Write unit tests for `buildRecipeCardPrompt`
    - Verify system prompt contains instructions for all six blocks
    - Verify user message contains the serialized recipe JSON
    - Verify stripping and preservation rules are present in the prompt
    - _Requirements: 4.1, 5.1, 5.2_

- [x] 3. Extend AI provider with `generateRecipeCard`
  - [x] 3.1 Add `generateRecipeCard(recipeData: string, transformationPrompt: string): Promise<string>` to the `AIProvider` interface in `src/lib/ai-provider/types.ts`
    - Non-streaming method that returns the complete JSON string
    - _Requirements: 7.1, 7.2_

  - [x] 3.2 Implement `generateRecipeCard` in `src/lib/ai-provider/claude-provider.ts`
    - Use `this.client.messages.create` (non-streaming), similar to `compileBrain` pattern
    - Use the generation model (Sonnet), not Haiku
    - Map errors using existing `mapError` helper, consistent with `AIProviderError` type
    - Extract text from response content blocks
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement server actions
  - [x] 5.1 Add `generateAndSaveRecipeCard(recipeId: string): Promise<ActionResult<RecipeCard>>` to `src/app/(studio)/library/actions.ts`
    - Authenticate user via `createClient()`
    - Fetch recipe from `recipes` table
    - Serialize recipe data, call `buildRecipeCardPrompt`, then `provider.generateRecipeCard()`
    - Parse response with `CookbookFormatSchema` (Zod validation)
    - Upsert into `recipe_cards` using `ON CONFLICT (recipe_id) DO UPDATE`
    - Store `recipe_version` from the current recipe's version field
    - Return the stored `RecipeCard`
    - Handle errors: auth, recipe not found, AI errors, validation errors, DB errors
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.3_

  - [x] 5.2 Add `getRecipeCard(recipeId: string): Promise<ActionResult<RecipeCard | null>>` to `src/app/(studio)/library/actions.ts`
    - Authenticate user via `createClient()`
    - Query `recipe_cards` by `recipe_id`
    - Return `null` if no card exists
    - _Requirements: 6.1, 6.2_

- [x] 6. Build UI in recipe detail page
  - [x] 6.1 Add "Add to Cookbook" button to the side panel in `src/app/(studio)/library/[id]/recipe-detail-client.tsx`
    - Place in side panel alongside existing actions (Export, The Dial)
    - Use editorial inline styles with `--ed-*` CSS custom properties, matching existing button patterns
    - Disable button when recipe has no structured data (empty components)
    - _Requirements: 1.1, 1.2_

  - [x] 6.2 Add loading, error, and retry states for recipe card generation
    - Show loading indicator on the button while generation is in progress
    - Display error message on failure with retry capability
    - _Requirements: 1.2, 1.4_

  - [x] 6.3 Add recipe card display section to render `CookbookFormat` content
    - Render all six blocks: page metadata (section tag, serves, context), title (ALL CAPS), headnote, ingredient list (bold names, metric-first quantities), method steps (numbered), plating/serving
    - Use editorial styling consistent with the rest of the page
    - _Requirements: 6.1, 6.3_

  - [x] 6.4 Add version mismatch indicator
    - Compare `card.recipe_version` with current `recipe.version`
    - Show indicator when card was generated from an older version
    - Allow user to regenerate from the indicator
    - _Requirements: 3.1, 3.2_

  - [ ]* 6.5 Write property test: Rendered card output contains all six blocks (Property 5)
    - **Property 5: Rendered card output contains all six blocks**
    - Generate arbitrary valid `CookbookFormat` objects, verify rendered output contains elements for metadata, title, headnote, ingredients, method, plating
    - **Validates: Requirements 6.3**

- [x] 7. Fetch and display existing card on page load
  - [x] 7.1 Wire `getRecipeCard` into the recipe detail page data flow
    - Call `getRecipeCard` on page load (server component or client effect)
    - Pass existing card data to the client component
    - Show card display if card exists, show "Add to Cookbook" button if not
    - _Requirements: 6.1, 6.2_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The `recipe_cards` table must be created in Supabase before running server actions (SQL migration not included as a coding task — handle via Supabase dashboard or migration tool)
