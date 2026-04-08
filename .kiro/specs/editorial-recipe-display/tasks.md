# Implementation Plan: Editorial Recipe Display

## Overview

Transform recipe display from markdown/text rendering into a Scandinavian editorial visual experience. Build editorial design tokens first, then shared components, then section-specific components, then refactor existing pages to use them. All editorial components consume the existing `Recipe` type from `src/lib/types/recipe.ts`. Existing pure-function renderers in `display-renderers/index.ts` are preserved for export/API consumers.

## Tasks

- [x] 1. Add editorial design tokens and base styles to globals.css
  - [x] 1.1 Add editorial CSS custom properties to `src/app/globals.css`
    - Add `:root` variables: `--ed-bg`, `--ed-bg-warm`, `--ed-text-primary`, `--ed-text-secondary`, `--ed-text-muted`, `--ed-border`, `--ed-font`, `--ed-spacing-section`, `--ed-spacing-subsection`, `--ed-content-width`
    - Add `.editorial` scoping class with font-family, colour, background, and `* { border-radius: 0; box-shadow: none; }` reset
    - Add `.ed-reveal` and `.ed-visible` classes for scroll-triggered fade-up animation
    - Add `@media (prefers-reduced-motion: reduce)` overrides to disable animations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 7.1_

  - [ ]* 1.2 Write unit tests for design token definitions
    - Verify CSS custom properties are defined with correct values
    - Verify `.editorial` class enforces zero border-radius and zero box-shadow
    - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. Create shared editorial section wrapper and scroll-reveal hook
  - [x] 2.1 Create `src/components/editorial/editorial-section.tsx`
    - Implement `EditorialSection` component with `label`, `showDivider`, and `children` props
    - Section heading: uppercase, letter-spaced (0.1em), 11–12px, font-weight 700, `--ed-text-muted`
    - Vertical spacing: `--ed-spacing-section` margin-top
    - Optional hairline divider above using `--ed-border`
    - Implement `useScrollReveal` hook using `IntersectionObserver` with threshold 0.1, toggling `ed-visible` class
    - Clean up observer on unmount
    - _Requirements: 2.4, 2.5, 7.1_

- [x] 3. Create editorial header component
  - [x] 3.1 Create `src/components/editorial/editorial-header.tsx`
    - Implement `EditorialHeader` with props: title, subtitle, occasion, mood, effort, totalTime, season, cooked, onMarkCooked, onDelete
    - Title: font-weight 300, 48px, letter-spacing -0.02em
    - Metadata line: interpunct-separated values in `--ed-text-secondary`, no coloured badges
    - Action buttons: text-only in `--ed-text-muted`, opacity hover transition 150ms
    - Sticky header: appears when main title scrolls out of viewport via `IntersectionObserver`, renders title in 14px `--ed-text-secondary` with bottom hairline border, `position: sticky; top: 0`
    - _Requirements: 2.1, 2.2, 2.6, 7.5_

  - [ ]* 3.2 Write property test for editorial header metadata (Property 1)
    - **Property 1: Metadata renders as interpunct-separated plain text**
    - Generate random Intent data with varying combinations of occasion, mood, effort, time, season
    - Verify rendered output contains interpunct (·) separators
    - Verify no elements with badge, pill, or coloured background classes
    - **Validates: Requirements 2.2**

- [x] 4. Create editorial component card
  - [x] 4.1 Create `src/components/editorial/editorial-component-card.tsx`
    - Implement `EditorialComponentCard` accepting a `Component` prop
    - Component name: font-weight 700, 20–24px; role below in `--ed-text-muted`, lowercase
    - Prep-ahead note: `--ed-text-muted` below heading when `can_prep_ahead` is true
    - Ingredients: each on own line, amount+unit font-weight 700, name font-weight 400, function in `--ed-text-muted` italic after em-dash when present
    - Steps: numbered paragraphs with step number in `--ed-text-muted` 24–32px font-weight 300 positioned left, instruction beside it, timing inline in `--ed-text-secondary`, technique_note below in `--ed-text-muted` italic
    - Doneness cues: block at end with left hairline border in `--ed-text-secondary`
    - Handle missing fields gracefully (empty function, zero timing, empty technique_note)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.2 Write property test for component card completeness (Property 2)
    - **Property 2: Component card renders all present data fields**
    - Generate random Component with varying ingredients (with/without function), steps (with/without timing and technique_note), doneness_description, prep-ahead data
    - Verify all present fields are rendered, optional fields omitted when empty
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

