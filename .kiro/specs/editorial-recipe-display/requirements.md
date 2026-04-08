# Requirements Document

## Introduction

Transform the recipe display from utilitarian markdown/text rendering into a Scandinavian luxury editorial visual experience. The current system renders recipes as plain text strings via pure-function markdown renderers displayed in `whitespace-pre-wrap` divs. The new system replaces this with structured React components that present recipe data as a high-end print cookbook — stark, quiet, confident typography with maximum whitespace, no decorative elements, and interactive animations. The design language is: Helvetica, near-black on pure white, hairline borders, weight and spacing as the only emphasis tools.

## Glossary

- **Recipe_Detail_Page**: The page at `/library/[id]` that displays a single recipe with all its structured data (intent, flavour architecture, components, timeline, variations, thinking)
- **Recipe_Library_Page**: The page at `/library` that displays the grid listing of all saved recipes
- **Editorial_Component**: A React component that renders a specific section of recipe data (e.g. ingredients, steps, flavour architecture) using the editorial design system instead of plain text
- **Design_System**: The set of colour tokens, typography rules, spacing scales, and interaction patterns that define the Scandinavian editorial aesthetic
- **Display_Mode_Switcher**: The existing component that switches between seven recipe views (Full, Brief, Cook, Flavour Map, Shopping, Timeline, Riff)
- **Component_Card**: A visual section within the recipe detail page that presents one recipe component (e.g. "The Sauce", "The Base") with its ingredients, steps, and doneness cues
- **Flavour_Architecture_Panel**: The visual section that presents the recipe's flavour profile, acid/fat/heat/sweetness/umami breakdown, texture contrasts, and balance notes
- **Timeline_View**: The visual section that presents the recipe's cooking timeline with stages, durations, and parallel task indicators
- **Shopping_List_View**: The visual section that presents ingredients grouped by store section with pantry checks and quality highlights
- **Transition_Animation**: A CSS or Framer Motion animation applied to elements entering, exiting, or changing state — subtle, under 300ms, ease-out curves only

## Requirements

### Requirement 1: Editorial Design System Tokens

**User Story:** As a developer, I want a centralised design system with editorial colour, typography, and spacing tokens, so that all recipe components render with a consistent Scandinavian luxury aesthetic.

#### Acceptance Criteria

1. THE Design_System SHALL define the following colour tokens in globals.css: background `#FFFFFF`, background-warm `#FAFAF8`, text-primary `#0A0A0A`, text-secondary `#888888`, text-muted `#BBBBBB`, border `#E5E5E5`
2. THE Design_System SHALL set the base font-family to `"Helvetica Neue", Helvetica, Arial, sans-serif` on the body element
3. THE Design_System SHALL use a typographic scale where headings use font-weight 300 (light) or 700 (bold) with generous letter-spacing and line-height for an editorial feel
4. THE Design_System SHALL enforce zero border-radius, zero box-shadow, and zero gradients across all recipe display components
5. THE Design_System SHALL define a spacing scale that provides minimum 48px vertical rhythm between major sections and 24px between subsections
6. THE Design_System SHALL remove all dark mode overrides from recipe display components so that only the light editorial palette is used
7. THE Design_System SHALL remove all accent colours (blue, purple, green, amber, indigo) from recipe display components, replacing emphasis with font-weight and spacing only

### Requirement 2: Recipe Detail Page Editorial Layout

**User Story:** As a user viewing a recipe, I want the detail page to feel like opening a page in a high-end printed cookbook, so that the reading experience is calm, beautiful, and focused.

#### Acceptance Criteria

1. THE Recipe_Detail_Page SHALL render the recipe title in a large, light-weight heading (font-weight 300, minimum 48px font-size) with generous letter-spacing
2. THE Recipe_Detail_Page SHALL display recipe metadata (occasion, mood, effort, time, season) as a single line of text-secondary text separated by interpuncts (·), with no coloured badges or pills
3. THE Recipe_Detail_Page SHALL use a single-column layout for the main recipe content with a maximum width of 680px, centred on the page, matching editorial print column widths
4. THE Recipe_Detail_Page SHALL separate major sections (Thinking, Flavour Architecture, Components, Timeline, Variations) with generous whitespace (minimum 64px) and optional hairline dividers using the border colour token
5. THE Recipe_Detail_Page SHALL render section headings in uppercase, letter-spaced (0.1em minimum), small font-size (11–12px), font-weight 700, using text-muted colour — functioning as quiet editorial labels
6. WHEN the user scrolls the Recipe_Detail_Page, THE Recipe_Detail_Page SHALL keep the recipe title visible as a minimal sticky header (title only, text-secondary, small font-size) that appears after the main title scrolls out of view
7. THE Recipe_Detail_Page SHALL move sidebar content (The Dial, Version History, Export) below the main recipe content on all screen sizes, maintaining the single-column editorial flow

