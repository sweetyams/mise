# Requirements Document

## Introduction

Enhance the MISE recipe library experience across three areas: (1) richer recipe cards with more identifying metadata, (2) deep multi-field search across all recipe content, and (3) a visual, insight-driven Brain page with history tracking. The current library cards are minimal (title, fingerprint, cooked status, date, tags), search only matches titles, and the Brain page displays raw compiled prompt text with no visuals or evolution tracking.

## Glossary

- **Library_Page**: The recipe list view at `/library` that displays saved recipes in a card grid with search and tag filtering.
- **Recipe_Card**: A clickable card in the Library_Page grid representing a single saved recipe.
- **Search_Engine**: The server-side search function that queries the recipes table and returns matching results.
- **Brain_Page**: The Chef Brain view at `/brain` that displays the user's compiled cooking identity.
- **Brain_API**: The `/api/brain` endpoint that compiles and returns Chef Brain data.
- **Recipe**: A saved recipe record containing intent, flavour, components, timeline, variations, relationships, thinking, and meta fields.
- **Component**: A sub-section of a Recipe (e.g., base, sauce, texture) containing ingredients and steps.
- **Ingredient**: An item within a Component with name, amount, unit, function, and preparation fields.
- **Flavour_Architecture**: The flavour profile of a Recipe including dominant_element, flavour_profile tags, acid, fat, heat, sweetness, umami, and the_move.
- **Intent**: Recipe metadata including occasion, mood, season, effort, feeds, total_time_minutes, active_time_minutes, and dietary restrictions.
- **Brain_Snapshot**: A versioned record of a compiled Chef Brain at a specific point in time, used for history tracking.

## Requirements

### Requirement 1: Enriched Recipe Cards

**User Story:** As a cook, I want recipe cards to show key identifying information at a glance, so that I can quickly find the recipe I'm looking for without opening each one.

#### Acceptance Criteria

1. THE Recipe_Card SHALL display the recipe occasion from Intent (e.g., "weeknight", "dinner party").
2. THE Recipe_Card SHALL display the recipe mood from Intent (e.g., "comfort", "experimental").
3. THE Recipe_Card SHALL display the effort level from Intent (e.g., "low", "medium", "high", "project").
4. THE Recipe_Card SHALL display the total_time_minutes from Intent formatted as a human-readable duration (e.g., "45 min", "1h 30m").
5. THE Recipe_Card SHALL display the dominant_element from Flavour_Architecture (e.g., "acid-led", "umami-led").
6. THE Recipe_Card SHALL display the total number of unique Ingredient items across all Components.
7. THE Recipe_Card SHALL display the feeds count from Intent (e.g., "Feeds 4").
8. WHEN dietary restrictions exist in Intent, THE Recipe_Card SHALL display dietary tags (e.g., "vegetarian", "gluten-free").
9. THE Recipe_Card SHALL continue to display the existing title, fingerprint indicator, complexity_mode, cooked status, date, and tags.


### Requirement 2: Category and Facet Filtering

**User Story:** As a cook, I want to filter my recipe library by categories like occasion, mood, effort, and dietary restrictions, so that I can narrow down recipes to match what I need right now.

#### Acceptance Criteria

1. THE Library_Page SHALL provide filter controls for occasion, mood, effort, season, and dietary fields from Intent.
2. THE Library_Page SHALL provide a filter control for dominant_element from Flavour_Architecture.
3. WHEN a user selects one or more filter values, THE Library_Page SHALL display only recipes matching all selected filters.
4. WHEN a user clears all filters, THE Library_Page SHALL display all recipes.
5. THE Library_Page SHALL display the count of matching recipes when filters are active.
6. THE Library_Page SHALL preserve the existing tag filter functionality alongside the new category filters.

### Requirement 3: Deep Multi-Field Search

**User Story:** As a cook, I want to search across all recipe content including ingredients, flavour profiles, occasion, mood, and tags, so that I can find recipes by any detail I remember.

#### Acceptance Criteria

1. WHEN a search query is submitted, THE Search_Engine SHALL match against recipe title.
2. WHEN a search query is submitted, THE Search_Engine SHALL match against Ingredient names across all Components.
3. WHEN a search query is submitted, THE Search_Engine SHALL match against tags.
4. WHEN a search query is submitted, THE Search_Engine SHALL match against occasion, mood, season, and effort fields from Intent.
5. WHEN a search query is submitted, THE Search_Engine SHALL match against dominant_element and flavour_profile tags from Flavour_Architecture.
6. WHEN a search query is submitted, THE Search_Engine SHALL match against dietary restrictions from Intent.
7. THE Search_Engine SHALL return results sorted by relevance, with title matches ranked above other field matches.
8. WHEN no results match the query, THE Search_Engine SHALL return an empty result set.
9. THE Search_Engine SHALL perform case-insensitive matching for all searched fields.

### Requirement 4: Brain Page Visual Dashboard

**User Story:** As a cook, I want the Brain page to show visual charts and graphs of my cooking patterns and flavour preferences, so that I can understand my cooking identity at a glance instead of reading raw text.

#### Acceptance Criteria

1. THE Brain_Page SHALL display a flavour preference chart showing the distribution of dominant_element values across all user recipes.
2. THE Brain_Page SHALL display an occasion breakdown showing how many recipes exist per occasion type.
3. THE Brain_Page SHALL display a mood distribution showing how many recipes exist per mood type.
4. THE Brain_Page SHALL display a complexity mode distribution showing recipe counts per complexity_mode.
5. THE Brain_Page SHALL display a list of the user's most frequently used Ingredient items across all recipes, limited to the top 15 ingredients.
6. THE Brain_Page SHALL display the user's cooking activity over time as a timeline or heatmap showing recipe creation dates.
7. THE Brain_Page SHALL continue to display the compiled brain prompt text in collapsible sections.
8. WHEN the user has fewer than 2 recipes, THE Brain_Page SHALL display a message encouraging the user to generate more recipes to populate the dashboard.

### Requirement 5: Brain History and Evolution Tracking

**User Story:** As a cook, I want to see how my cooking identity has evolved over time, so that I can track my growth and changing preferences.

#### Acceptance Criteria

1. WHEN the Brain_API compiles a new brain version, THE Brain_API SHALL store a Brain_Snapshot containing the version number, compiled timestamp, and prompt text.
2. THE Brain_Page SHALL display a list of previous Brain_Snapshot versions with their compiled timestamps.
3. WHEN the user selects a previous Brain_Snapshot, THE Brain_Page SHALL display that snapshot's compiled prompt text.
4. THE Brain_Page SHALL display a comparison between the current brain version and the most recent previous Brain_Snapshot, highlighting sections that changed.
5. IF a Brain_Snapshot fails to save, THEN THE Brain_API SHALL log the error and continue returning the compiled brain without interrupting the user.
