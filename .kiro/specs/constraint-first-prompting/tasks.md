# Implementation Plan: Constraint-First Prompting

## Overview

Introduces Decision Lock mechanism into the MISE prompt architecture, adds a client-side recipe markdown parser, restructures the prompt assembler to 5 layers, redesigns the recipe detail UI with structured data rendering, and updates all downstream modules (types, schemas, renderers, export, CSV, dial, save flow).

## Tasks

- [x] 1. Type system and schema foundation
  - [x] 1.1 Add DecisionLockQuestion and DecisionLockAnswer types to `src/lib/types/recipe.ts`
    - Add `DecisionLockQuestion` interface with `question: string` and `constraint_source: string`
    - Add optional `decision_lock_answers` field (array of `{ question: string; answer: string }`) to the `Recipe` interface
    - Add `decisionLock: PromptLayer` to `AssembledPrompt.layers`
    - Add `decisionLock: PromptLayer` to `PromptSnapshot`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 1.2 Add optional `decision_lock` field to `ChefProfile` in `src/lib/types/fingerprint-profile.ts`
    - Type as `DecisionLockQuestion[]` (imported from recipe types)
    - _Requirements: 1.1_

  - [x] 1.3 Update Zod schemas in `src/lib/zod-schemas.ts`
    - Add `DecisionLockQuestionSchema` (question + constraint_source)
    - Add `DecisionLockAnswerSchema` (question + answer)
    - Add optional `decision_lock_answers` to `RecipeSchema`
    - Add optional `decisionLock` layer to `PromptSnapshotSchema`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 1.4 Write unit tests for updated Zod schemas
    - Test DecisionLockQuestionSchema validation
    - Test DecisionLockAnswerSchema validation
    - Test RecipeSchema with and without decision_lock_answers
    - Test PromptSnapshotSchema with and without decisionLock layer
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 2. Decision Lock assembler module
  - [x] 2.1 Create `src/lib/decision-lock-assembler.ts`
    - Export `assembleDecisionLock(questions, dishDescription)` pure function
    - Return `{ text, questionCount, tokenEstimate }` — empty result when no questions
    - Format text with DECISION LOCK header, binding instruction, precedence instruction, numbered questions, and closing instruction
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.2 Write unit tests for decision-lock-assembler
    - Test assembleDecisionLock with valid questions array
    - Test assembleDecisionLock with undefined/empty questions (returns empty)
    - Test that output text contains binding and precedence instructions
    - Test token estimate is reasonable
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. Prompt assembler restructuring to 5-layer architecture
  - [x] 3.1 Update `assemblePrompt()` in `src/lib/prompt-assembler.ts`
    - Import and call `assembleDecisionLock()` with fingerprint's `decision_lock` and dish description
    - Add `decisionLock: PromptLayer` to the returned `layers` object
    - Place Decision Lock text before request context in the user message
    - Log Decision Lock token count alongside fingerprint token count
    - Skip Decision Lock when fingerprint has no `decision_lock` field (empty layer)
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 2.1, 2.2, 2.6, 6.1, 6.2, 6.3_

  - [x] 3.2 Update `buildPromptSnapshot()` in `src/lib/prompt-assembler.ts`
    - Include `decisionLock` layer in the snapshot
    - Update total input token calculation to include Decision Lock tokens
    - _Requirements: 4.4_

  - [ ]* 3.3 Write unit tests for updated prompt assembler
    - Test that assemblePrompt returns 5-layer structure with decisionLock
    - Test that user message contains Decision Lock text before request context
    - Test that buildPromptSnapshot includes decisionLock layer
    - Test fallback when fingerprint has no decision_lock (empty layer)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. System core output format update
  - [x] 5.1 Update `SYSTEM_CORE_TEXT` in `src/lib/system-core.ts`
    - Add `## Decision Lock Answers` section placeholder to the output format instructions
    - Instruct the model to output numbered Q&A pairs in this section before the recipe content, only when Decision Lock questions were provided
    - _Requirements: 5.1_

  - [ ]* 5.2 Write unit tests for system core update
    - Test that system core text contains Decision Lock Answers section
    - _Requirements: 5.1_

