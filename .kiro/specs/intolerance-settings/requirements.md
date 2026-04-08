# Requirements Document

## Introduction

This feature adds a food intolerance management panel to the MISE settings page. Users can select from a comprehensive list of commonly known food intolerances, save their selections to the database, and have those intolerances automatically injected as constraints during recipe generation. This ensures every generated recipe respects the user's dietary restrictions without requiring manual input each time.

## Glossary

- **Settings_Page**: The existing MISE account settings page at `/settings` that displays subscription info and default complexity mode
- **Intolerance_Panel**: A new UI section within the Settings_Page for selecting and managing food intolerances
- **Intolerance_List**: The predefined, comprehensive set of commonly known food intolerances available for selection (e.g., gluten, lactose, fructose, histamine, eggs, shellfish, tree nuts, peanuts, soy, sesame, sulfites, nightshades, FODMAPs, corn, mustard, celery, lupin, mollusks, fish, alcohol)
- **Intolerance_API**: The server-side API endpoint responsible for reading and writing the user's selected intolerances
- **Generate_Route**: The existing `/api/generate` POST endpoint that handles recipe generation requests
- **Prompt_Assembler**: The module (`src/lib/prompt-assembler.ts`) that builds the multi-layer prompt including the `RequestContext.constraints` field
- **Preferences_Table**: The existing `public.preferences` table with per-user key/value (JSONB) storage, used to persist intolerance selections

## Requirements

### Requirement 1: Display Intolerance Selection Panel

**User Story:** As a user, I want to see a panel on the settings page with a complete list of food intolerances, so that I can indicate which ones apply to me.

#### Acceptance Criteria

1. WHEN the Settings_Page loads, THE Intolerance_Panel SHALL display a multi-select list containing all items from the Intolerance_List
2. WHEN the Settings_Page loads, THE Intolerance_Panel SHALL pre-select any intolerances the user has previously saved
3. THE Intolerance_Panel SHALL group intolerances into logical categories (e.g., "Dairy & Eggs", "Grains & Gluten", "Nuts & Seeds", "Seafood", "Other Common Intolerances")
4. THE Intolerance_Panel SHALL display each intolerance as a selectable checkbox or toggle element
5. THE Intolerance_Panel SHALL be accessible via keyboard navigation and include appropriate ARIA labels for screen readers

### Requirement 2: Save Intolerance Selections

**User Story:** As a user, I want to save my selected intolerances to my account, so that they persist across sessions.

#### Acceptance Criteria

1. WHEN the user modifies intolerance selections and confirms the save action, THE Intolerance_API SHALL persist the selected intolerances to the Preferences_Table using the key `"intolerances"` and a JSONB value containing the list of selected intolerance identifiers
2. WHEN the save operation succeeds, THE Intolerance_Panel SHALL display a confirmation message to the user
3. IF the save operation fails due to a network or server error, THEN THE Intolerance_Panel SHALL display an error message and retain the user's unsaved selections in the UI
4. WHEN the Intolerance_API receives a save request, THE Intolerance_API SHALL validate that the submitted intolerance identifiers exist in the Intolerance_List before persisting
5. THE Intolerance_API SHALL require an authenticated user session before processing any read or write request

### Requirement 3: Load Saved Intolerances on Settings Page

**User Story:** As a user, I want my previously saved intolerances to appear pre-selected when I visit the settings page, so that I can see and modify my current selections.

#### Acceptance Criteria

1. WHEN the Settings_Page loads, THE Intolerance_API SHALL retrieve the user's saved intolerances from the Preferences_Table
2. WHEN the Intolerance_API returns saved intolerances, THE Intolerance_Panel SHALL mark those intolerances as selected in the UI
3. IF the user has no saved intolerances, THEN THE Intolerance_Panel SHALL display all intolerances as unselected

### Requirement 4: Inject Intolerances as Constraints During Recipe Generation

**User Story:** As a user, I want my saved intolerances to be automatically applied when recipes are generated, so that generated recipes respect my dietary restrictions without manual input.

#### Acceptance Criteria

1. WHEN the Generate_Route receives a recipe generation request, THE Generate_Route SHALL fetch the authenticated user's saved intolerances from the Preferences_Table
2. WHEN saved intolerances are found, THE Generate_Route SHALL append each intolerance as a constraint string (e.g., "No gluten", "No lactose") to the `RequestContext.constraints` array before passing context to the Prompt_Assembler
3. WHEN the Prompt_Assembler builds the request context layer, THE Prompt_Assembler SHALL include the intolerance constraints in the "Constraints" line of the prompt
4. IF the user has no saved intolerances, THEN THE Generate_Route SHALL proceed with recipe generation without adding intolerance constraints
5. WHEN both user-saved intolerances and per-request constraints exist, THE Generate_Route SHALL merge both sets into the `RequestContext.constraints` array without duplicates

### Requirement 5: Intolerance Data Integrity

**User Story:** As a user, I want my intolerance data to be securely stored and only accessible to me, so that my dietary information remains private.

#### Acceptance Criteria

1. THE Preferences_Table SHALL enforce Row Level Security so that each user can only read and modify their own intolerance records
2. WHEN a user saves intolerances, THE Intolerance_API SHALL use an upsert operation on the Preferences_Table to ensure only one `"intolerances"` record exists per user
3. THE Intolerance_API SHALL set the `source` field to `"explicit"` and the `confidence` field to `1.0` when saving intolerance preferences