### Requirement 3: Editorial Component Cards

**User Story:** As a user reading a recipe, I want each component (sauce, base, garnish) presented as a distinct, beautifully typeset section, so that I can follow the recipe like reading a well-designed cookbook.

#### Acceptance Criteria

1. THE Component_Card SHALL display the component name as a medium-weight heading (font-weight 700, 20–24px) with the role displayed beneath in text-muted, lowercase
2. THE Component_Card SHALL render ingredients as a clean list with the amount and unit in font-weight 700 and the ingredient name in font-weight 400, each on its own line with comfortable line-height (1.8 minimum)
3. THE Component_Card SHALL render the ingredient function text (e.g. "provides acid") in text-muted italic, inline after the ingredient name, separated by an em-dash
4. THE Component_Card SHALL render steps as numbered paragraphs (not a bulleted list) where the step number is displayed in text-muted at a larger size (24–32px, font-weight 300) floated or positioned to the left of the instruction text
5. THE Component_Card SHALL display timing information inline within step text using text-secondary colour
6. THE Component_Card SHALL display technique notes ("Why: ...") as a separate paragraph below the step instruction in text-muted italic
7. THE Component_Card SHALL display doneness cues in a distinct block at the end of the component, using text-secondary with a left hairline border
8. WHEN a component has prep-ahead notes, THE Component_Card SHALL display the prep-ahead information as a quiet note in text-muted below the component heading

### Requirement 4: Editorial Flavour Architecture Panel

**User Story:** As a user exploring a recipe's flavour profile, I want the flavour architecture presented as an elegant, information-dense panel, so that I can understand the dish's balance at a glance.

#### Acceptance Criteria

1. THE Flavour_Architecture_Panel SHALL display the dominant element as a single word or phrase in large, light-weight type (font-weight 300, 32–40px) at the top of the section
2. THE Flavour_Architecture_Panel SHALL display the flavour profile tags as a horizontal list of words in text-secondary, separated by interpuncts, with no background pills or badges
3. THE Flavour_Architecture_Panel SHALL render acid, fat, heat, sweetness, and umami profiles as a vertical list where each row has the label in uppercase text-muted (left-aligned, fixed width) and the description in text-primary (right of label)
4. THE Flavour_Architecture_Panel SHALL display texture contrasts as pairs separated by an arrow (→) in text-secondary
5. THE Flavour_Architecture_Panel SHALL display the balance note as an italic paragraph in text-secondary below the flavour rows
6. THE Flavour_Architecture_Panel SHALL display "The Move" as a standalone paragraph in text-primary with font-weight 700, preceded by a hairline top border

### Requirement 5: Editorial Shopping List View

**User Story:** As a user preparing to shop for a recipe, I want the shopping list presented as a clean, scannable list grouped by store section, so that I can shop efficiently.

#### Acceptance Criteria

1. THE Shopping_List_View SHALL display store section headings in uppercase, letter-spaced text-muted, matching the editorial section heading style
2. THE Shopping_List_View SHALL render each ingredient on its own line with amount and unit in font-weight 700 and ingredient name in font-weight 400
3. WHEN an ingredient is already in the user's pantry, THE Shopping_List_View SHALL render the ingredient in text-muted with a strikethrough
4. THE Shopping_List_View SHALL display the quality highlight ("The One Thing Worth Getting") as a standalone paragraph in text-primary italic at the top of the list, with no coloured background or border
5. THE Shopping_List_View SHALL use hairline borders between store sections only, with no card backgrounds or shadows

### Requirement 6: Editorial Timeline View

**User Story:** As a user planning when to start cooking, I want the timeline presented as a clear, linear schedule, so that I can manage my time confidently.

#### Acceptance Criteria

