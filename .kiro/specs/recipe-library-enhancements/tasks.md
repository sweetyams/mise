# Implementation Plan: Recipe Library Enhancements

## Overview

Implement five enhancements to the MISE recipe library: enriched recipe cards, facet filtering, deep multi-field search, Brain visual dashboard, and Brain history with snapshots. Utility functions and tests are built first, then UI changes, then Brain enhancements. All UI uses the existing editorial design system (`--ed-*` CSS custom properties, inline styles, no border-radius/shadows).

## Tasks

- [x] 1. Create utility functions in `src/lib/recipe-utils.ts`
  - [x] 1.1 Implement `formatDuration(minutes: number): string` — converts total minutes to human-readable duration (e.g., "45 min", "1h 30m")
    - Return `"0 min"` for 0, `"{n} min"` for < 60, `"{h}h"` for exact hours, `"{h}h {m}m"` otherwise
    - _Requirements: 1.4_

  - [x] 1.2 Implement `extractCardMetadata(recipe: RecipeRow): CardMetadata` — extracts occasion, mood, effort, totalTime, feeds, dietary, dominantElement, ingredientCount from a RecipeRow
    - Use optional chaining for missing intent/flavour fields, return sensible defaults
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 1.3 Implement `computeIngredientCount(components: Recipe['components']): number` — counts unique ingredient names across all components
    - Normalize names to lowercase for deduplication
    - _Requirements: 1.6_

  - [x] 1.4 Implement `filterByFacets(recipes: RecipeRow[], filters: FacetFilters): RecipeRow[]` — applies AND logic across all non-null facet filters (occasion, mood, effort, season, dietary, dominantElement)
    - Treat missing intent/flavour fields as non-matching when a facet is active
    - For dietary, check if the filter value is included in the dietary array
    - _Requirements: 2.3, 2.4_

  - [x] 1.5 Implement `computeBrainStats(recipes: RecipeRow[]): BrainStats` — computes flavourDistribution, occasionDistribution, moodDistribution, complexityDistribution, topIngredients, activityTimeline, totalRecipes
    - Skip recipes with null/missing fields for each distribution
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.6 Implement `computeTopIngredients(recipes: RecipeRow[], limit?: number): Array<{ name: string; count: number }>` — flattens all component ingredients, counts by name, returns top N sorted by frequency descending
    - Default limit to 15
    - _Requirements: 4.5_

  - [x] 1.7 Implement `computeActivityTimeline(recipes: RecipeRow[]): Array<{ date: string; count: number }>` — groups recipes by month (YYYY-MM format) from created_at, sorted chronologically
    - _Requirements: 4.6_

  - [x] 1.8 Implement `computeBrainDiff(current: string, previous: string): Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }>` — line-by-line diff of two brain prompt texts
    - Use a simple LCS-based or line-matching diff algorithm (no external dependency)
    - _Requirements: 5.4_

