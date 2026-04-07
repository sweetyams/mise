# Requirements Document

## Introduction

MISE is a culinary development engine — a Next.js 14 (App Router) web application deployed on Vercel that uses Claude Sonnet (via Anthropic API, swappable through an abstraction layer) to generate structured, restaurant-quality recipes through a 4-layer prompt architecture. The application targets three user tiers: serious home cooks, food content creators, and small restaurant/catering operations. The tech stack is deliberately minimal for a solo dev: Next.js 14 for frontend and API layer (one repo), Supabase for auth, database, and file storage, Vercel for hosting (deploys on push), Stripe for billing (subscriptions and one-time Kitchen Drop purchases via hosted checkout), Anthropic API for generation, Upstash for Redis caching (Chef Brain), and Resend for transactional email. Six external services total. Free tier handles the first 500 users. The tone is energetic, friendly, unpretentious, and uses Canadian spelling throughout.

The product's core differentiator is output quality — the 4-layer prompt architecture (System Core + Chef Fingerprint + User Chef Brain + Request Context) encodes deep cooking knowledge that makes generated recipes genuinely better than asking a general-purpose AI directly. Chef Fingerprints are the product's IP — distilled decision trees extracted offline from deep biographical research, not raw biographies. The secondary differentiator is Chef Brain — a compiled personalization prompt fragment that learns from a user's development logs and tasting notes over time, making every generation more attuned to the user's preferences.

Key insight: Biographical depth is for TRAINING the fingerprint objects offline, not for runtime injection. The expensive thinking happens in the editor, not the API call.

### 4-Layer Prompt Architecture

Every generation call is assembled from 4 layers:

| Layer | Name | Size | Mutability | Description |
|---|---|---|---|---|
| 1 | System Core | ~150 tokens | Never changes | MISE's culinary philosophy: weights in grams/ml, Celsius, technique reasons, seasoning at every stage, acid moment/fat decision/textural contrast, structured output rules |
| 2 | Chef Fingerprint | ~300 tokens | Changes per persona | Distilled decision tree extracted offline from biographical research. Covers formation, core decisions (acid, spice, herbs, vegetables, surprise, texture), voice, and "would never" rules |
| 3 | User Chef Brain | ~200 tokens | Changes per user | Compiled from onboarding answers and development logs. Covers flavour biases, pantry constants, technique comfort, avoid list, cooking context, recent development notes |
| 4 | Request Context | ~100 tokens | Changes per generation | Built from UI state: what the user is asking for, options, occasion, season, constraints |

Total per generation: ~850 tokens input, ~1200 tokens output ≈ $0.021 per generation on Sonnet.

### Release Scoping