1. THE Timeline_View SHALL display each stage as a row with the time range in font-weight 700 text-primary (left column, fixed width) and the stage description in font-weight 400 text-primary (right column)
2. THE Timeline_View SHALL indicate passive stages by appending "(passive)" in text-muted after the stage description
3. THE Timeline_View SHALL indicate parallel tasks with a subtle left-indent and a "↳" prefix in text-muted
4. THE Timeline_View SHALL display the total duration and serve time at the top of the section in text-secondary
5. THE Timeline_View SHALL separate stages with hairline borders only, with no table styling, no alternating row colours

### Requirement 7: Interactive Animations and Transitions

**User Story:** As a user navigating recipe content, I want subtle, purposeful animations that make the interface feel alive and responsive, so that the experience feels polished and modern.

#### Acceptance Criteria

1. WHEN a section of the Recipe_Detail_Page enters the viewport during scroll, THE Recipe_Detail_Page SHALL animate the section in with a subtle fade-up (opacity 0→1, translateY 12px→0) over 300ms with an ease-out curve
2. WHEN the user switches display modes in the Display_Mode_Switcher, THE Display_Mode_Switcher SHALL cross-fade between views (opacity transition, 200ms)
3. WHEN the user navigates between cook mode stages, THE Display_Mode_Switcher SHALL slide the content horizontally (previous stage exits left, new stage enters right) over 250ms
4. WHEN a collapsible section (Decision Lock, Export panel) opens or closes, THE Recipe_Detail_Page SHALL animate the height change smoothly over 200ms
5. THE Recipe_Detail_Page SHALL apply hover transitions on interactive elements (buttons, links) using opacity changes only (no colour changes), with a 150ms transition duration
6. WHEN ingredient checkboxes are toggled in the Shopping_List_View, THE Shopping_List_View SHALL animate the strikethrough and opacity change over 200ms

### Requirement 8: Recipe Library Page Editorial Grid

**User Story:** As a user browsing my recipe collection, I want the library page to present recipes as a clean, editorial grid, so that browsing feels like flipping through a curated cookbook index.

#### Acceptance Criteria

1. THE Recipe_Library_Page SHALL display recipe cards with zero border-radius, zero box-shadow, and a single hairline border using the border colour token
2. THE Recipe_Library_Page SHALL render recipe titles in font-weight 700, 14–16px, text-primary, with no other text styling on the card
3. THE Recipe_Library_Page SHALL display recipe metadata (complexity mode, date) in text-muted, 11–12px, below the title
4. THE Recipe_Library_Page SHALL remove all coloured badges and pills (fingerprint, cooked status, tags) and replace them with plain text in text-muted or text-secondary
5. WHEN the user hovers over a recipe card, THE Recipe_Library_Page SHALL indicate the hover state by shifting the border colour from `#E5E5E5` to `#0A0A0A` over 200ms, with no shadow or background change
6. THE Recipe_Library_Page SHALL render the search input with zero border-radius, a single bottom hairline border, no visible outline on focus (use border-colour change to text-primary instead), and placeholder text in text-muted
7. THE Recipe_Library_Page SHALL render tag filter chips as plain text items separated by interpuncts, where the active tag is displayed in text-primary font-weight 700 and inactive tags in text-muted — with no pill backgrounds

### Requirement 9: Display Mode Switcher Editorial Redesign

**User Story:** As a user switching between recipe views, I want the mode switcher to feel like a quiet, editorial navigation element, so that it does not distract from the recipe content.

#### Acceptance Criteria

1. THE Display_Mode_Switcher SHALL render mode tabs as a horizontal row of plain text labels in text-muted, with the active tab in text-primary font-weight 700 and an underline (1px solid text-primary)
2. THE Display_Mode_Switcher SHALL remove all pill backgrounds, rounded corners, and shadow styling from the tab container and individual tabs
3. WHEN the user switches tabs, THE Display_Mode_Switcher SHALL animate the underline indicator sliding to the new active tab position over 200ms
4. THE Display_Mode_Switcher SHALL render all seven display mode outputs (Full, Brief, Cook, Flavour Map, Shopping, Timeline, Riff) using Editorial_Components instead of plain text in a `whitespace-pre-wrap` div
5. THE Display_Mode_Switcher SHALL use the editorial design tokens for all rendered content, with no fallback to the previous markdown string rendering for structured recipe data