- [ ] 2. Write tests for utility functions
  - [ ]* 2.1 Create unit tests in `src/lib/__tests__/recipe-utils.test.ts`
    - Test `formatDuration` with values: 0, 1, 30, 59, 60, 90, 120, 1440
    - Test `extractCardMetadata` with complete recipe, missing intent, missing flavour
    - Test `computeIngredientCount` with zero components, duplicates across components, empty ingredients
    - Test `filterByFacets` with multiple active filters, all-null filters, recipes with missing fields
    - Test `computeBrainStats` with zero recipes, one recipe, multiple recipes
    - Test `computeTopIngredients` with limit enforcement, frequency sorting
    - Test `computeActivityTimeline` with recipes across multiple months
    - Test `computeBrainDiff` with identical strings, completely different strings, empty inputs
    - _Requirements: 1.1–1.8, 2.3, 2.4, 4.1–4.6, 5.4_

  - [ ]* 2.2 Create property-based tests in `src/lib/__tests__/recipe-utils.property.test.ts` using fast-check
    - [ ]* 2.2.1 **Property 1: Card metadata extraction preserves all intent and flavour fields** — generate random recipe objects with arbitrary intent/flavour fields, verify extraction matches source fields
      - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8**
    - [ ]* 2.2.2 **Property 2: Duration formatting round-trip** — generate random non-negative integers, verify formatDuration produces "min" for < 60 and "h" for >= 60, and parsing back yields original minutes
      - **Validates: Requirements 1.4**
    - [ ]* 2.2.3 **Property 3: Unique ingredient count accuracy** — generate random arrays of components with random ingredient lists including duplicates, verify count equals size of unique name set
      - **Validates: Requirements 1.6**
    - [ ]* 2.2.4 **Property 4: Facet filter correctness** — generate random recipe arrays and random filter combinations, verify every included recipe matches all non-null filters and every excluded recipe fails at least one
      - **Validates: Requirements 2.3, 2.4**
    - [ ]* 2.2.5 **Property 5: Multi-field search recall** — generate random recipes, pick a random searchable field value as query, verify that recipe appears in results
      - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.9**
    - [ ]* 2.2.6 **Property 6: Search relevance ordering** — generate result sets with known title/non-title matches, verify all title matches appear before non-title matches
      - **Validates: Requirements 3.7**
    - [ ]* 2.2.7 **Property 7: Distribution computation correctness** — generate random recipe arrays, verify distribution values sum to count of recipes with non-null values for that field
      - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    - [ ]* 2.2.8 **Property 8: Top ingredients ranking and limit** — generate random recipe arrays, verify at most 15 items, descending frequency order, no omitted ingredient with higher count than any included one
      - **Validates: Requirements 4.5**
    - [ ]* 2.2.9 **Property 9: Activity timeline completeness** — generate random recipe arrays with random created_at dates, verify timeline counts sum to total recipes
      - **Validates: Requirements 4.6**
    - [ ]* 2.2.10 **Property 10: Brain diff completeness** — generate random string pairs, verify every line from both inputs appears in diff output correctly classified
      - **Validates: Requirements 5.4**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enrich recipe cards on the Library page
  - [x] 4.1 Update `src/app/(studio)/library/page.tsx` to import and use `extractCardMetadata` and `formatDuration` from `recipe-utils.ts`
    - Add metadata rows below the title in each recipe card: occasion · mood · effort · formatted duration · "Feeds N" · dominant element · "N ingredients"
    - Display dietary tags when present, as a separate line
    - Preserve existing title, fingerprint indicator, complexity_mode, cooked status, date, and tags display
    - Use editorial inline styles (--ed-* custom properties, no border-radius/shadows)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [x] 5. Add facet filtering to the Library page
  - [x] 5.1 Add facet filter state and derive filter options from loaded recipes in `src/app/(studio)/library/page.tsx`
    - Define `FacetFilters` state object with occasion, mood, effort, season, dietary, dominantElement (all nullable)
    - Derive available filter options by scanning all loaded recipes for unique values per facet
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Render facet filter controls as horizontal rows of text buttons matching the existing tag filter pattern (interpunct separators, bold when active, "All" to clear each facet)
    - Place filter controls between the search bar and the tag filter
    - _Requirements: 2.1, 2.2_

  - [x] 5.3 Apply `filterByFacets` to the recipe list, composing with the existing tag filter and search results
    - Display count of matching recipes when any filter is active
    - Ensure clearing all filters shows all recipes
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 6. Enhance multi-field search
  - [x] 6.1 Update `searchRecipes` in `src/app/(studio)/library/actions.ts` to query across title, intent fields (occasion, mood, season, effort), flavour fields (dominant_element), tags, and dietary using Supabase `or` with multiple `ilike` conditions
    - Keep the existing title-only fallback on error
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9_

  - [x] 6.2 Implement client-side ingredient name search in `src/app/(studio)/library/page.tsx` — scan loaded recipes for ingredient name matches, merge with server results, deduplicate by ID
    - Title matches ranked first, then tag matches, then intent/flavour matches, then ingredient matches
    - _Requirements: 3.2, 3.7_

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Build Brain visual dashboard
  - [x] 8.1 Create `getBrainStats` server action (can be added to a new `src/app/(studio)/brain/actions.ts` or inline) that fetches all user recipes and calls `computeBrainStats` from `recipe-utils.ts`
    - Return error message on failure, allowing fallback to existing brain text display
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 8.2 Build inline SVG bar chart component for distributions (flavour, occasion, mood, complexity) in `src/app/(studio)/brain/page.tsx`
    - Accept `data: Record<string, number>` and `label: string`
    - Use editorial colours and inline styles, no external charting library
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.3 Build top ingredients list component — numbered list of top 15 ingredients with frequency counts
    - _Requirements: 4.5_

  - [x] 8.4 Build activity timeline component — horizontal SVG bar chart or simple grid showing recipe counts per month
    - _Requirements: 4.6_

  - [x] 8.5 Integrate dashboard components into `src/app/(studio)/brain/page.tsx` above the existing brain sections
    - Show dashboard when user has >= 2 recipes; show encouragement message when < 2
    - Keep existing collapsible brain prompt text sections below the dashboard
    - _Requirements: 4.7, 4.8_

- [x] 9. Implement Brain history and snapshots
  - [x] 9.1 Create `brain_snapshots` table — write SQL migration with table definition, indexes, and RLS policies as specified in the design document
    - Table: id (UUID PK), user_id (FK), version (INT), prompt_text (TEXT), compiled_at (TIMESTAMPTZ), created_at (TIMESTAMPTZ)
    - RLS: users can read own snapshots, service role can insert
    - _Requirements: 5.1_

  - [x] 9.2 Update `POST /api/brain` in `src/app/api/brain/route.ts` to save a brain snapshot after successful compilation
    - Insert into `brain_snapshots` with user_id, version, prompt_text, compiled_at
    - Wrap in try/catch — log error and continue if snapshot save fails
    - _Requirements: 5.1, 5.5_

  - [x] 9.3 Create `getBrainSnapshots` server action that fetches all snapshots for the current user, ordered by version DESC
    - _Requirements: 5.2_

  - [x] 9.4 Add snapshot version list to `src/app/(studio)/brain/page.tsx` — display previous versions with compiled timestamps, allow selecting a snapshot to view its prompt text
    - _Requirements: 5.2, 5.3_

  - [x] 9.5 Add diff comparison view using `computeBrainDiff` — show comparison between current brain and most recent previous snapshot, highlighting added/removed/unchanged lines
    - Use editorial styling: added lines with subtle green-tinted background, removed lines with subtle red-tinted background
    - _Requirements: 5.4_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All UI uses editorial design system inline styles (`--ed-*` custom properties)