- [x] 5. Create editorial flavour architecture panel
  - [x] 5.1 Create `src/components/editorial/editorial-flavour-panel.tsx`
    - Implement `EditorialFlavourPanel` accepting `FlavourArchitecture` prop
    - Dominant element: font-weight 300, 32–40px
    - Flavour profile: interpunct-separated words in `--ed-text-secondary`, no pills
    - Acid/Fat/Heat/Sweetness/Umami: vertical rows with uppercase `--ed-text-muted` label (fixed-width left column) and description in `--ed-text-primary`
    - Texture contrasts: pairs with → separator in `--ed-text-secondary`
    - Balance note: italic in `--ed-text-secondary`
    - The Move: font-weight 700 in `--ed-text-primary` with hairline top border
    - Return null if flavour is undefined or has no dominant_element
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Write property test for flavour panel completeness (Property 3)
    - **Property 3: Flavour panel renders all present profile sections**
    - Generate random FlavourArchitecture with varying present/absent profiles
    - Verify all present sections render, absent sections omitted
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

- [x] 6. Create editorial shopping list and timeline components
  - [x] 6.1 Create `src/components/editorial/editorial-shopping-list.tsx`
    - Implement `EditorialShoppingList` accepting `ShoppingList` prop
    - Quality highlight at top: italic `--ed-text-primary`, no coloured background
    - Section headings: uppercase, letter-spaced, `--ed-text-muted`
    - Items: amount font-weight 700, name font-weight 400
    - Pantry items: `--ed-text-muted` with strikethrough
    - Hairline borders between sections only, no card backgrounds
    - Return null if `grouped_by_section` is empty
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Create `src/components/editorial/editorial-timeline.tsx`
    - Implement `EditorialTimeline` accepting `Timeline` prop
    - Total duration and serve time at top in `--ed-text-secondary`
    - Each stage: time range font-weight 700 (left, fixed width), description font-weight 400 (right)
    - Passive stages: "(passive)" appended in `--ed-text-muted`
    - Parallel tasks: indented with "↳" prefix in `--ed-text-muted`
    - Hairline borders between stages, no table styling
    - Return null if `timeline.stages` is empty
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 6.3 Write property test for shopping list (Property 4)
    - **Property 4: Shopping list renders sections, items, and pantry strikethroughs correctly**
    - Generate random ShoppingList with sections, items, pantry_assumed
    - Verify sections render with uppercase headings, items with correct weight, pantry items with strikethrough
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 6.4 Write property test for timeline (Property 5)
    - **Property 5: Timeline renders stages with correct indicators**
    - Generate random Timeline with varying is_passive and parallel configurations
    - Verify total duration renders, stages render with correct indicators
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 7. Checkpoint — Verify all editorial components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create editorial thinking, variations, brief, cook-mode, and riff components
  - [x] 8.1 Create `src/components/editorial/editorial-thinking.tsx`
    - Implement `EditorialThinking` accepting `Thinking` prop
    - Render origin, architecture_logic, the_pattern, fingerprint_note as paragraphs with labels in `--ed-text-muted`
    - Return null if all fields are empty strings
    - _Requirements: 2.4_

  - [x] 8.2 Create `src/components/editorial/editorial-variations.tsx`
    - Implement `EditorialVariations` accepting `Variations` prop
    - Render dietary, taste_profiles, technique, regional variations as lists
    - Use editorial typography: labels in `--ed-text-muted`, descriptions in `--ed-text-primary`
    - _Requirements: 2.4_

  - [x] 8.3 Create `src/components/editorial/editorial-brief.tsx`
    - Implement `EditorialBrief` accepting `Recipe` prop
    - Compact single-screen view: title, metadata interpunct line, ingredients inline per component, steps condensed
    - Use editorial tokens throughout
    - _Requirements: 9.4_

  - [x] 8.4 Create `src/components/editorial/editorial-cook-mode.tsx`
    - Implement `EditorialCookMode` accepting `Recipe` and `currentStage` props
    - Render single component at a time using `EditorialComponentCard` styling
    - Stage navigation with slide animation via CSS `transform: translateX()` transition 250ms
    - Stage counter in `--ed-text-secondary`
    - _Requirements: 7.3, 9.4_

  - [x] 8.5 Create `src/components/editorial/editorial-riff.tsx`
    - Implement `EditorialRiff` accepting `Recipe` prop
    - Render thinking + flavour architecture + technique direction (component names, roles, ingredient names, steps) without amounts
    - Use editorial tokens throughout
    - _Requirements: 9.4_

  - [x] 8.6 Create `src/components/editorial/index.ts` barrel export
    - Export all editorial components from a single entry point
    - _Requirements: N/A (project structure)_

