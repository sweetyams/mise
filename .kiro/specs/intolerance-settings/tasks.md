# Implementation Plan: Intolerance Settings

## Overview

Add a food intolerance management feature to the MISE settings page. This involves creating shared intolerance constants, a REST API for reading/writing intolerance preferences, a UI panel with categorized checkboxes, and injecting saved intolerances as constraints into the recipe generation pipeline. All persistence uses the existing `preferences` table.

## Tasks

- [x] 1. Create intolerance constants module
  - [x] 1.1 Create `src/lib/intolerance-constants.ts` with `IntoleranceItem`, `IntoleranceCategory` interfaces, `INTOLERANCE_CATEGORIES` array, `ALL_INTOLERANCE_IDS` set, `isValidIntoleranceId()`, and `formatIntoleranceConstraints()` helper
    - Define categories: Dairy & Eggs, Grains & Gluten, Nuts & Seeds, Seafood, Other Common Intolerances
    - Each item has `id`, `label`, `category`
    - `formatIntoleranceConstraints` maps IDs to `"No {label}"` strings
    - _Requirements: 1.1, 1.3, 2.4, 4.2_

  - [ ]* 1.2 Write unit tests for intolerance constants
    - Verify `ALL_INTOLERANCE_IDS` matches flattened categories
    - Verify no duplicate IDs across categories
    - Verify `isValidIntoleranceId` accepts valid and rejects invalid IDs
    - Verify `formatIntoleranceConstraints` returns correct `"No {label}"` strings
    - _Requirements: 2.4, 4.2_

  - [ ]* 1.3 Write property test: validation accepts only canonical IDs
    - **Property 2: Validation accepts only canonical intolerance IDs**
    - **Validates: Requirements 2.4**

  - [ ]* 1.4 Write property test: intolerance constraint formatting
    - **Property 3: Intolerance constraint formatting**
    - **Validates: Requirements 4.2**

- [x] 2. Implement intolerance API endpoint
  - [x] 2.1 Create `src/app/api/settings/intolerances/route.ts` with GET and PUT handlers
    - GET: authenticate user, read from `preferences` where `key = 'intolerances'`, return `{ intolerances: string[] }`
    - PUT: authenticate user, validate IDs against `ALL_INTOLERANCE_IDS`, upsert into `preferences` with `key = 'intolerances'`, `value = { items: [...] }`, `source = 'explicit'`, `confidence = 1.0`
    - Return 401 for unauthenticated, 400 for invalid IDs or bad body, 500 for DB errors
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 5.2, 5.3_

  - [ ]* 2.2 Write unit tests for intolerance API
    - Test GET returns saved intolerances
    - Test GET returns empty array when no record exists
    - Test PUT validates and rejects invalid IDs
    - Test PUT accepts empty array (clears intolerances)
    - Test 401 for unauthenticated requests
    - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.3_

  - [ ]* 2.3 Write property test: save/load round-trip with upsert idempotence
    - **Property 1: Intolerance save/load round-trip with upsert idempotence**
    - **Validates: Requirements 2.1, 3.1, 5.2**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add intolerance panel to settings page
  - [x] 4.1 Update `src/app/(studio)/settings/page.tsx` to add the Intolerance Panel below the Default Complexity Mode card
    - Fetch saved intolerances on mount via `GET /api/settings/intolerances`
    - Render categorized checkboxes grouped by category headings
    - Each intolerance displayed as a checkbox with proper `<label>` wrapping
    - Save button triggers `PUT /api/settings/intolerances`
    - Show success confirmation or error message inline
    - Retain unsaved selections in UI on save failure
    - Keyboard navigable with appropriate ARIA labels
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 3.2, 3.3_

- [x] 5. Inject intolerances into recipe generation pipeline
  - [x] 5.1 Modify `src/app/api/generate/route.ts` to fetch user intolerances from `preferences` and merge into `RequestContext.constraints`
    - After auth check, query `preferences` for `key = 'intolerances'`
    - Use `formatIntoleranceConstraints` to convert IDs to constraint strings
    - Merge with any `body.constraints`, deduplicating
    - If no saved intolerances or DB error, proceed without adding constraints
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write unit tests for constraint merging in generate route
    - Test intolerances are appended as `"No {label}"` constraints
    - Test merge deduplicates overlapping constraints
    - Test generation proceeds normally with no saved intolerances
    - Test generation proceeds on DB error (non-fatal)
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

  - [ ]* 5.3 Write property test: constraint merge produces unique union
    - **Property 4: Constraint merge produces unique union**
    - **Validates: Requirements 4.5**

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- No schema migration needed — uses existing `preferences` table with RLS