- **V1 / Phase 1 (Months 1–3: Ship the Core)**: Recipe generation with 4-layer prompt architecture (System Core + Fingerprints + Chef Brain + Request Context), component-based recipe model with Zod schema validation, The Dial (recipe evolution tool with versioned branches), The Thinking field (chef's reasoning in every recipe), seven display modes (Full Recipe, Brief, Cook, Flavour Map, Shopping List, Timeline, Riff), three complexity modes (Foundation, Kitchen, Riff), shopping list with Quality Highlight ("the one thing worth getting"), user accounts with recipe library, recipe versioning, export (PDF + Markdown), scaling calculator, auth (Supabase Auth), server-side API key management, Stripe billing (subscriptions), rate limiting and cost controls, ingredient pairing and substitution, fermentation tracking, Chef Brain compilation (Haiku-based), fingerprint versioning, prompt snapshot storage, caching (in-memory + Upstash Redis). Solo dev ships in 6–8 weeks. Six external services: Supabase, Vercel, Stripe, Anthropic API, Upstash, Resend.
- **V2 / Phase 2 (Months 4–6: Make It Feel Like a Studio)**: Full memory system (L1 Session Memory, L2 Preference Memory, L3 Identity Memory / Chef Brain, L4 Pattern Memory), Recipe Canvas with "Your Kitchen" sidebar (before/during/after cooking modes), Stage Tracker with sensory-driven transitions (PREP, ACTIVE, WAITING, FINISH, PLATE), Cooking Companion chat (context-aware, auto-switching Discovery/Active Cooking/Development modes), rating system (three-question post-cook flow, not stars), timeline (personal record of generations, questions, cook sessions, ratings, notes, ideas), enhanced PDF export (styled HTML templates via Puppeteer/Browserless), custom fingerprint builder (Creator/Brigade tier), pantry mode, recipe collections and menus, tasting notes and iteration log, social login, shared recipes, saved favourites, celebrity chef fingerprints, responsive layouts (phone stage tracker primary, tablet full canvas, desktop full studio), PWA (home screen install, offline generated recipes, offline timers), multi-dish timeline (interleaved meal planning with free-time windows), Building Blocks library lookup during generation (use user's perfected sub-recipes). Primarily frontend builds and prompt engineering — no new external services.
- **V3 / Phase 3 (Months 7–12: The Community and the Drops)**: Next Step feature (swipeable card deck: The Stretch, The Deepener, The Wild Card), sharing cards (beautifully formatted image with fingerprint tag, recipe title, flavour note, OG image generation), public MISE profiles with read-only recipe view, Kitchen Drops (purchasable themed recipe collections/experiences via Stripe one-time payments), Zine Viewer (in-app PDF reader for Kitchen zine content), team workspaces for Brigade tier (row-level security in Supabase, shared library views, commenting), recipe forking (fork shared recipes, linked fork trees, dial from forks), API access for external platforms, white-label fingerprints.

### Pricing Model

| Tier | Price | Generations/Month | Fingerprints | Library | Export | Custom Fingerprints | Collections | Team | API | Kitchen Drops |
|---|---|---|---|---|---|---|---|---|---|---|
| Free | $0 | 10 | 1 | No | No | No | No | No | No | Purchase only |
| Home Cook | $9/month | Unlimited | All | Yes | Yes | No | No | No | No | Yes |
| Creator | $19/month | Unlimited | All | Yes | Yes (with branding) | Yes | Yes | No | No | Yes |
| Brigade (Pro) | $49/month | Unlimited | All | Yes | Yes (with branding) | Yes | Yes | Yes | Yes | Yes |

Kitchen Drops are one-time Stripe purchases available to all tiers (including Free). Each Drop unlocks a themed "Kitchen" in the user's account containing curated recipe collections, technique guides, and a downloadable zine.

### Cost Model

| Item | Cost | Notes |
|---|---|---|
| Per generation (Sonnet) | ~$0.021 | ~850 input + ~1200 output tokens |
| Chef Brain compilation (Haiku) | ~$0.0001 | Runs infrequently: on signup, after each dev log entry |
| 5,000 users × 10 gen/month | ~$1,050/month | API cost |
| Revenue at 5,000 users avg $15/month | $75,000/month | Subscription revenue |
| API cost as % of revenue | 1.4% | 98.6% gross margin before other costs |

## Glossary

- **MISE**: The product name — a culinary development engine. The Next.js 14 (App Router) web application deployed on Vercel that serves as the primary interface for AI-powered recipe generation and management
- **System_Core**: Layer 1 of the prompt architecture (~150 tokens). MISE's culinary philosophy and output rules: weights in grams/ml, Celsius, technique reasons, seasoning at every stage, acid moment/fat decision/textural contrast, structured output. Never changes. Loaded into memory at startup
- **Fingerprint**: Layer 2 of the prompt architecture (~300 tokens). A distilled decision tree extracted offline from deep biographical research (10,000+ words condensed to ~300 tokens). NOT the biography itself — the biography is used offline to create the fingerprint. Covers formation, core decisions (acid, spice, herbs, vegetables, surprise, texture), voice, and "would never" rules. Stored in the `fingerprints` table, versioned, edited by the operator only. Cached in memory with 1-hour TTL
- **Chef_Brain**: Layer 3 of the prompt architecture (~200 tokens). A compiled prompt fragment built from a user's onboarding answers, development logs, and tasting notes. NOT raw answers — compiled via an API call using Claude Haiku (25x cheaper than Sonnet). Covers flavour biases, pantry constants, technique comfort, avoid list, cooking context, recent development notes. Stored in the `chef_brains` table, cached in Redis (Upstash) with 15-minute TTL per user
- **Request_Context**: Layer 4 of the prompt architecture (~100 tokens). Built from UI state for each generation: what the user is asking for, options, occasion, season, constraints
- **Prompt_Assembler**: The module that fetches all 4 prompt layers in parallel, joins layers 1–3 as the system prompt, sends layer 4 as the user message, and streams the response via Claude Sonnet
- **Prompt_Snapshot**: A JSONB record stored with every generated recipe containing the exact text of all 4 layers used, their versions, and token counts. Enables reproducibility and debugging
- **Brain_Compiler**: The service that compiles raw user data (onboarding answers, dev logs, tasting notes) into a ~200-token Chef Brain prompt fragment using Claude Haiku. Runs on signup and after each dev log entry
- **Recipe_Store**: The Supabase PostgreSQL database that persists all recipe data, versions, user configurations, fingerprints, chef brains, sessions, preferences, ratings, ideas, and billing state
- **AI_Client**: The module that communicates with the active AI provider (Claude Sonnet by default, via Anthropic API) to generate recipe content, abstracted behind a provider interface for future model switching
- **Batch_Scaler**: The component that recalculates ingredient quantities for different serving sizes, integrated into the generation flow
- **Recipe_Output**: The structured JSON data format for a generated recipe, containing: components (each with name, role, ingredients, steps, doneness_cues, prep-ahead info), intent (occasion, mood, season, time, effort), flavour architecture (profile, dominant, acid, fat, heat, sweet, texture, balance), thinking (approach, architecture, pattern), variations, related references, and metadata. Validated against a Zod schema. Markdown is never stored — it is rendered on demand from the structured JSON
- **Fermentation_Log**: A record tracking fermentation and preservation processes including start date, temperature, duration, and tasting notes
- **Auth_Service**: The Supabase Auth module handling user registration, login, session management, and (V2) social login
- **Billing_Service**: The Stripe integration module managing subscriptions, plan tiers, one-time Kitchen Drop purchases, and payment processing via hosted checkout
- **Rate_Limiter**: The component that enforces generation limits per plan tier and maximum token caps per AI request
- **Version_Store**: The subsystem that tracks recipe versions, diffs, and version history
- **Export_Service**: The module that renders recipes as formatted PDF cards (V1: basic, V2: styled HTML templates rendered via Puppeteer or Browserless) and Markdown files
- **Recipe_Library**: The user's personal collection of saved, tagged, and searchable recipes
- **Collection**: A user-defined grouping of recipes (e.g., dinner party menu, weekly meal plan, tasting menu) — V2
- **Pantry_Mode**: A generation mode where the user specifies available ingredients and the AI generates recipes constrained to those ingredients — V2
- **Custom_Fingerprint_Builder**: A UI and system for Creator/Brigade-tier users to create custom fingerprints by picking inspirations, describing cooking style, and setting flavour biases — V2
- **Recipe_Canvas**: The main recipe view with a split layout: recipe output on the left, "Your Kitchen" sidebar on the right. The sidebar has three modes: Before Cooking (memory suggestions, pantry check), During Cooking (stage tracker + chat), After Cooking (rating + dev notes) — V2
- **Session_Memory**: L1 memory layer — live, ephemeral, this-cook-only. Stored in browser state with a lightweight DB record. Tracks current cooking session state, timer positions, stage progress, and in-session chat. Cleared after cook session ends — V2
- **Preference_Memory**: L2 memory layer — builds over weeks. Structured data stored in the `preferences` table, queryable, visible to the user. Tracks specific preferences (e.g., "doubles preserved lemon", "prefers cast iron"), each with a confidence score and source attribution. Updated from ratings, dev notes, and chat questions — V2
- **Identity_Memory**: L3 memory layer — the compiled Chef Brain (~200-token prompt layer). Updated on signup, after dev log entries, and weekly recompilation. This is the same Chef_Brain from V1, now positioned as part of the 4-layer memory system — V2
- **Pattern_Memory**: L4 memory layer — inferred, never explicitly shown to the user. Shapes recommendations and Next Step suggestions. Tracks cooking frequency, fingerprint preferences, technique progression, flavour exploration patterns. Invisible to the user but influences what MISE surfaces — V2
- **Stage_Tracker**: The cooking companion that breaks a recipe into stages (PREP, ACTIVE, WAITING, FINISH, PLATE). Each stage transition describes what to see, smell, or feel — not just timers. The chat interface lives inside the stage tracker and is context-aware (knows the current stage). Every question asked during cooking is logged for pattern detection — V2
- **Cooking_Stage**: One of five recipe execution phases: PREP (mise en place, measuring, chopping), ACTIVE (hands-on cooking), WAITING (passive time — resting, marinating, rising), FINISH (final seasoning, plating prep), PLATE (assembly and presentation) — V2
- **Tools_Drawer**: A utility panel within the Stage_Tracker containing: multiple simultaneous timers, unit converter, temperature guide, substitution lookup, and scaling calculator — V2
- **Rating_System**: A three-question post-cook feedback flow (not stars). Questions: (1) Would you cook this again? (Absolutely / Maybe tweaked / Probably not), (2) What was the highlight? (Flavour / Technique / The occasion / Surprised me), (3) One thing you'd change? (Nothing / More acid / Different texture / Different technique / Something else...). "Something else" opens a text field that feeds directly into L2 Preference_Memory — V2
- **Chat_Layer**: A context-aware chat interface with three auto-switching modes: Discovery (not cooking — exploratory, conversational), Active Cooking (short, direct answers — knows current stage), Development (post-cook debrief — reflective, connects to tasting notes). Knows Chef Brain, current recipe, and cooking history. Chat history is permanently accessible in the Timeline. Questions feed back into Chef Brain recompilation — V2
- **Timeline**: A personal record (not a social feed) showing: generations, questions asked, cook sessions, ratings, dev notes, and ideas. Ideas are auto-filed from generated-but-not-cooked recipes. Idea annotations are picked up by the Next Step feature — V2
- **Idea**: A generated-but-not-cooked recipe that is auto-filed into the Timeline with optional user annotations. Ideas are surfaced by the Next Step feature when relevant — V2/V3
- **Next_Step**: A swipeable card deck of recipe suggestions based on memory layers. Three card types: The Stretch (new technique connecting to user's strengths), The Deepener (more of what the user loves), The Wild Card (something unexpected). Swipe left = show another, swipe right = generate full recipe. Surfaces at the right moment based on cooking patterns — V3
- **Recipe_Card**: A beautifully formatted shareable image containing the fingerprint tag, recipe title, and a flavour note. Links to a read-only recipe on the user's public MISE profile — V3
- **Kitchen_Drop**: A purchasable themed recipe collection/experience sold as a one-time Stripe payment. Each Drop unlocks a "Kitchen" in the user's account containing curated recipes, technique guides, and a downloadable zine — V3
- **Zine_Viewer**: An in-app PDF reader that renders Kitchen zine content as a browsable, styled reading experience rather than a raw download link — V3
- **OG_Image_Generator**: A server-side service that generates Open Graph images for public recipe cards and profiles, ensuring shared links render rich previews on social platforms — V3
- **Team_Workspace**: A shared environment where multiple users (Brigade tier) collaborate on a recipe library with commenting, status tracking, and row-level security in Supabase — V3
- **Brigade_Tier**: The renamed Pro/Restaurant tier ($49/month) that includes team workspace features — V3
- **Fingerprint_Heatmap**: A visual display in the Recipe_Library showing which fingerprints the user has loved over time, based on rating data — V2
- **The_Dial**: A recipe evolution tool that generates a full new recipe version via an API call when the user pushes a direction (More Acid, Smokier, More Umami, More Heat, Lighter, Funkier, Different Region, Riff Mode). Each push preserves the previous version. The Dial history becomes a record of how the recipe developed over time. Distinct from stored TasteProfile adjustments — those are instant previews; the Dial creates permanent versioned branches — V1
- **The_Thinking**: A structured field included in every generated recipe containing the chef's reasoning: how the chef approached the dish, the logic behind the flavour architecture, and what culinary pattern this recipe teaches. Generated alongside the recipe by the AI — V1
- **Recipe_Fork**: A copy of a shared recipe created when another user saves and cooks it. Forks are linked to the parent version. The original author can see forks and dial from them. The fork tree is visible on the recipe — V3
- **Complexity_Mode**: One of three generation/display levels: Foundation (learning the dish, more explanation, doneness cues at every step, conservative seasoning, proactive substitutions), Kitchen (default, professional but approachable), Riff (architecture and intention only, for experienced cooks). Remembered per user as default, overridable per recipe — V1
- **Display_Mode**: One of seven rendering modes that transform the same stored Recipe JSON into different views: The Full Recipe, The Brief, The Cook, The Flavour Map, The Shopping List, The Timeline, The Riff. All modes are pure render functions with no API calls — V1
- **Building_Block**: A standalone sub-recipe (sauce, pickle, spice blend) stored in the user's library. During generation, MISE checks the user's library for existing Building_Block versions and uses those instead of generating generic ones — V2
- **Quality_Highlight**: A single sentence in the Shopping List identifying the one ingredient where quality makes the biggest difference to the final dish, derived from the recipe's flavour architecture. Not a list — one sentence, always useful — V1
- **Recipe_Component**: A named part of a recipe (the braise, the tahini sauce, the garnish) with its own ingredients, steps, doneness cues, and prep-ahead notes. A recipe is a set of components, not a flat list of ingredients and steps — V1

### App Structure

```
/app
  (auth)     login, signup
  (studio)   main app
    canvas     generation UI + "Your Kitchen" sidebar
    library    recipe archive + fingerprint heatmap
    brain      Chef Brain UI
    timeline   personal record
    kitchens   drop shop
  api
    generate   streaming route
    brain      compilation job
    webhooks   stripe events
/lib
  prompt-assembler.ts
  fingerprint-cache.ts
  brain-compiler.ts
  memory/
    session.ts       L1 session memory
    preferences.ts   L2 preference memory
    identity.ts      L3 identity memory (Chef Brain)
    patterns.ts      L4 pattern memory
  stage-tracker.ts
  chat-layer.ts
  rating.ts
```

### Database Schema Overview

| Table | Purpose |
|---|---|
| `fingerprints` | Stores chef fingerprints: id, name, prompt_text (~300 tokens), full_profile (JSONB reference of source biographical research), version, updated_at |
| `chef_brains` | Compiled user preferences: user_id, prompt_text (~200 tokens), raw_data (JSONB of source inputs), version |
| `recipes` | Recipes with `prompt_used` JSONB snapshot of all 4 layers, `cooked` boolean, `dev_notes` |
| `sessions` | Cook session records: id, user_id, recipe_id, started_at, ended_at, stages_completed, questions_asked (JSONB), substitutions (JSONB), summary |
| `preferences` | L2 preference memory: user_id, key, value (JSONB), confidence (float), source, updated_at |
| `ideas` | Generated-but-not-cooked recipes: id, user_id, recipe_id, note, status, created_at |
| `ratings` | Post-cook feedback: recipe_id, user_id, cook_again, highlight, change_note, cooked_at |
| `kitchens` | Kitchen Drops: id, name, fingerprint_id, zine_url, available_from, available_to, units_total, units_sold |
| `kitchen_access` | User access to purchased Kitchens: user_id, kitchen_id, granted_at |

### Caching Strategy

| Layer | Cache Location | TTL | Invalidation |
|---|---|---|---|
| System Core | In-memory at startup | Never expires | Never changes |
| Fingerprints | In-memory | 1 hour | On DB update |
| Chef Brains | Redis (Upstash) | 15 minutes per user | On recompilation |

Hot path hits memory/Redis, not Postgres.

---

## V1 / Phase 1 Requirements (Months 1–3: Ship the Core)

### Requirement 1: System Core Prompt Layer

**User Story:** As the product operator, I want a fixed system core prompt that encodes MISE's culinary philosophy and output rules, so that every generation enforces consistent quality standards regardless of fingerprint or user.

#### Acceptance Criteria

1. THE Prompt_Assembler SHALL load the System_Core prompt (~150 tokens) into memory at application startup.
2. THE System_Core SHALL enforce the following output rules for all generations: weights in grams and millilitres, temperatures in Celsius, technique reasons for each method step, seasoning guidance at every stage, acid moment identification, fat decision, and textural contrast.
3. THE System_Core SHALL enforce structured output format for all Recipe_Output objects.
4. THE System_Core SHALL remain constant across all generations — it is not editable by users or per-fingerprint.
5. WHEN the application starts, THE Prompt_Assembler SHALL verify the System_Core is loaded and available before accepting generation requests.

### Requirement 2: Chef Fingerprint Selection

**User Story:** As a home cook, I want to select from predefined chef fingerprints, so that generated recipes match a specific cooking style distilled from deep culinary knowledge.

#### Acceptance Criteria

1. THE MISE application SHALL provide five predefined Fingerprints: Matty Matheson (loud, joyful, big flavours, comfort food, improvisation), Brad Leone (curious, experimental, fermentation, preservation), Ottolenghi (elegant, vegetable-forward, Middle Eastern flavour layering, spice precision), Samin Nosrat (salt/fat/acid/heat fundamentals), and Claire Saffitz (pastry and baking precision).
2. WHEN a user selects a Fingerprint, THE Prompt_Assembler SHALL inject that fingerprint's prompt_text as Layer 2 of the generation prompt for all subsequent requests.
3. THE MISE application SHALL display the currently active Fingerprint on the recipe generation interface.
4. WHEN a Free-tier user attempts to switch fingerprints, THE MISE application SHALL restrict selection to one predefined Fingerprint.
5. WHEN a paid-tier user selects a Fingerprint, THE MISE application SHALL allow selection from all five predefined Fingerprints.
6. THE Recipe_Store SHALL store each Fingerprint with id, name, prompt_text (~300 tokens), full_profile (JSONB reference of the source biographical research), and version number.
7. THE MISE application SHALL restrict Fingerprint editing to the product operator — users select fingerprints but do not edit them.

### Requirement 3: Fingerprint Versioning

**User Story:** As the product operator, I want fingerprints to be versioned so that I can iterate on prompt quality while maintaining a record of which version produced each recipe.

#### Acceptance Criteria

1. WHEN the operator updates a Fingerprint's prompt_text, THE Recipe_Store SHALL increment the fingerprint's version number and persist the updated record.
2. THE Recipe_Store SHALL retain the version number of the Fingerprint used for each generated recipe as part of the Prompt_Snapshot.
3. WHEN a Fingerprint is updated in the database, THE fingerprint cache SHALL invalidate the stale entry and reload from the database on the next request.

### Requirement 4: Chef Brain (Personalization System)

**User Story:** As a regular user, I want the AI to learn my cooking preferences over time from my onboarding answers, development logs, and tasting notes, so that every recipe generation becomes more attuned to my taste without me having to repeat myself.

#### Acceptance Criteria

1. WHEN a user completes onboarding, THE Brain_Compiler SHALL compile the user's onboarding answers into a Chef_Brain prompt fragment (~200 tokens) using Claude Haiku.
2. WHEN a user adds a new development log entry or tasting note, THE Brain_Compiler SHALL recompile the Chef_Brain prompt fragment to reflect the latest data.
3. THE Chef_Brain prompt fragment SHALL cover: flavour biases, pantry constants, technique comfort level, avoid list, cooking context, and recent development notes.
4. THE Recipe_Store SHALL store the compiled Chef_Brain in the `chef_brains` table with user_id, prompt_text, raw_data (JSONB of source inputs), and version number.
5. WHEN a recipe generation request is made, THE Prompt_Assembler SHALL inject the user's compiled Chef_Brain as Layer 3 of the generation prompt.
6. THE MISE application SHALL allow users to view their Chef_Brain summary on the Brain page.
7. THE MISE application SHALL allow users to manually trigger a recompilation of their Chef_Brain.
8. THE Chef_Brain cache SHALL use Redis (Upstash) with a 15-minute TTL per user.
9. WHEN a Chef_Brain is recompiled, THE cache SHALL invalidate the stale entry for that user.

### Requirement 5: Prompt Assembly and Generation

**User Story:** As a home cook, I want to describe a dish idea and receive a complete, structured recipe generated by AI using the full 4-layer prompt, so that I get creative, restaurant-quality recipes personalized to my taste.

#### Acceptance Criteria

1. WHEN a user submits a recipe prompt, THE Prompt_Assembler SHALL fetch all 4 layers in parallel: System_Core (memory), active Fingerprint (memory cache), user's Chef_Brain (Redis cache), and Request_Context (built from UI state).
2. THE Prompt_Assembler SHALL join layers 1–3 (System Core + Fingerprint + Chef Brain) as the system prompt and send layer 4 (Request Context) as the user message to Claude Sonnet.
3. THE Prompt_Assembler SHALL stream the response from Claude Sonnet to the client.
4. THE Recipe_Output SHALL be a component-based structure where each recipe is a set of Recipe_Components (e.g., the braise, the sauce, the garnish), each containing: name, role, ingredients, steps, doneness_cues, can_prep_ahead flag, and prep_ahead_notes.
5. EACH ingredient within a Recipe_Component SHALL include: name, amount (metric — grams and millilitres), unit, function (e.g., "acid structure", "fat", "texture"), essential flag, substitutions (common, dietary, pantry, flavour_shift categories), sourcing notes, and prep instructions.
6. THE Recipe_Output SHALL include an intent section containing: occasion, mood, season, time (total minutes), and effort level.
7. THE Recipe_Output SHALL include a flavour architecture section containing: profile tags, dominant flavour direction, acid notes, fat notes, heat level, sweet level, texture contrasts, and a balance note from the chef.
8. THE Recipe_Output SHALL include a variations section containing: dietary variations, pantry variations, scale notes, and taste profile adjustments.
9. THE Recipe_Output SHALL include a related section containing: sub-recipe references (by ID), pairing suggestions, and a "next level" recommendation.
10. THE Recipe_Output SHALL include a thinking section containing: the chef's approach to the dish, the logic behind the flavour architecture, and the culinary pattern this recipe teaches.
11. THE AI_Client SHALL output valid JSON matching a Zod schema for the Recipe_Output structure.
12. WHEN the AI provider returns a response, THE MISE application SHALL validate the JSON response against the Zod schema before persisting.
13. IF Zod validation fails, THEN THE AI_Client SHALL automatically retry the generation with a correction prompt including the validation errors, up to a maximum of 2 retries.
14. IF all retry attempts fail Zod validation, THEN THE MISE application SHALL display a descriptive error message to the user and offer a manual retry option.
15. THE MISE application SHALL store only structured JSON — markdown is never stored; it is rendered on demand from the structured Recipe_Output.
16. WHEN a recipe is generated, THE Recipe_Store SHALL persist a Prompt_Snapshot in the recipe's `prompt_used` JSONB field containing the exact text of all 4 layers, their version numbers, and token counts.
17. THE MISE application SHALL format the Recipe_Output back into a human-readable display from the structured JSON object.
18. FOR ALL valid Recipe_Output objects, parsing then formatting then parsing SHALL produce an equivalent object (round-trip property).
19. IF the AI provider returns an error or times out, THEN THE AI_Client SHALL display a descriptive error message to the user and offer a retry option.
20. WHILE a recipe generation request is in progress, THE MISE application SHALL display a loading indicator to the user.
21. WHEN a recipe is generated, THE MISE application SHALL present a serving size selector (default 4 servings) as part of the generation flow, and THE Batch_Scaler SHALL calculate ingredient quantities for the selected serving size before displaying the result.

### Requirement 6: Caching Infrastructure

**User Story:** As the product operator, I want prompt layers cached in memory and Redis so that the hot path hits memory/Redis and not Postgres, keeping generation latency low and database load minimal.

#### Acceptance Criteria

1. THE Prompt_Assembler SHALL cache the System_Core prompt in memory at application startup with no expiry.
2. THE Prompt_Assembler SHALL cache Fingerprints in memory with a 1-hour TTL.
3. WHEN a Fingerprint is updated in the database, THE fingerprint cache SHALL invalidate the stale entry.
4. THE Prompt_Assembler SHALL cache Chef_Brain prompt fragments in Redis (Upstash) with a 15-minute TTL per user.
5. WHEN a Chef_Brain is recompiled, THE Redis cache SHALL invalidate the stale entry for that user.
6. THE Prompt_Assembler SHALL resolve all cache lookups before falling back to Postgres queries.

### Requirement 7: User Accounts and Authentication

**User Story:** As a user, I want to create an account and log in, so that my recipes and settings are saved and accessible across sessions.

#### Acceptance Criteria

1. THE Auth_Service SHALL support user registration with email and password using Supabase Auth.
2. WHEN a user registers, THE Auth_Service SHALL create a user record in the Recipe_Store with a unique identifier, email, selected plan tier (defaulting to Free), and creation timestamp.
3. WHEN a user registers, THE Brain_Compiler SHALL trigger an initial Chef_Brain compilation from the onboarding answers.
4. WHEN a user logs in with valid credentials, THE Auth_Service SHALL establish an authenticated session and redirect the user to the generation canvas.
5. IF a user provides invalid credentials, THEN THE Auth_Service SHALL display an error message without revealing whether the email or password was incorrect.
6. WHEN a user logs out, THE Auth_Service SHALL terminate the session and redirect to the login page.
7. THE MISE application SHALL restrict access to the generation canvas to authenticated users only.

### Requirement 8: Recipe Library

**User Story:** As a home cook, I want every generated recipe automatically saved to my personal library, so that I can find, tag, and search my recipes later. This is the retention hook.

#### Acceptance Criteria

1. WHEN a recipe is generated for an authenticated user, THE Recipe_Store SHALL automatically persist the complete Recipe_Output with a unique identifier, creation timestamp, the Fingerprint used (id and version), the Prompt_Snapshot, the `cooked` boolean (defaulting to false), and the user's account identifier.
2. WHEN a user views their Recipe_Library, THE MISE application SHALL display all saved recipes sorted by most recently modified.
3. WHEN a user adds tags to a recipe, THE Recipe_Store SHALL persist the tags and associate them with the recipe record.
4. WHEN a user searches their Recipe_Library by name, ingredient, or tag, THE MISE application SHALL return matching recipes within 500 milliseconds for libraries of up to 1000 recipes.
5. WHEN a user edits a saved recipe's fields (ingredients, method steps, notes), THE Recipe_Store SHALL update the record and store a last-modified timestamp.
6. WHEN a user adds dev_notes to a recipe, THE Recipe_Store SHALL persist the notes in the recipe's `dev_notes` field.
7. WHEN a user marks a recipe as cooked, THE Recipe_Store SHALL update the recipe's `cooked` boolean to true.
8. WHEN a user deletes a recipe, THE Recipe_Store SHALL remove the recipe record from the database.
9. IF a database write operation fails, THEN THE MISE application SHALL display an error message and retain the unsaved data in the UI so the user can retry.
10. WHEN a Free-tier user attempts to save a recipe, THE MISE application SHALL inform the user that the Recipe_Library requires a paid plan.

### Requirement 9: Recipe Versioning and The Dial

**User Story:** As a food creator or restaurant developer, I want to evolve recipes through The Dial — pushing directions like More Acid, Smokier, or Different Region — and see how the recipe develops over time, so that I can iterate on recipe development with a clear history of changes.

#### Acceptance Criteria

1. WHEN a user regenerates a recipe from an existing recipe, THE Version_Store SHALL create a new version linked to the original recipe, preserving the full Recipe_Output and Prompt_Snapshot of both versions.
2. WHEN a user views a recipe's version history, THE MISE application SHALL display a chronological list of all versions with timestamps, the Fingerprint used, the Chef_Brain version, and the Dial direction (where applicable) for each.
3. WHEN a user selects two versions of a recipe, THE MISE application SHALL display a diff view highlighting changes in components, ingredients, method steps, flavour architecture, and notes between the two versions.
4. WHEN a user reverts to a previous version, THE Version_Store SHALL create a new version with the content of the selected historical version (non-destructive revert).
5. THE Version_Store SHALL retain all versions of a recipe indefinitely for paid-tier users.
6. THE MISE application SHALL display The_Dial UI on every recipe with direction options: More Acid, Smokier, More Umami, More Heat, Lighter, Funkier, Different Region, and Riff Mode.
7. WHEN a user pushes a Dial direction, THE AI_Client SHALL generate a full new recipe version via an API call using the current recipe JSON and the selected direction as context, with the full 4-layer prompt applied.
8. WHEN a Dial push generates a new version, THE Version_Store SHALL preserve the previous version and link the new version to the Dial direction that created it.
9. WHEN a user views a recipe with multiple versions, THE MISE application SHALL allow side-by-side comparison of any two versions.
10. THE MISE application SHALL allow users to push The_Dial from any version in the recipe's history, not only the latest version.
11. WHEN a user views a recipe, THE MISE application SHALL display the Dial history showing the sequence of directions pushed and the versions they produced, forming a visible record of how the recipe developed over time.

### Requirement 10: Export as Formatted PDF and Markdown

**User Story:** As a professional cook or content creator, I want to export recipes as clean, formatted PDF cards and Markdown files, so that I can hand recipes to kitchen staff or publish them.

#### Acceptance Criteria

1. WHEN a user exports a recipe as PDF, THE Export_Service SHALL generate a formatted, printable recipe card containing the recipe name, ingredients with quantities, method steps, chef notes, and serving size.
2. WHEN a user exports a recipe as Markdown, THE Export_Service SHALL generate a well-structured Markdown file with proper headings, lists, and formatting.
3. THE Export_Service SHALL include the active scaling (serving size) in the exported output.
4. WHEN a Creator-tier or Brigade-tier user exports a recipe, THE Export_Service SHALL include optional branding (user's name or business name) on the exported document.
5. WHEN a Free-tier user attempts to export, THE MISE application SHALL inform the user that export requires a paid plan.

### Requirement 11: Batch Scaling Calculator

**User Story:** As a home cook or caterer, I want to scale recipe ingredient quantities to different serving sizes within the generation flow, so that weights auto-recalculate elegantly without a separate step.

#### Acceptance Criteria

1. WHEN a user selects a serving size, THE Batch_Scaler SHALL recalculate all ingredient quantities in the Recipe_Output proportionally to the selected serving size.
2. THE Batch_Scaler SHALL maintain metric units (grams and millilitres) for all scaled quantities.
3. THE Batch_Scaler SHALL round scaled quantities to practical cooking measurements (nearest whole gram for quantities above 10g, nearest 0.5g for quantities at or below 10g).
4. WHEN a user enters a custom serving size, THE Batch_Scaler SHALL accept any positive integer and recalculate accordingly.
5. WHEN a recipe is scaled, THE MISE application SHALL display both the original and scaled quantities side by side.
6. THE Batch_Scaler SHALL be integrated into the recipe generation flow, allowing users to set the target serving size before or after generation.

### Requirement 12: Server-Side API Key Management

**User Story:** As a user, I want to use the recipe generation service without needing my own AI API key, so that the experience is seamless and I pay through my subscription.

#### Acceptance Criteria

1. THE MISE application SHALL manage AI provider API keys server-side, stored as encrypted environment variables or in the encrypted `ai_provider_config` database table.
2. THE MISE application SHALL route all AI generation requests through server-side API routes, ensuring API keys are not exposed to the client.
3. THE MISE application SHALL support an AI model abstraction layer where Claude Sonnet (Anthropic API) is the default provider, but the provider is swappable without changing calling code.
4. WHEN an AI provider API key is invalid or expired, THE MISE application SHALL display a service-level error message to the user without exposing the key or provider details.

### Requirement 13: Stripe Billing Integration

**User Story:** As a user, I want to subscribe to a plan tier and manage my billing, so that I can access features appropriate to my usage level.

#### Acceptance Criteria

1. THE Billing_Service SHALL integrate with Stripe to manage four subscription tiers: Free ($0), Home Cook ($9/month), Creator ($19/month), and Brigade ($49/month).
2. WHEN a user selects a paid plan, THE Billing_Service SHALL redirect the user to a Stripe hosted checkout session to complete payment.
3. WHEN Stripe confirms a successful subscription, THE Billing_Service SHALL update the user's plan tier in the Recipe_Store and unlock the corresponding features.
4. WHEN a user cancels their subscription, THE Billing_Service SHALL downgrade the user to the Free tier at the end of the current billing period.
5. THE Billing_Service SHALL handle Stripe webhook events for subscription creation, update, cancellation, and payment failure.
6. IF a payment fails, THEN THE Billing_Service SHALL notify the user via Resend transactional email and provide a grace period of 7 days before downgrading to the Free tier.
7. WHEN a user views their account settings, THE MISE application SHALL display the current plan tier, next billing date, and a link to the Stripe Customer Portal for payment management.
8. THE Billing_Service SHALL support one-time Stripe payments for Kitchen_Drop purchases alongside recurring subscriptions.

### Requirement 14: Rate Limiting and Cost Controls

**User Story:** As the product operator, I want to enforce generation limits per plan tier and cap token usage per request, so that I can control costs and ensure fair usage.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL enforce monthly generation limits per plan tier: Free tier receives 10 generations per month, paid tiers receive unlimited generations.
2. WHEN a Free-tier user exceeds 10 generations in a calendar month, THE Rate_Limiter SHALL reject the generation request and display a message indicating the limit has been reached with an option to upgrade.
3. THE Rate_Limiter SHALL enforce a maximum token cap per AI request to prevent runaway costs (aligned with the ~850 input / ~1200 output token budget per generation).
4. THE Rate_Limiter SHALL track the cost of each generation request (input tokens, output tokens, estimated cost) and store it in the Recipe_Store for operational reporting.
5. WHEN a generation request is rejected due to rate limiting, THE MISE application SHALL display the number of remaining generations and the date when the limit resets.

### Requirement 15: Ingredient Pairing and Substitution

**User Story:** As a home cook, I want AI-powered ingredient pairing suggestions and substitution guidance, so that I can improvise with what I have and discover new flavour combinations.

#### Acceptance Criteria

1. WHEN a user requests ingredient pairing suggestions for a given ingredient, THE AI_Client SHALL return a list of complementary ingredients with brief explanations using the active Fingerprint's style.
2. WHEN a user requests a substitution for a specific ingredient in a recipe, THE AI_Client SHALL return suitable alternatives with quantity adjustments and flavour impact notes.
3. WHEN a user marks ingredients as unavailable in a recipe, THE MISE application SHALL highlight those ingredients and offer substitution suggestions for each.

### Requirement 16: Fermentation and Preservation Tracking

**User Story:** As a home cook interested in fermentation, I want to log and track my fermentation and preservation projects, so that I can monitor progress and record results.

#### Acceptance Criteria

1. WHEN a user creates a Fermentation_Log entry, THE Recipe_Store SHALL persist the log with fields for recipe reference, start date, target duration, temperature, method description, and status (active, completed, failed).
2. WHILE a Fermentation_Log has an active status, THE MISE application SHALL display the elapsed time since the start date.
3. WHEN a user adds a tasting note to a Fermentation_Log, THE Recipe_Store SHALL append the note with a timestamp to the log entry.
4. THE MISE application SHALL display safety guidelines for fermentation and preservation techniques alongside active Fermentation_Log entries.
5. IF a Fermentation_Log's elapsed time exceeds the target duration, THEN THE MISE application SHALL display a notification indicating the fermentation has reached the target duration.

### Requirement 17: Deployment and Infrastructure

**User Story:** As a developer, I want the application deployed on Vercel with Supabase, Upstash, and Resend as supporting services, so that the app is performant, scalable, and easy to maintain.

#### Acceptance Criteria

1. THE MISE application SHALL deploy as a Next.js 14 application on Vercel using the App Router, with zero-config deploys on push.
2. THE MISE application SHALL use Supabase PostgreSQL as the sole relational data persistence layer and Supabase Storage for file storage (recipe exports, zine assets).
3. THE MISE application SHALL use Supabase Auth as the authentication provider.
4. THE MISE application SHALL use Upstash Redis for Chef_Brain caching with 15-minute TTL per user.
5. THE MISE application SHALL use Resend for transactional email (payment failures, account notifications).
6. THE MISE application SHALL store all API keys (AI provider, Stripe, Upstash, Resend) as environment variables, not in source code.
7. WHEN the MISE application starts, THE MISE application SHALL verify database connectivity, Redis connectivity, and load the System_Core into memory before accepting requests.
8. THE MISE application SHALL use Canadian English spelling throughout all user-facing text (e.g., "flavour", "colour", "favourite").

### Requirement 18: Transactional Email

**User Story:** As a user, I want to receive email notifications for important account events, so that I stay informed about billing issues and account changes.

#### Acceptance Criteria

1. WHEN a payment fails, THE MISE application SHALL send a transactional email via Resend notifying the user of the failure and providing a link to update payment details.
2. WHEN a user's subscription is about to be downgraded after the grace period, THE MISE application SHALL send a reminder email via Resend.
3. THE MISE application SHALL send a welcome email via Resend when a user completes registration.

### Requirement 19: Seven Display Modes

**User Story:** As a cook, I want to view the same recipe in different modes depending on my context — a quick reminder, a full document, an active cooking guide, a flavour map, a shopping list, a timeline, or just the intention — so that I get the right information at the right time without regenerating.

#### Acceptance Criteria

1. THE MISE application SHALL support seven Display_Modes, all rendered as pure functions from the same stored Recipe JSON with no additional API calls for switching between modes.
2. THE MISE application SHALL render "The Full Recipe" mode as the default view, displaying the complete recipe in a traditional format with all components, ingredients, steps, and notes.
3. THE MISE application SHALL render "The Brief" mode as a single-screen summary for experienced cooks, showing key components, ingredients, and steps without detailed explanation.
4. THE MISE application SHALL render "The Cook" mode as a stage-by-stage active cooking interface, displaying one stage at a time with sensory doneness cues for each stage (ties into V2 Stage_Tracker).
5. THE MISE application SHALL render "The Flavour Map" mode showing only the flavour architecture — profile, dominant direction, acid, fat, heat, sweet, texture contrasts, and balance note — with no amounts or method steps.
6. THE MISE application SHALL render "The Shopping List" mode with ingredients grouped by store section, pantry constants from Chef_Brain marked as "already have", and a Quality_Highlight sentence identifying the one ingredient where quality makes the biggest difference to the final dish.
7. THE MISE application SHALL render "The Timeline" mode working backward from a user-specified serve time, displaying all components as horizontal bars with durations and parallel task identification.
8. THE MISE application SHALL render "The Riff" mode showing only the recipe's intention and flavour architecture with no amounts — designed for experienced cooks who want the idea, not the prescription.
9. WHEN a user switches between Display_Modes, THE MISE application SHALL render the selected mode immediately from the stored Recipe JSON without making an API call.

### Requirement 20: Complexity Modes

**User Story:** As a cook of varying experience, I want to select a complexity level before or after generation — Foundation for learning, Kitchen for everyday cooking, Riff for when I just need the architecture — so that the recipe matches my skill level and intent.

#### Acceptance Criteria

1. THE MISE application SHALL support three Complexity_Modes: Foundation, Kitchen, and Riff.
2. WHEN a user selects Foundation mode, THE Prompt_Assembler SHALL instruct the AI to generate recipes with additional explanation at each step, doneness cues at every stage, conservative seasoning guidance, and proactive substitution suggestions.
3. WHEN a user selects Kitchen mode (the default), THE Prompt_Assembler SHALL instruct the AI to generate recipes in a professional but approachable tone with standard detail level.
4. WHEN a user selects Riff mode, THE Prompt_Assembler SHALL instruct the AI to generate recipes containing only the architecture and intention — no precise amounts, minimal step-by-step instruction — for experienced cooks.
5. THE MISE application SHALL allow users to select a Complexity_Mode before generation as part of the generation flow.
6. THE MISE application SHALL allow users to switch Complexity_Mode after generation, triggering a regeneration of the recipe at the new complexity level.
7. THE MISE application SHALL remember each user's preferred Complexity_Mode as a default across sessions.
8. THE MISE application SHALL allow users to override their default Complexity_Mode on a per-recipe basis.

### Requirement 21: Shopping List with Quality Highlight

**User Story:** As a home cook heading to the store, I want a shopping list grouped by store section that knows what I already have and tells me the one ingredient worth splurging on, so that I shop efficiently and spend wisely where it matters.

#### Acceptance Criteria

1. WHEN a user views The Shopping List Display_Mode, THE MISE application SHALL group all ingredients across all Recipe_Components by store section (produce, dairy, meat, pantry, spice, etc.).
2. WHEN a user has pantry constants defined in their Chef_Brain, THE MISE application SHALL mark matching ingredients as "already have" in the shopping list.
3. THE MISE application SHALL generate a Quality_Highlight — a single sentence identifying the one ingredient where quality makes the biggest difference to the final dish, derived from the recipe's flavour architecture.
4. THE Quality_Highlight SHALL be a concise, actionable sentence (not a list) that explains why this specific ingredient matters for this specific dish.

---

## V2 / Phase 2 Requirements (Months 4–6: Make It Feel Like a Studio)

### Requirement 22: Custom Fingerprint Builder

**User Story:** As a Creator-tier user, I want to build custom fingerprints by picking inspirations, describing my cooking style, and setting flavour biases, so that I have a unique AI cooking voice that nobody else can replicate. This is the product's moat.

#### Acceptance Criteria

1. WHEN a Creator-tier or Brigade-tier user accesses the Custom_Fingerprint_Builder, THE MISE application SHALL present a form with fields for name, inspirations (selectable from existing fingerprints), cooking style description, flavour biases, and signature traits.
2. WHEN a user submits a custom fingerprint form, THE Prompt_Assembler SHALL generate a fingerprint prompt_text from the provided inputs and persist the custom Fingerprint to the Recipe_Store with a version number.
3. WHEN a user edits a custom Fingerprint, THE MISE application SHALL display a live preview showing how the fingerprint's tone affects a sample recipe snippet.
4. IF a custom fingerprint form contains empty required fields, THEN THE MISE application SHALL display inline validation errors identifying the missing fields.
5. WHEN a user deletes a custom fingerprint, THE MISE application SHALL remove the fingerprint and fall back to the first default Fingerprint if the deleted fingerprint was active.
6. THE MISE application SHALL restrict access to the Custom_Fingerprint_Builder to Creator-tier and Brigade-tier users.

### Requirement 23: Recipe Canvas with "Your Kitchen" Sidebar

**User Story:** As a recipe developer, I want a split-view canvas with the recipe on the left and a context-aware "Your Kitchen" sidebar on the right, so that I have memory suggestions, cooking tools, and post-cook feedback all in one place without losing context.

#### Acceptance Criteria

1. WHEN a user opens a recipe in the Recipe_Canvas, THE MISE application SHALL display the recipe content in a left panel and the "Your Kitchen" sidebar in a right panel.
2. THE "Your Kitchen" sidebar SHALL support three modes: Before Cooking, During Cooking, and After Cooking.
3. WHILE the sidebar is in Before Cooking mode, THE MISE application SHALL display memory-based suggestions from Preference_Memory (e.g., "You usually double the preserved lemon in these. Want me to adjust?") and a pantry availability check.
4. WHILE the sidebar is in During Cooking mode, THE MISE application SHALL display the Stage_Tracker and the context-aware Chat_Layer.
5. WHILE the sidebar is in After Cooking mode, THE MISE application SHALL display the Rating_System and a dev notes entry form.
6. WHEN a user adds or edits notes in the Recipe_Canvas, THE Recipe_Store SHALL persist the notes associated with the recipe record.
7. THE Recipe_Canvas SHALL allow users to highlight specific sections of the recipe (ingredients, method steps) and attach notes to those sections.
8. WHEN a user navigates away from the Recipe_Canvas, THE MISE application SHALL auto-save any unsaved notes.
9. THE Recipe_Canvas SHALL be a frontend-only build with no new external service dependencies.

### Requirement 24: Four-Layer Memory System

**User Story:** As a regular user, I want MISE to remember my cooking patterns across sessions at multiple levels of depth, so that the app gets smarter about my preferences without me having to repeat myself.

#### Acceptance Criteria

1. THE MISE application SHALL implement four memory layers: L1 Session_Memory (ephemeral, this cook), L2 Preference_Memory (builds over weeks), L3 Identity_Memory (compiled Chef Brain), and L4 Pattern_Memory (inferred, invisible to user).
2. WHEN a user starts a cook session, THE MISE application SHALL create a Session_Memory record in the browser state with a lightweight database record in the `sessions` table containing user_id, recipe_id, started_at, stages_completed, questions_asked (JSONB), and substitutions (JSONB).
3. WHEN a cook session ends, THE MISE application SHALL persist the session summary to the `sessions` table with ended_at and summary fields, and clear the browser-side Session_Memory.
4. WHEN a user completes a rating, adds a dev note, or asks a question during cooking, THE MISE application SHALL update the `preferences` table with structured key-value entries including a confidence score (float) and source attribution.
5. THE Preference_Memory SHALL be queryable and visible to the user on the Brain page.
6. THE Identity_Memory SHALL be the compiled Chef_Brain (~200-token prompt layer), recompiled on signup, after dev log entries, and on a weekly schedule.
7. THE Pattern_Memory SHALL track cooking frequency, fingerprint preferences, technique progression, and flavour exploration patterns without displaying raw pattern data to the user.
8. THE Pattern_Memory SHALL shape recommendations surfaced by the Next_Step feature and memory suggestions in the Recipe_Canvas sidebar.

### Requirement 25: Stage Tracker (Cooking Companion)

**User Story:** As a home cook actively cooking a recipe, I want the recipe broken into clear stages with sensory-driven transitions and a context-aware chat, so that I can follow along hands-free and ask questions without leaving the cooking flow.

#### Acceptance Criteria

1. WHEN a user activates "Cook this now" on a recipe, THE Stage_Tracker SHALL break the recipe into stages: PREP, ACTIVE, WAITING, FINISH, and PLATE.
2. THE Stage_Tracker SHALL describe each stage transition using sensory cues (what to see, smell, or feel) rather than relying solely on timers.
3. WHILE a user is in a cooking stage, THE Chat_Layer SHALL be context-aware and know the current stage, the full recipe, and the user's Chef_Brain.
4. WHEN a user asks a question during cooking, THE Stage_Tracker SHALL log the question to the Session_Memory (questions_asked JSONB) for pattern detection.
5. THE Stage_Tracker SHALL include a Tools_Drawer containing: multiple simultaneous timers, a unit converter, a temperature guide, a substitution lookup, and a scaling calculator.
6. WHEN a user starts a timer in the Tools_Drawer, THE Stage_Tracker SHALL support multiple simultaneous timers with independent countdowns and audible notifications.
7. WHEN a user makes a substitution during cooking, THE Stage_Tracker SHALL log the substitution to the Session_Memory (substitutions JSONB).
8. WHEN a user completes all stages, THE Stage_Tracker SHALL transition the sidebar to After Cooking mode and prompt the Rating_System.

### Requirement 26: Rating System (Post-Cook Feedback)

**User Story:** As a home cook who just finished cooking, I want a quick, structured feedback flow instead of star ratings, so that my feedback is meaningful and feeds back into my Chef Brain and preference memory.

#### Acceptance Criteria

1. WHEN a user completes a cook session, THE Rating_System SHALL present three sequential questions: (1) "Would you cook this again?" with options Absolutely, Maybe tweaked, Probably not; (2) "What was the highlight?" with options Flavour, Technique, The occasion, Surprised me; (3) "One thing you'd change?" with options Nothing, More acid, Different texture, Different technique, Something else.
2. WHEN a user selects "Something else" for the third question, THE Rating_System SHALL open a free-text field for the user's response.
3. WHEN a user submits a rating, THE Recipe_Store SHALL persist the rating in the `ratings` table with recipe_id, user_id, cook_again, highlight, change_note, and cooked_at timestamp.
4. WHEN a user submits a rating with a free-text "Something else" response, THE MISE application SHALL write the response directly to the `preferences` table as an L2 Preference_Memory entry.
5. WHEN a rating is submitted, THE Brain_Compiler SHALL trigger a recompilation of the user's Chef_Brain to incorporate the new feedback.
6. WHEN a user views their Recipe_Library, THE MISE application SHALL display a Fingerprint_Heatmap showing which fingerprints the user has loved over time based on rating data.

### Requirement 27: Chat Layer (Context-Aware Conversation)

**User Story:** As a user, I want a chat interface that automatically adapts its mode based on whether I'm browsing, cooking, or reflecting, so that responses are always appropriate to my current context.

#### Acceptance Criteria

1. THE Chat_Layer SHALL support three auto-switching modes: Discovery (not cooking — exploratory, conversational), Active Cooking (short, direct answers — context-aware of current stage), and Development (post-cook debrief — reflective, connects to tasting notes).
2. WHEN a user is not in a cook session, THE Chat_Layer SHALL operate in Discovery mode with conversational, exploratory responses.
3. WHILE a user is in an active cook session, THE Chat_Layer SHALL operate in Active Cooking mode with short, direct answers that reference the current cooking stage.
4. WHEN a cook session ends and the user is reviewing the recipe, THE Chat_Layer SHALL switch to Development mode with reflective responses that connect to tasting notes and iteration history.
5. THE Chat_Layer SHALL have access to the user's Chef_Brain, the current recipe, and the user's cooking history for context.
6. THE Chat_Layer SHALL persist all chat history and make it permanently accessible in the Timeline.
7. WHEN a user asks a question in the Chat_Layer, THE MISE application SHALL log the question for Chef_Brain recompilation on the next compilation cycle.

### Requirement 28: Timeline (Personal Record)

**User Story:** As a user, I want a chronological personal record of everything I've done in MISE — generations, questions, cook sessions, ratings, notes, and ideas — so that I can reflect on my cooking development over time.

#### Acceptance Criteria

1. THE Timeline SHALL display a chronological record of: recipe generations, questions asked (from Chat_Layer), cook sessions (from Stage_Tracker), ratings (from Rating_System), dev notes, and ideas.
2. WHEN a recipe is generated but not cooked, THE MISE application SHALL auto-file the recipe as an Idea in the `ideas` table with user_id, recipe_id, status (defaulting to "uncooked"), and created_at.
3. WHEN a user adds an annotation to an Idea, THE Recipe_Store SHALL persist the annotation in the idea's note field.
4. THE Timeline SHALL be filterable by entry type (generations, sessions, ratings, ideas, notes).
5. THE Timeline SHALL be searchable by text content across all entry types.
6. THE MISE application SHALL restrict Timeline access to authenticated users viewing their own data.

### Requirement 29: Pantry Mode

**User Story:** As a daily home cook, I want to tell the app what ingredients I have on hand and get recipes generated around those ingredients, so that I reduce waste and cook with what I have. High-value daily driver feature.

#### Acceptance Criteria

1. WHEN a user activates Pantry_Mode and enters a list of available ingredients, THE AI_Client SHALL generate recipes constrained to use primarily those ingredients, with the full 4-layer prompt applied.
2. WHEN a Pantry_Mode recipe requires ingredients not in the user's list, THE MISE application SHALL clearly mark those ingredients as "additional" in the Recipe_Output.
3. THE MISE application SHALL allow users to save their pantry ingredient list for reuse across sessions.

### Requirement 30: Recipe Collections and Menus

**User Story:** As a content creator or caterer, I want to group recipes into collections (dinner party menu, weekly meal plan, restaurant tasting menu) and generate shopping lists from them, so that I can plan and organize efficiently.

#### Acceptance Criteria

1. WHEN a user creates a Collection, THE Recipe_Store SHALL persist the collection with a name, description, and ordered list of recipe references.
2. WHEN a user adds or removes recipes from a Collection, THE Recipe_Store SHALL update the collection's recipe list.
3. WHEN a user requests a shopping list for a Collection, THE MISE application SHALL aggregate all ingredients across the collection's recipes, combining duplicate ingredients and summing quantities.
4. THE MISE application SHALL restrict Collection creation to Creator-tier and Brigade-tier users.

### Requirement 31: Tasting Notes and Iteration Log

**User Story:** As a recipe developer, I want to add structured tasting notes to recipes that feed back into the next generation and trigger Chef Brain recompilation, so that each iteration improves based on real cooking feedback.

#### Acceptance Criteria

1. WHEN a user adds a tasting note to a recipe, THE Recipe_Store SHALL persist the note with a timestamp, structured fields (taste, texture, appearance, aroma, overall rating), and free-text comments.
2. WHEN a user adds a tasting note, THE Brain_Compiler SHALL trigger a recompilation of the user's Chef_Brain to incorporate the new feedback.
3. WHEN a user regenerates a recipe that has tasting notes, THE AI_Client SHALL include the most recent tasting notes as context in the Request_Context (Layer 4), so the AI can address the feedback.
4. THE MISE application SHALL display a chronological iteration log showing all tasting notes alongside the corresponding recipe version.

### Requirement 32: Social Login

**User Story:** As a user, I want to log in with my Google or GitHub account, so that registration and login are faster and easier.

#### Acceptance Criteria

1. WHEN a user selects Google login, THE Auth_Service SHALL authenticate the user via Supabase Auth's Google OAuth provider and create or link the user account.
2. WHEN a user selects GitHub login, THE Auth_Service SHALL authenticate the user via Supabase Auth's GitHub OAuth provider and create or link the user account.
3. IF a social login email matches an existing email/password account, THEN THE Auth_Service SHALL link the social identity to the existing account.

### Requirement 33: Shared Recipes and Favourites

**User Story:** As a user, I want to share recipes publicly and bookmark recipes I like, so that I can build a community around great recipes.

#### Acceptance Criteria

1. WHEN a user marks a recipe as public, THE Recipe_Store SHALL make the recipe accessible via a shareable URL without requiring authentication to view.
2. WHEN a user bookmarks a recipe (their own or a shared recipe), THE Recipe_Store SHALL persist the bookmark in the user's favourites list.
3. WHEN a user views their favourites, THE MISE application SHALL display all bookmarked recipes sorted by most recently bookmarked.

### Requirement 34: Celebrity Chef Fingerprints

**User Story:** As a user, I want access to additional curated fingerprints modelled after well-known cooking styles, so that I have more variety and inspiration in recipe generation.

#### Acceptance Criteria

1. THE MISE application SHALL provide additional curated Fingerprints beyond the initial five, each modelling a distinct and well-known cooking style distilled from biographical research.
2. WHEN a new celebrity chef fingerprint is added, THE Prompt_Assembler SHALL apply the fingerprint's prompt_text consistently with the same quality standard as the default five fingerprints.

### Requirement 35: Enhanced PDF Export

**User Story:** As a content creator, I want beautifully styled PDF recipe cards generated from custom HTML templates, so that my exports look professional and match my brand.

#### Acceptance Criteria

1. WHEN a user exports a recipe as PDF in V2, THE Export_Service SHALL render a styled HTML template and convert it to PDF using a headless Chrome library (Puppeteer) or a rendering service (Browserless).
2. THE Export_Service SHALL support multiple PDF template styles that users can select from.
3. WHEN a Creator-tier or Brigade-tier user exports a recipe, THE Export_Service SHALL apply the user's branding (name, logo, colour scheme) to the styled HTML template before rendering to PDF.
4. THE Export_Service SHALL generate PDFs server-side to avoid exposing rendering infrastructure to the client.

### Requirement 36: Responsive Layouts (Phone, Tablet, Desktop)

**User Story:** As a user, I want MISE to work well on my phone while cooking, my tablet as the ideal cooking device, and my desktop as a full studio, so that I can use the right device for each context.

#### Acceptance Criteria

1. WHEN a user accesses MISE on a phone-sized viewport (below 768px), THE MISE application SHALL prioritize the Stage_Tracker and Chat_Layer as the primary interface with large tap targets and the screen staying on during an active cook session.
2. WHEN a user accesses MISE on a tablet-sized viewport (768px–1024px), THE MISE application SHALL display the full Recipe_Canvas split view with the Stage_Tracker accessible in a bottom drawer.
3. WHEN a user accesses MISE on a desktop-sized viewport (above 1024px), THE MISE application SHALL display the full studio layout with both Recipe_Canvas panels visible and the Recipe_Library accessible in a sidebar or navigation.
4. THE MISE application SHALL use responsive breakpoints consistently across all views to ensure usability at each viewport size.

### Requirement 37: Progressive Web App (PWA)

**User Story:** As a home cook, I want to install MISE on my home screen and have offline access to my generated recipes and timers, so that I can cook without worrying about connectivity.

#### Acceptance Criteria

1. THE MISE application SHALL support PWA installation via a web app manifest, enabling home screen installation on mobile and desktop.
2. WHEN a user has previously generated recipes, THE MISE application SHALL cache those recipes for offline viewing using a service worker.
3. WHILE the user is offline, THE Stage_Tracker timers SHALL continue to function with audible notifications.
4. WHILE the user is offline, THE MISE application SHALL display a clear indicator that the app is in offline mode and generation features are unavailable.
5. WHEN connectivity is restored, THE MISE application SHALL sync any offline actions (ratings, notes, session data) to the Recipe_Store.

### Requirement 38: Multi-Dish Timeline

**User Story:** As a home cook planning a dinner party, I want to combine multiple recipes into a single interleaved timeline working backward from serve time, so that I can coordinate all dishes and know exactly when to start each component.

#### Acceptance Criteria

1. WHEN a user selects multiple recipes and a shared serve time, THE MISE application SHALL generate a multi-dish timeline that interleaves all Recipe_Components from all selected recipes into a single kitchen schedule.
2. THE multi-dish timeline SHALL work backward from the specified serve time, assigning start times to each component based on duration and dependencies.
3. THE multi-dish timeline SHALL identify free-time windows where no active cooking is required.
4. THE multi-dish timeline SHALL identify prep-ahead opportunities — components from any recipe that can be prepared in advance — with notes on how far ahead they can be prepped.
5. WHEN a user views the multi-dish timeline, THE MISE application SHALL display each entry with the recipe name, component name, start time, and duration.

### Requirement 39: Building Blocks Library Lookup During Generation

**User Story:** As a cook who has perfected my own tahini or preserved lemon method, I want MISE to use my existing sub-recipes during generation instead of generating generic ones, so that my recipes build on my personal library of perfected techniques.

#### Acceptance Criteria

1. WHEN a recipe generation request is made, THE Prompt_Assembler SHALL check the user's Building_Block library for existing sub-recipe versions that match components the AI would otherwise generate.
2. WHEN a matching Building_Block is found, THE AI_Client SHALL use the user's existing sub-recipe instead of generating a generic version, incorporating the Building_Block's ingredients and steps into the parent recipe.
3. WHEN a generated recipe uses Building_Blocks from the user's library, THE Recipe_Output SHALL note which library items were used and reference them by ID.
4. IF no matching Building_Block exists in the user's library, THEN THE AI_Client SHALL generate the sub-recipe component as normal.

---

## V3 / Phase 3 Requirements (Months 7–12: The Community and the Drops)

### Requirement 40: Next Step Feature (Swipeable Suggestions)

**User Story:** As a developing cook, I want MISE to suggest what to cook next based on my history and patterns, so that I keep growing and exploring without having to think about what's next.

#### Acceptance Criteria

1. THE Next_Step feature SHALL present a swipeable card deck of recipe suggestions drawn from the user's Pattern_Memory and Preference_Memory.
2. THE Next_Step feature SHALL generate three card types: The Stretch (a new technique connecting to the user's existing strengths), The Deepener (more of what the user loves), and The Wild Card (something unexpected based on pattern gaps).
3. WHEN a user swipes left on a Next_Step card, THE MISE application SHALL dismiss the card and show another suggestion.
4. WHEN a user swipes right on a Next_Step card, THE MISE application SHALL generate a full recipe using the suggestion as the Request_Context with the full 4-layer prompt.
5. THE Next_Step feature SHALL incorporate Idea annotations from the Timeline when generating suggestions.
6. THE Next_Step feature SHALL surface at contextually appropriate moments based on cooking patterns (e.g., after a cook session, when browsing the library).

### Requirement 41: Sharing and Recipe Cards

**User Story:** As a user, I want to share beautifully formatted recipe cards on social media that link back to my public MISE profile, so that my friends can see what I'm cooking and try it through their own Chef Brain.

#### Acceptance Criteria

1. WHEN a user shares a recipe, THE MISE application SHALL generate a Recipe_Card image containing the fingerprint tag, recipe title, and a flavour note.
2. THE Recipe_Card SHALL link to a read-only version of the recipe on the user's public MISE profile.
3. WHEN a viewer accesses a shared recipe link, THE MISE application SHALL display the recipe without requiring authentication.
4. WHEN an authenticated viewer views a shared recipe, THE MISE application SHALL offer the option to save the recipe to their own library or generate their own version through their Chef_Brain.
5. THE OG_Image_Generator SHALL generate Open Graph images server-side for all shared recipe links, ensuring rich previews on social platforms.
6. THE MISE application SHALL include the sharing growth loop: see card → want to cook it through own lens → sign up.

### Requirement 42: Public MISE Profiles

**User Story:** As a content creator, I want a public profile page showing my cooking identity and shared recipes, so that I can build an audience and showcase my culinary development.

#### Acceptance Criteria

1. WHEN a user enables their public profile, THE MISE application SHALL create a publicly accessible profile page displaying the user's name, bio, favourite fingerprints, and shared recipes.
2. THE public profile SHALL display shared recipes in a visually appealing grid with Recipe_Card thumbnails.
3. WHEN a visitor views a public profile, THE MISE application SHALL not require authentication.
4. THE MISE application SHALL restrict public profile creation to paid-tier users.

### Requirement 43: Kitchen Drops

**User Story:** As a user, I want to purchase themed Kitchen Drops that unlock curated recipe collections, technique guides, and downloadable zines, so that I can explore focused culinary experiences.

#### Acceptance Criteria

1. THE Billing_Service SHALL support one-time Stripe payments for Kitchen_Drop purchases.
2. WHEN a user purchases a Kitchen_Drop, THE Recipe_Store SHALL create a `kitchen_access` record granting the user access to the Kitchen's content.
3. THE Recipe_Store SHALL store each Kitchen_Drop in the `kitchens` table with id, name, fingerprint_id, zine_url, available_from, available_to, units_total, and units_sold.
4. WHEN a Kitchen_Drop reaches units_total sold, THE MISE application SHALL mark the Kitchen as sold out and prevent further purchases.
5. WHEN a user accesses a purchased Kitchen, THE MISE application SHALL display the curated recipe collection, technique guides, and a link to the Zine_Viewer.
6. THE Zine_Viewer SHALL render Kitchen zine content as a browsable, styled reading experience within the application.
7. THE MISE application SHALL make Kitchen_Drop purchases available to all tiers, including Free.

### Requirement 44: Team Workspaces

**User Story:** As a Brigade-tier restaurant team, I want a shared workspace where my team can collaborate on a recipe library with commenting and status tracking, so that we can develop menus together.

#### Acceptance Criteria

1. WHEN a Brigade-tier user creates a Team_Workspace, THE Recipe_Store SHALL create a shared workspace with row-level security in Supabase, restricting access to invited team members.
2. WHEN a team member is invited to a Team_Workspace, THE MISE application SHALL grant the invited user access to the shared recipe library and collections.
3. WHEN a team member adds a comment to a shared recipe, THE Recipe_Store SHALL persist the comment with the author's identity and timestamp.
4. THE Team_Workspace SHALL support shared library views where all team members can see, search, and filter the team's recipes.
5. THE MISE application SHALL restrict Team_Workspace creation and management to Brigade-tier users.

### Requirement 45: Recipe Forking

**User Story:** As a cook who found a great shared recipe, I want my version to fork from the original when I save and cook it, so that I can evolve it independently while maintaining a link to where it came from — and the original author can see how their recipe inspired others.

#### Acceptance Criteria

1. WHEN an authenticated user saves and cooks a shared recipe, THE Recipe_Store SHALL create a Recipe_Fork linked to the parent recipe version.
2. THE Recipe_Fork SHALL be an independent copy that the forking user can modify, dial, and version without affecting the original recipe.
3. WHEN a user views a forked recipe, THE MISE application SHALL display a link to the original parent recipe and the version it was forked from.
4. WHEN an original author views their recipe, THE MISE application SHALL display a list of forks created by other users.
5. THE MISE application SHALL allow the original author to view any fork and push The_Dial from a forked version.
6. WHEN a user views a recipe with forks, THE MISE application SHALL display the fork tree showing the relationship between the original, its versions, and all forks.