- [x] 9. Refactor DisplayModeSwitcher to render editorial components
  - [x] 9.1 Refactor `src/components/display-mode-switcher.tsx`
    - Replace pill-style tabs with plain text labels in `--ed-text-muted`, active tab in `--ed-text-primary` font-weight 700 with 1px underline
    - Animate underline sliding to new active tab position over 200ms via CSS transition
    - Remove all pill backgrounds, rounded corners, shadow styling from tabs
    - Replace markdown string rendering with editorial component rendering per mode (full → EditorialHeader + EditorialThinking + EditorialFlavourPanel + EditorialComponentCards + EditorialTimeline + EditorialVariations; brief → EditorialBrief; cook → EditorialCookMode; flavour-map → EditorialFlavourPanel; shopping → EditorialShoppingList; timeline → EditorialTimeline; riff → EditorialRiff)
    - Add cross-fade wrapper (CSS opacity transition 200ms) between mode switches
    - Preserve existing pure-function renderer imports for backward compatibility (they remain exported)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 7.2_

  - [ ]* 9.2 Write property test for display modes rendering editorial components (Property 8)
    - **Property 8: All display modes render editorial components, not markdown strings**
    - Generate random Recipe with structured data, iterate all 7 display modes
    - Verify rendered output does NOT contain a `whitespace-pre-wrap` styled wrapper with raw markdown text
    - **Validates: Requirements 9.4, 9.5**

- [x] 10. Refactor recipe detail page to editorial layout
  - [x] 10.1 Refactor `src/app/(studio)/library/[id]/recipe-detail-client.tsx`
    - Wrap content in `.editorial` scoping class
    - Replace inline header markup with `EditorialHeader` component
    - Replace inline thinking panel with `EditorialThinking` wrapped in `EditorialSection`
    - Replace inline flavour architecture with `EditorialFlavourPanel` wrapped in `EditorialSection`
    - Replace inline component cards with `EditorialComponentCard` per component, each wrapped in `EditorialSection`
    - Replace inline timeline table with `EditorialTimeline` wrapped in `EditorialSection`
    - Use single-column layout: max-width 680px (`--ed-content-width`), centred
    - Move sidebar content (Dial, Version History, Export) below main recipe content
    - Separate major sections with `--ed-spacing-section` (64px) and optional hairline dividers
    - Remove all dark mode overrides (`dark:` classes) from recipe display areas
    - Remove all accent colour classes (bg-purple-*, bg-green-*, bg-amber-*, bg-indigo-*, bg-blue-*) from recipe display areas
    - Add collapsible section animation (CSS `grid-template-rows: 0fr → 1fr` transition 200ms) for Decision Lock and Export panels
    - Add hover opacity transitions (150ms) on interactive elements
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 2.7, 7.4, 7.5_

- [x] 11. Refactor recipe library page to editorial grid
  - [x] 11.1 Refactor `src/app/(studio)/library/page.tsx`
    - Wrap content in `.editorial` scoping class
    - Recipe cards: zero border-radius, zero box-shadow, hairline border `--ed-border`, hover border transitions to `--ed-text-primary` over 200ms
    - Title: font-weight 700, 14–16px, `--ed-text-primary`
    - Metadata: `--ed-text-muted`, 11–12px, no coloured badges — plain text for fingerprint, complexity mode, cooked status, date
    - Tags on cards: plain text in `--ed-text-muted`, no pill backgrounds
    - Search input: zero border-radius, bottom hairline border only, focus changes border to `--ed-text-primary`, placeholder in `--ed-text-muted`
    - Tag filter chips: plain text separated by interpuncts, active tag in font-weight 700 `--ed-text-primary`, inactive in `--ed-text-muted`, no pill backgrounds
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 11.2 Write property test for library cards (Property 6)
    - **Property 6: Library recipe cards contain no coloured badge elements**
    - Generate random recipe metadata (fingerprint_id, complexity_mode, cooked, tags)
    - Verify rendered card contains no coloured background classes
    - **Validates: Requirements 8.4**

  - [ ]* 11.3 Write property test for tag filters (Property 7)
    - **Property 7: Library tag filters render as interpunct-separated text with correct active styling**
    - Generate random tag arrays and active tag selection
    - Verify interpunct separation, active tag bold + primary colour, inactive tags muted, no pill backgrounds
    - **Validates: Requirements 8.7**

- [x] 12. Checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Update studio layout for editorial consistency
  - [x] 13.1 Update `src/app/(studio)/layout.tsx`
    - Remove dark mode background classes from the studio shell that would conflict with editorial white background
    - Ensure the layout does not override editorial design tokens
    - _Requirements: 1.6_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Existing pure-function renderers in `display-renderers/index.ts` are preserved unchanged for export/API consumers
- All CSS animations respect `prefers-reduced-motion: reduce`