- [x] 6. Recipe parser module (client-side)
  - [x] 6.1 Create `src/lib/recipe-parser.ts`
    - Export `parseRecipeMarkdown(markdown): ParseResult` pure function
    - Extract title from first H1 heading
    - Extract Decision Lock answers from `## Decision Lock Answers` section (numbered Q&A pairs)
    - Extract The Thinking section (approach, architecture, pattern)
    - Extract Flavour Architecture section into structured fields
    - Extract Components with ingredients (amount, unit, name, prep, function, sourcing) and steps (instruction, timing, technique reason, seasoning note)
    - Extract Timeline from table rows
    - Extract Variations from bullet lists
    - Return `{ recipe, warnings }` — never throw, return partial data with warnings on parse failures
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 6.2 Write unit tests for recipe-parser
    - Test parsing a complete AI markdown output into structured fields
    - Test parsing with Decision Lock answers present
    - Test parsing with missing sections (returns partial data + warnings)
    - Test ingredient line parsing (amount, unit, name, function, prep)
    - Test step line parsing (instruction, timing, technique reason, seasoning)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 7. Display renderer updates
  - [x] 7.1 Update `renderFullRecipe()` in `src/lib/display-renderers/index.ts`
    - Add Decision Lock section after The Thinking section when `recipe.decision_lock_answers` exists
    - Render each question and its binding answer
    - _Requirements: 10.1_

  - [x] 7.2 Update `renderRiff()` in `src/lib/display-renderers/index.ts`
    - Include Decision Lock answers as part of the architecture overview when present
    - _Requirements: 10.2_

  - [ ]* 7.3 Write unit tests for display renderer Decision Lock support
    - Test renderFullRecipe includes Decision Lock section when answers present
    - Test renderFullRecipe omits Decision Lock section when no answers
    - Test renderRiff includes Decision Lock answers when present
    - Test renderBrief, renderCookMode, renderFlavourMap, renderShoppingList, renderTimeline omit Decision Lock
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. CSV chef parser update
  - [x] 9.1 Update `parseChefCSV()` in `src/lib/csv-chef-parser.ts`
    - Add `decision_lock` section parsing: rows with `section=decision_lock`, `key=question` and `key=constraint_source` paired sequentially into `DecisionLockQuestion` objects
    - _Requirements: 1.1, 1.3_

  - [x] 9.2 Update `exportChefCSV()` in `src/lib/csv-chef-parser.ts`
    - Add `decision_lock` section export: emit `decision_lock,question,[text]` and `decision_lock,constraint_source,[ref]` rows for each question
    - _Requirements: 1.1_

  - [ ]* 9.3 Write unit tests for CSV decision_lock import/export
    - Test parseChefCSV with decision_lock rows produces correct DecisionLockQuestion array
    - Test exportChefCSV includes decision_lock rows
    - Test round-trip: export then parse preserves decision_lock data
    - _Requirements: 1.1, 1.3_

- [ ] 10. Export service updates
  - [x] 10.1 Update `exportRecipeAsPdf()` in `src/lib/export-service.ts`
    - Add Decision Lock answers section in the HTML output when `recipe.decision_lock_answers` exists
    - Render as a Q&A list before the components section
    - _Requirements: 10.1_

  - [x] 10.2 Verify `exportRecipeAsMarkdown()` uses `renderFullRecipe()` (already updated in task 7.1)
    - No code changes needed if renderFullRecipe already includes Decision Lock — just verify the flow
    - _Requirements: 10.1_

- [x] 11. Save recipe route and library actions update
  - [x] 11.1 Update `src/app/api/save-recipe/route.ts`
    - Accept structured Recipe JSON fields from the client (intent, flavour, components, timeline, variations, thinking, decision_lock_answers)
    - Persist populated structured fields instead of empty placeholders
    - Keep raw markdown in `dev_notes` as fallback/audit trail
    - _Requirements: 7.8_

  - [x] 11.2 Update `RecipeRow` type and `saveRecipe()` in `src/app/(studio)/library/actions.ts`
    - Add optional `decision_lock_answers` field to `RecipeRow`
    - Add `decision_lock_answers` to the insert payload in `saveRecipe()`
    - _Requirements: 7.8, 5.2_

- [x] 12. Canvas page update — client-side parsing and structured save
  - [x] 12.1 Update `src/app/(studio)/canvas/page.tsx`
    - Replace the `/api/parse-recipe` fetch call with a direct call to the client-side `parseRecipeMarkdown()` function
    - After parsing, send the structured Recipe JSON to the save flow (via `saveRecipe()` server action or save-recipe API with structured payload)
    - Preserve raw markdown in `dev_notes`
    - _Requirements: 7.1, 7.8_

- [x] 13. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Dial and rowToRecipe integration
  - [x] 14.1 Update `rowToRecipe()` in `src/lib/dial.ts`
    - Map `decision_lock_answers` from the DB row to the Recipe object
    - _Requirements: 5.2, 5.3_

  - [x] 14.2 Update `rowToRecipe()` in `src/app/(studio)/library/[id]/recipe-detail-client.tsx`
    - Map `decision_lock_answers` from the DB row to the Recipe object
    - _Requirements: 5.2, 5.3, 8.1_

- [x] 15. Recipe detail UI redesign
  - [x] 15.1 Redesign header section in `recipe-detail-client.tsx`
    - Display recipe title, subtitle, and fingerprint name with clear typographic hierarchy
    - _Requirements: 9.1_

  - [x] 15.2 Add structured Flavour Architecture display
    - Render Flavour Architecture using cards or labelled fields (dominant element, acid, fat, heat, sweetness, umami, texture contrasts, balance note, the move)
    - _Requirements: 9.2_

  - [x] 15.3 Render components as visual cards
    - Each component as a separated card with name, role badge, ingredients list (amount, unit, name, function), and numbered steps
    - _Requirements: 9.3, 9.4_

  - [x] 15.4 Add The Thinking panel
    - Display origin, architecture logic, the pattern, fingerprint note in a distinct callout above the components
    - _Requirements: 9.5_

  - [x] 15.5 Add visual Timeline display
    - Render timeline as a structured table or visual timeline instead of raw markdown
    - _Requirements: 9.6_

  - [x] 15.6 Add collapsible Decision Lock answers panel
    - Show Decision Lock answers in a collapsible panel when present on the recipe
    - _Requirements: 9.7_

  - [x] 15.7 Ensure legacy recipe fallback
    - When structured fields are empty (legacy recipes), fall back to rendering raw markdown from `dev_notes`
    - Maintain all existing functionality (display mode switching, dev notes, tags, cooked toggle, version history, The Dial, export, ingredient substitutions)
    - _Requirements: 8.5, 9.8_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The recipe parser (task 6) is a client-side pure function — no API route needed
- The Decision Lock assembler (task 2) is also a pure function with no side effects
- `batch-scaler.ts` and `version-store.ts` require no changes — Decision Lock data flows through automatically
