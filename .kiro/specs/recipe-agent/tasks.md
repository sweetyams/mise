# Implementation Plan: MISE — Culinary Development Engine (V1)

## Overview

V1 ships the core recipe generation engine with the 4-layer prompt architecture, component-based recipe model with Zod validation, The Dial (recipe evolution tool), The Thinking field, seven display modes, three complexity modes, shopping list with Quality Highlight, user accounts, recipe library with versioning, export, scaling, billing, fermentation tracking, ingredient pairing/substitution, and admin controls. All code is TypeScript (Next.js 14 App Router) with Supabase, Upstash Redis, Stripe, Anthropic API, and Resend.

## Tasks

- [x] 1. Project Foundation & Infrastructure
  - [x] 1.1 Initialize Next.js 14 project with App Router, TypeScript, Tailwind CSS, and ESLint
    - Create the project with `create-next-app` using App Router
    - Set up folder structure:
      ```
      /app/(auth)/login, /app/(auth)/signup
      /app/(studio)/canvas, /app/(studio)/library, /app/(studio)/brain
      /app/api/generate, /app/api/brain, /app/api/webhooks
      /lib/prompt-assembler.ts, /lib/fingerprint-cache.ts, /lib/brain-compiler.ts
      /lib/ai-provider/, /lib/batch-scaler.ts, /lib/zod-schemas.ts
      /lib/rate-limiter.ts, /lib/billing-service.ts, /lib/export-service.ts
      /lib/auth-service.ts, /lib/version-store.ts, /lib/email-service.ts
      /lib/display-renderers/, /lib/dial.ts, /lib/complexity-modes.ts
      ```
    - Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `@upstash/redis`, `stripe`, `@anthropic-ai/sdk`, `resend`, `zod`, `fast-check` (dev)
    - Create `.env.local.example` with all required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `AI_PROVIDER` (default: `claude`)
    - _Requirements: 17.1, 17.6_

  - [x] 1.2 Create Supabase database schema with all V1 tables, indexes, and RLS policies
    - Create SQL migration file with all V1 tables:
      - `users` (id, email, tier, stripe_customer_id, default_complexity_mode, generation_count_this_month, generation_count_reset_date, pantry_constants JSONB, created_at, updated_at)
      - `fingerprints` (id, name, prompt_text, full_profile JSONB, version, is_default, created_at, updated_at)
      - `chef_brains` (id, user_id FK, prompt_text, raw_data JSONB, version, compiled_at)
      - `recipes` (id, user_id FK, fingerprint_id FK, title, version, fingerprint_hash, intent JSONB, flavour JSONB, components JSONB, timeline JSONB, variations JSONB, related JSONB, thinking JSONB, prompt_used JSONB, complexity_mode, cooked, dev_notes, tags JSONB, is_public, created_at, updated_at)
      - `recipe_versions` (id, recipe_id FK, version_number, recipe_data JSONB, prompt_snapshot JSONB, dial_direction, created_at)
      - `recipe_forks` (id, source_recipe_id FK, source_version, forked_recipe_id FK, forked_by_user_id FK, forked_at) — V3 UI but table exists from V1
      - `sub_recipe_refs` (id, parent_recipe_id FK, child_recipe_id FK, role, created_at) — data model readiness
      - `fermentation_logs` (id, recipe_id FK, user_id FK, start_date, target_duration_days, temperature, method_description, status, created_at, updated_at)
      - `tasting_notes` (id, recipe_id FK, user_id FK, taste, texture, appearance, aroma, overall, comments, created_at)
      - `ai_provider_config` (id, provider_name, api_key_encrypted, model_id, is_active, created_at, updated_at)
      - `generation_costs` (id, user_id FK, recipe_id FK, input_tokens, output_tokens, estimated_cost, created_at)
    - Create all indexes: `recipes(user_id, updated_at DESC)`, GIN trigram on `recipes.title`, GIN on `recipes.components` for ingredient search, GIN on `recipes.tags`, `recipes(fingerprint_id)`, GIN on `recipes.intent`, `sub_recipe_refs(parent_recipe_id)`, `sub_recipe_refs(child_recipe_id)`, `chef_brains(user_id)` unique, `fingerprints(is_default)`, `fermentation_logs(user_id, status)`, `ratings(user_id, recipe_id)`, `preferences(user_id, key)` unique, `generation_costs(user_id, created_at)`, `sessions(user_id, started_at DESC)`, `ideas(user_id, status)`
    - Create RLS policies: users read/write own rows for `recipes`, `chef_brains`, `recipe_versions`, `fermentation_logs`, `tasting_notes`, `generation_costs`; `fingerprints` readable by all authenticated, writable by service role only; `ai_provider_config` readable/writable by service role only
    - _Requirements: 2.6, 4.4, 8.1, 9.1, 9.8, 16.1, 17.2_

  - [x] 1.3 Set up Supabase client utilities and Upstash Redis client
    - Create `/lib/supabase/server.ts` for server-side Supabase client (using `@supabase/ssr`)
    - Create `/lib/supabase/client.ts` for browser-side Supabase client
    - Create `/lib/redis.ts` for Upstash Redis client initialization
    - _Requirements: 17.2, 17.4_

- [x] 2. Core Data Model & Validation
  - [x] 2.1 Define TypeScript interfaces for the full Recipe data model
    - Create `/lib/types/recipe.ts` with all interfaces matching the design: `Recipe`, `Component`, `Ingredient`, `Substitution`, `Step`, `TasteProfile`, `AcidNote`, `FatNote`, `HeatNote`, `SweetNote`, `TextureContrast`, `Variation`, `ScaleNote`, `TimelineStage`
    - Include `intent` interface (occasion, mood, season[], time, effort)
    - Include `flavour` interface (profile[], dominant, acid[], fat[], heat, sweet, texture[], balance)
    - Include `thinking` interface (approach, architecture, pattern)
    - Include `related` interface (sub_recipes[], pairs_with[], next_level)
    - Include `variations` interface (dietary[], pantry[], scale, profiles[])
    - Define `ComplexityMode = 'foundation' | 'kitchen' | 'riff'`
    - Define `DialDirection` type with all 8 directions
    - Define `PromptLayer`, `AssembledPrompt`, `PromptSnapshot` interfaces
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [x] 2.2 Implement Zod schema for Recipe validation
    - Create `/lib/zod-schemas.ts` with complete `RecipeSchema` matching the `Recipe` interface
    - Include nested schemas: `ComponentSchema`, `IngredientSchema`, `SubstitutionSchema`, `StepSchema`, `TasteProfileSchema`, `IntentSchema`, `FlavourSchema`, `ThinkingSchema`, `RelatedSchema`, `VariationsSchema`
    - Enforce: title non-empty, components non-empty array, each component has ingredients[], steps[], doneness_cues[]
    - Enforce: intent.effort is one of 'low' | 'medium' | 'high' | 'project'
    - Enforce: flavour has valid architecture fields
    - Implement `validateRecipe(data): { valid: boolean; errors: string[] }`
    - _Requirements: 5.4, 5.6, 5.11, 5.12_

  - [x] 2.3 Implement Zod validation with retry logic
    - Create `/lib/zod-validation.ts` with structured generation validation
    - Implement `generateStructuredRecipe()`: call AI, parse JSON, validate against Zod schema
    - On validation failure: build correction prompt including Zod error messages, retry up to 2 times
    - On JSON parse failure: retry with correction prompt including parse error
    - On all retries exhausted: return descriptive error for user display with manual retry option
    - _Requirements: 5.11, 5.12, 5.13, 5.14_

- [x] 3. Core Prompt Architecture (Backend)
  - [x] 3.1 Implement System Core prompt layer with in-memory loading
    - Create `/lib/system-core.ts` with the System Core prompt text (~150 tokens) encoding MISE's culinary philosophy: weights in grams/ml, Celsius, technique reasons, seasoning at every stage, acid moment/fat decision/textural contrast, structured JSON output rules, component-based recipe structure
    - Load System Core into a module-level constant at import time (in-memory, never expires)
    - Export `getSystemCore(): PromptLayer` function
    - Add startup verification that System Core is loaded before accepting requests
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1_

  - [x] 3.2 Implement Fingerprint cache with in-memory 1hr TTL and CRUD for operator
    - Create `/lib/fingerprint-cache.ts` implementing `CachedFingerprint` interface
    - Implement `getFingerprint(id)`, `invalidateFingerprint(id)`, `preloadFingerprints()` with 1-hour TTL
    - On cache miss, fall back to Supabase `fingerprints` table
    - Create server action for operator fingerprint CRUD: create, read, update (with version increment), delete
    - On update, invalidate the in-memory cache entry for that fingerprint
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 3.1, 3.3, 6.2, 6.3_

  - [x] 3.3 Implement AI Provider interface and Claude Provider
    - Create `/lib/ai-provider/types.ts` with `AIProvider`, `AIProviderInfo`, `AIProviderError` interfaces
    - Create `/lib/ai-provider/claude-provider.ts` implementing `AIProvider` for Anthropic API (Sonnet for generation, Haiku for brain compilation)
    - Implement `generateRecipe()` with streaming, `compileBrain()`, `suggestPairings()`, `suggestSubstitutions()`
    - Implement error mapping: 429 → `rate_limit` (retryable), 401/403 → `auth_failed`, timeout → `timeout` (retryable), malformed → `invalid_response` (retryable), unknown → `unknown`. Error messages must not expose API keys or provider internals
    - Create `/lib/ai-provider/factory.ts` with `createAIProvider()` factory that checks `ai_provider_config` table for `is_active = true`, falls back to `AI_PROVIDER` env var
    - Create `/lib/ai-provider/registry.ts` with provider registry
    - _Requirements: 5.19, 12.1, 12.2, 12.3, 12.4_

  - [x] 3.4 Implement Brain Compiler with Redis caching (15min TTL)
    - Create `/lib/brain-compiler.ts` implementing `BrainCompilationInput`, `CompiledBrain` interfaces
    - Implement `compileBrain(input)`: fetch raw data (onboarding, dev logs, tasting notes) from Supabase, build compilation prompt, call Haiku via AI Provider, upsert to `chef_brains` table with version increment, invalidate Redis cache
    - Implement `getCachedBrain(userId)`: check Redis first (15min TTL), fall back to Supabase
    - Implement `invalidateBrainCache(userId)`: delete Redis key
    - Handle compilation errors: retain existing brain on failure, log error
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 4.8, 4.9, 6.4, 6.5_

  - [x] 3.5 Implement Prompt Assembler with parallel fetch and streaming
    - Create `/lib/prompt-assembler.ts` implementing `AssembledPrompt`, `PromptSnapshot` interfaces
    - Implement `assemblePrompt(userId, fingerprintId, requestContext, complexityMode)`: fetch System Core (memory), Fingerprint (memory cache), Chef Brain (Redis) in parallel using `Promise.all`
    - Join layers 1-3 as system prompt, layer 4 (Request Context built from UI state) as user message
    - Include complexity mode instructions in the system prompt (Foundation: extra explanation/doneness cues/conservative seasoning/proactive substitutions; Kitchen: professional but approachable; Riff: architecture and intention only, no amounts)
    - Implement `generateRecipe()`: assemble prompt → call AI Provider with streaming → validate with Zod (with retry) → return `ReadableStream<Recipe>`
    - Implement `buildPromptSnapshot()`: capture all 4 layer texts, versions, token counts, fingerprint id/name, estimated cost
    - _Requirements: 5.1, 5.2, 5.3, 5.15, 5.16, 6.6, 20.2, 20.3, 20.4_

  - [x] 3.6 Implement Prompt Snapshot storage
    - When a recipe is generated, persist the `PromptSnapshot` as JSONB in `recipes.prompt_used`
    - Include: all 4 layer texts, fingerprint id/name/version, chef brain version, token counts per layer, total input/output tokens, estimated cost, assembled timestamp
    - _Requirements: 3.2, 5.16, 8.1_

- [x] 4. Checkpoint — Core data model and prompt architecture
  - Ensure all type definitions, Zod schemas, prompt modules, and AI provider compile. Validate Zod round-trip with a sample Recipe object. Ask the user if questions arise.

- [x] 5. Authentication & Billing (Backend + Frontend)
  - [x] 5.1 Implement Supabase Auth integration (register, login, logout, session)
    - Create `/lib/auth-service.ts` implementing `register()`, `login()`, `logout()`, `getCurrentUser()` using Supabase Auth
    - On registration: create user row in `users` table with `tier: 'free'`, `generation_count_this_month: 0`, `default_complexity_mode: 'kitchen'`
    - On login: establish session, redirect to `/canvas`
    - On invalid credentials: return generic error "Invalid email or password" (never reveal which field was wrong)
    - On logout: terminate session, redirect to `/login`
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_

  - [x] 5.2 Build Auth UI (login page, signup page, protected route middleware)
    - Create `/app/(auth)/login/page.tsx` with email/password form, error display, link to signup
    - Create `/app/(auth)/signup/page.tsx` with email/password form, error display, link to login
    - Create Next.js middleware (`middleware.ts`) to protect `/(studio)` routes — redirect unauthenticated users to `/login`
    - _Requirements: 7.4, 7.7_

  - [x] 5.3 Implement Stripe billing integration (checkout, webhooks, tier management)
    - Create `/lib/billing-service.ts` implementing `createCheckoutSession()`, `getUserBillingInfo()` with Stripe Customer Portal link
    - Define `PLANS` constant with 4 tiers and Stripe price IDs
    - Create `/app/api/webhooks/stripe/route.ts` handling: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
    - On subscription created/updated: update `users.tier` and `users.stripe_customer_id`
    - On subscription deleted: set `users.tier = 'free'` at end of billing period
    - On payment failed: trigger grace period (7 days), send email via Resend
    - Webhook handlers must be idempotent (duplicate events safely ignored)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x] 5.4 Build Billing UI (pricing page, account settings, Stripe portal link)
    - Create `/app/(studio)/pricing/page.tsx` with 4 tier cards (Free, Home Cook, Creator, Brigade) showing features and prices
    - Each paid tier card has a "Subscribe" button that calls `createCheckoutSession()` and redirects to Stripe
    - Create `/app/(studio)/settings/page.tsx` showing current tier, next billing date, and link to Stripe Customer Portal
    - _Requirements: 13.2, 13.7_

  - [x] 5.5 Implement Rate Limiter (generation counting, tier enforcement, token caps)
    - Create `/lib/rate-limiter.ts` implementing `checkRateLimit()`, `recordGenerationCost()`
    - `GENERATION_LIMITS`: free = 10/month, paid = unlimited
    - `MAX_INPUT_TOKENS` = 1200, `MAX_OUTPUT_TOKENS` = 2000
    - `checkRateLimit()`: read user tier + `generation_count_this_month` from DB, return `RateLimitResult` with `allowed`, `remaining`, `resetDate`
    - `recordGenerationCost()`: insert into `generation_costs` table, increment `users.generation_count_this_month`
    - Reset count on first of each month (check `generation_count_reset_date`)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 5.6 Implement Resend email integration (welcome, payment failure, grace period)
    - Create `/lib/email-service.ts` with Resend client
    - Implement `sendWelcomeEmail(email, name)`, `sendPaymentFailedEmail(email, portalUrl)`, `sendGracePeriodReminderEmail(email, daysRemaining, portalUrl)`
    - Use Canadian English in all email copy
    - _Requirements: 18.1, 18.2, 18.3_

- [x] 6. Checkpoint — Auth & billing
  - Ensure auth flow works end-to-end (register → login → protected routes → logout), Stripe webhook handlers compile, rate limiter logic is correct. Ask the user if questions arise.

- [x] 7. Recipe Generation (Backend + Frontend)
  - [x] 7.1 Implement Generation API route with streaming, Zod validation, and retry logic
    - Create `/app/api/generate/route.ts` as a POST streaming route
    - Flow: authenticate user → `checkRateLimit()` → `assemblePrompt()` (with complexity mode) → stream via AI Provider → validate JSON against Zod schema (retry up to 2x on failure) → persist recipe (structured JSON, never markdown) + prompt snapshot → `recordGenerationCost()` → increment generation count
    - Return streamed response using `ReadableStream` and `TransformStream`
    - On rate limit rejection: return 429 with remaining count and reset date
    - On AI error: return descriptive error with retry option
    - On Zod validation failure after all retries: return descriptive error with manual retry option
    - _Requirements: 5.1, 5.2, 5.3, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 5.19, 5.20, 14.1, 14.2_

  - [x] 7.2 Build Generation UI (canvas page with prompt input, fingerprint selector, complexity mode selector, serving size, streaming display)
    - Create `/app/(studio)/canvas/page.tsx` as the main generation interface
    - Prompt input textarea for describing the dish idea (builds Request Context / Layer 4)
    - Fingerprint selector dropdown showing available fingerprints (1 for free tier, all 5 for paid)
    - Display currently active fingerprint name
    - Complexity mode selector (Foundation / Kitchen / Riff) — default to user's `default_complexity_mode`
    - Serving size selector (default 4, accepts any positive integer)
    - Submit button that calls `/api/generate` and streams response
    - Loading indicator while generation is in progress
    - Streamed recipe display that renders incrementally as tokens arrive
    - Error display with retry button on failure
    - _Requirements: 2.3, 2.4, 2.5, 5.17, 5.20, 5.21, 20.5, 20.8_

  - [x] 7.3 Implement Batch Scaler (component-based scaling, kitchen precision rounding)
    - Create `/lib/batch-scaler.ts` implementing `ScaledRecipe` interface
    - Implement `scaleRecipe(recipe, targetServings): ScaledRecipe` — scales every component's ingredients proportionally
    - Implement `scaleComponent(component, multiplier): Component` — scales ingredient amounts, preserves all component metadata (name, role, steps, doneness_cues)
    - Implement `roundToKitchenPrecision(quantity): number` — >10g: nearest whole gram, ≤10g: nearest 0.5g
    - `multiplier = targetServings / recipe.intent.time` (or original servings from recipe metadata)
    - Each ingredient amount = `roundToKitchenPrecision(original.amount * multiplier)`, units unchanged
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 8. Checkpoint — Recipe generation
  - Ensure generation API streams correctly, Zod validation catches invalid output and retries, batch scaler produces correct values across components. Ask the user if questions arise.

- [x] 9. Seven Display Modes (Frontend)
  - [x] 9.1 Implement all seven display renderer functions
    - Create `/lib/display-renderers/index.ts` exporting all 7 renderers
    - All renderers are pure functions over stored Recipe JSON — no API calls, no markdown storage
    - Implement `renderFullRecipe(recipe): string` — default view, all components with ingredients, steps, doneness cues, notes, thinking section
    - Implement `renderBrief(recipe): string` — single-screen summary, key components/ingredients/steps, no detailed explanation
    - Implement `renderCookMode(recipe, currentStage): string` — one stage at a time, sensory doneness cues per stage
    - Implement `renderFlavourMap(recipe): string` — flavour architecture only (profile, dominant, acid, fat, heat, sweet, texture, balance), no amounts or method
    - Implement `renderShoppingList(recipe, userPantry): ShoppingListView` — grouped by store section, pantry constants marked "already have", Quality Highlight sentence
    - Implement `renderTimeline(recipe, serveTime): string` — horizontal bars working backward from serve time, parallel task identification
    - Implement `renderRiff(recipe): string` — intention and architecture only, no amounts
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

  - [x] 9.2 Build display mode switcher UI
    - Add display mode tabs/dropdown to recipe detail page: Full Recipe, Brief, Cook, Flavour Map, Shopping List, Timeline, Riff
    - Switching modes renders immediately from stored JSON — no API call
    - Default to Full Recipe mode
    - _Requirements: 19.1, 19.9_

  - [x] 9.3 Implement Shopping List with Quality Highlight and pantry personalization
    - `renderShoppingList` aggregates ingredients across all components, deduplicates by name (summing quantities)
    - Groups by store section (produce, dairy, meat, pantry, spice, etc.)
    - Marks ingredients matching user's `pantry_constants` (from Chef Brain / users table) as "already have"
    - Generates `theOneThingWorthGetting` — a single sentence identifying the ingredient where quality matters most, derived from the recipe's flavour architecture
    - Quality Highlight is concise, actionable, explains why this ingredient matters for this dish
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 10. Complexity Modes
  - [x] 10.1 Implement complexity mode logic and user preference storage
    - Create `/lib/complexity-modes.ts` with mode definitions and prompt instructions
    - Foundation: extra explanation at each step, doneness cues at every stage, conservative seasoning, proactive substitutions
    - Kitchen (default): professional but approachable, standard detail
    - Riff: architecture and intention only, no precise amounts, minimal step-by-step
    - Store user's preferred mode in `users.default_complexity_mode`
    - Allow per-recipe override stored in `recipes.complexity_mode`
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.7, 20.8_

  - [x] 10.2 Build complexity mode UI (selection before/after generation, user default, per-recipe override)
    - Complexity mode selector on canvas page (before generation)
    - Complexity mode switcher on recipe detail page (after generation — triggers regeneration at new level)
    - Settings page: set default complexity mode
    - Per-recipe override: changing mode on a recipe doesn't change the user default
    - _Requirements: 20.5, 20.6, 20.7, 20.8_

- [x] 11. Recipe Library & Versioning (Backend + Frontend)
  - [x] 11.1 Implement Recipe CRUD server actions (save, read, update, delete, search, tag)
    - Create `/app/(studio)/library/actions.ts` with server actions
    - `saveRecipe()`: auto-persist on generation with unique id, timestamp, fingerprint id/version, prompt snapshot, `cooked: false`, user id, complexity_mode, all JSONB fields (intent, flavour, components, timeline, variations, related, thinking)
    - `getRecipes(userId)`: return all recipes sorted by `updated_at DESC`
    - `updateRecipe(recipeId, fields)`: update editable fields (components, notes, tags), set `updated_at`
    - `deleteRecipe(recipeId)`: remove recipe record
    - `searchRecipes(userId, query)`: search by title (trigram), ingredient name within components (JSONB GIN), or tag — case-insensitive, target <500ms for up to 1000 recipes
    - `addTags(recipeId, tags)`: persist tags array
    - `markAsCooked(recipeId)`: set `cooked = true`
    - `addDevNotes(recipeId, notes)`: persist dev_notes
    - Free-tier users: reject save with upgrade message
    - On DB write failure: return error, UI retains unsaved data for retry
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 11.2 Build Recipe Library UI (list view, search, tag filtering, sort by modified)
    - Create `/app/(studio)/library/page.tsx` showing all saved recipes
    - Default sort: most recently modified
    - Search bar filtering by title, ingredient (within components), or tag
    - Tag filter chips
    - Each recipe card shows: title, fingerprint used, complexity mode, cooked status, tags, last modified date
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 11.3 Implement Version Store with dial_direction support
    - Create `/lib/version-store.ts` implementing `createVersion()`, `getVersionHistory()`, `diffVersions()`, `revertToVersion()`
    - `createVersion()`: insert into `recipe_versions` with sequential `version_number`, full `recipe_data` JSONB (complete Recipe JSON), `prompt_snapshot` JSONB, `dial_direction` (null for original, else the direction used)
    - `getVersionHistory()`: return chronological list with timestamps, fingerprint used, chef brain version, dial_direction for each version
    - `diffVersions()`: compare two `Recipe` objects — identify changes in components (added/removed/changed), ingredients within components, steps, flavour architecture, variations, thinking
    - `revertToVersion()`: create a new current version whose recipe_data equals the target version's recipe_data
    - Retain all versions indefinitely for paid-tier users
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 11.4 Implement The Dial (recipe evolution backend)
    - Create `/lib/dial.ts` implementing `dialRecipe()` and `getDialHistory()`
    - `dialRecipe(recipeId, direction, userId)`: fetch current recipe JSON → assemble prompt with current recipe + dial direction + full 4-layer prompt → call AI Provider → validate with Zod → create new version with `dial_direction` set → return `DialResult` with new version, human-readable changes summary, and previous version ID
    - `getDialHistory(recipeId)`: return all versions with their dial directions (null for original)
    - Dial directions: `more_acid`, `more_heat`, `more_umami`, `smokier`, `lighter`, `funkier`, `different_region`, `riff_mode`
    - Users can dial from any version in history, not only the latest
    - _Requirements: 9.6, 9.7, 9.8, 9.10, 9.11_

  - [x] 11.5 Build Recipe Detail Page (view, edit, dev notes, cooked toggle, version history, display modes, The Dial)
    - Create `/app/(studio)/library/[id]/page.tsx` showing full recipe
    - Display: title, intent, flavour architecture, all components with ingredients/steps/doneness cues, thinking section, variations, related
    - Display mode switcher (7 modes) integrated into the page
    - Editable fields: components, notes, tags
    - Dev notes text area
    - "Mark as cooked" toggle
    - Version history panel with chronological list, dial_direction labels, diff view between selected versions, revert button
    - Side-by-side version comparison
    - _Requirements: 8.5, 8.6, 8.7, 9.2, 9.3, 9.4, 9.9_

  - [x] 11.6 Build The Dial UI
    - Add Dial UI to recipe detail page with direction buttons: More Acid, Smokier, More Umami, More Heat, Lighter, Funkier, Different Region, Riff Mode
    - Each push calls `dialRecipe()` API, shows loading state, displays new version on completion
    - Dial history visible on the recipe showing sequence of directions and versions
    - Allow dialing from any version (not just latest) — version selector before dial push
    - _Requirements: 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

- [x] 12. Checkpoint — Display modes, complexity, library, versioning, The Dial
  - Ensure all 7 display renderers produce correct output, complexity modes affect generation, recipe CRUD works, versioning with dial_direction tracks correctly, The Dial generates new versions. Ask the user if questions arise.

- [x] 13. AI Features (Backend + Frontend)
  - [x] 13.1 Implement Ingredient Pairing suggestions
    - Add `suggestPairings(ingredient, systemPrompt)` to AI Provider — returns complementary ingredients with explanations using the active fingerprint's style
    - Create server action for pairing requests
    - _Requirements: 15.1_

  - [x] 13.2 Implement Ingredient Substitution
    - Add `suggestSubstitutions(ingredient, recipeContext, systemPrompt)` to AI Provider — returns alternatives with quantity adjustments and flavour impact notes
    - When user marks ingredients as unavailable, highlight them and offer substitution suggestions
    - _Requirements: 15.2, 15.3_

  - [x] 13.3 Build Pairing/Substitution UI
    - Add ingredient pairing button on the canvas page — user enters an ingredient, sees complementary suggestions
    - Add substitution UI on recipe detail page — user can mark ingredients unavailable within any component and see alternatives inline
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 14. Fermentation Tracking (Backend + Frontend)
  - [x] 14.1 Implement Fermentation Log CRUD
    - Create server actions for fermentation logs: `createFermentationLog()`, `updateFermentationLog()`, `getFermentationLogs(userId)`, `getActiveFermentationLogs(userId)`
    - Fields: recipe_id, user_id, start_date, target_duration_days, temperature, method_description, status (active/completed/failed)
    - Calculate elapsed time since start_date
    - Detect overdue: elapsed days > target_duration_days
    - _Requirements: 16.1, 16.2, 16.5_

  - [x] 14.2 Implement Tasting Notes for fermentation
    - Create server action `addTastingNote(fermentationLogId, note)` — persists with timestamp
    - Tasting note fields: taste, texture, appearance, aroma, overall, comments
    - On tasting note added: trigger Chef Brain recompilation
    - _Requirements: 16.3, 4.2_

  - [x] 14.3 Build Fermentation UI (create, track, overdue notifications, safety guidelines)
    - Create `/app/(studio)/fermentation/page.tsx` listing active and completed fermentation logs
    - Create form for new fermentation log entry
    - Display elapsed time for active logs
    - Show overdue notification when elapsed > target duration
    - Display safety guidelines alongside active fermentation entries
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 15. Export (Backend + Frontend)
  - [x] 15.1 Implement PDF Export (basic V1 formatting)
    - Create `/lib/export-service.ts` implementing `exportRecipeAsPdf()`
    - Generate a formatted, printable recipe card from structured Recipe JSON containing: title, all components with ingredients/steps, thinking section, serving size
    - Include active scaling (serving size) in exported output
    - For Creator/Brigade tier: include optional branding (user's name or business name)
    - Free-tier users: reject with upgrade message
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

  - [x] 15.2 Implement Markdown Export
    - Implement `exportRecipeAsMarkdown()` in `/lib/export-service.ts`
    - Generate well-structured Markdown with proper headings, lists, and formatting for component-based recipes
    - Include scaling and branding where applicable
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 15.3 Build Export UI (format selection, branding for Creator/Brigade)
    - Add export button on recipe detail page with format dropdown (PDF / Markdown)
    - For Creator/Brigade: show branding input (name, business name) before export
    - For Free tier: show upgrade prompt
    - Download the generated file
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [x] 16. Chef Brain UI (Frontend)
  - [x] 16.1 Build Chef Brain page
    - Create `/app/(studio)/brain/page.tsx` showing the user's compiled Chef Brain summary
    - Display: flavour biases, pantry constants, technique comfort, avoid list, cooking context, recent dev notes
    - "Recompile" button to manually trigger brain recompilation
    - Show last compilation timestamp and version
    - _Requirements: 4.6, 4.7_

- [x] 17. Admin Controls (Backend + Frontend)
  - [x] 17.1 Build Admin dashboard page (protected, operator-only)
    - Create `/app/(studio)/admin/page.tsx` with operator-only access check
    - Dashboard layout with navigation to: Fingerprint Management, AI Provider Config, Cost Monitoring, System Health
    - Protect with a server-side check (e.g., user email matches operator email env var or a role flag)
    - _Requirements: 2.7_

  - [x] 17.2 Build Fingerprint Management UI (view, edit prompt_text, version history)
    - Create `/app/(studio)/admin/fingerprints/page.tsx`
    - List all fingerprints with name, current version, last updated
    - Edit form for `prompt_text` — on save, version increments and cache invalidates
    - Show version history for each fingerprint
    - _Requirements: 2.7, 3.1, 3.3_

  - [x] 17.3 Implement AI Provider management (view providers, configure keys, switch active, test connection)
    - Create `/app/(studio)/admin/providers/page.tsx`
    - List configured providers from `ai_provider_config` table
    - Form to add/edit provider: name, API key (encrypted), model ID, is_active toggle
    - "Test Connection" button that makes a minimal API call to verify the key works
    - Only one provider can be `is_active = true` at a time
    - _Requirements: 12.1, 12.3_

  - [x] 17.4 Build Cost Monitoring dashboard (generation costs, per-user usage, monthly totals)
    - Create `/app/(studio)/admin/costs/page.tsx`
    - Query `generation_costs` table for: total generations this month, total estimated cost, average cost per generation
    - Per-user breakdown: top users by generation count and cost
    - Monthly trend chart (simple table or list for V1)
    - _Requirements: 14.4_

  - [x] 17.5 Build System Health monitoring (DB connectivity, Redis connectivity, System Core status)
    - Create `/app/api/health/route.ts` that checks: Supabase DB connectivity (simple query), Upstash Redis connectivity (PING), System Core loaded in memory
    - Display health status on admin dashboard
    - _Requirements: 17.7_

- [x] 18. Checkpoint — AI features, fermentation, export, brain UI, admin controls
  - Ensure pairing/substitution work, fermentation tracking is functional, PDF/Markdown export works with component-based recipes, Chef Brain page displays correctly, admin dashboard is functional and protected. Ask the user if questions arise.

- [ ] 19. Property-Based Tests (fast-check)
  - [ ]* 19.1 Property 1: Recipe JSON/Zod schema validation round-trip
    - **Property 1: Recipe JSON/Zod schema validation round-trip**
    - For any valid `Recipe` object, `RecipeSchema.parse(JSON.parse(JSON.stringify(recipe)))` produces an equivalent object — all fields (title, intent, flavour, components with ingredients/steps/doneness_cues, timeline, variations including taste profiles, related, thinking) preserved
    - **Validates: Requirements 5.6, 5.8**

  - [ ]* 19.2 Property 2: Prompt assembly structure
    - **Property 2: Prompt assembly structure**
    - For any valid generation request, system prompt contains L1+L2+L3, user message equals L4, all layers non-empty
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 19.3 Property 3: Prompt layer content correctness
    - **Property 3: Prompt layer content correctness**
    - Assembled prompt contains fingerprint `promptText` verbatim (L2) and Chef Brain `promptText` verbatim (L3)
    - **Validates: Requirements 2.2, 4.5**

  - [ ]* 19.4 Property 4: Prompt Snapshot completeness
    - **Property 4: Prompt Snapshot completeness**
    - `prompt_used` JSONB contains all 4 layer texts (non-empty), fingerprint id/name/version, chef brain version, token counts
    - **Validates: Requirements 3.2, 5.16, 8.1**

  - [ ]* 19.5 Property 5: System Core immutability
    - **Property 5: System Core immutability**
    - System Core text and version identical across all prompt assemblies
    - **Validates: Requirements 1.4**

  - [ ]* 19.6 Property 6: Fingerprint version increment on update
    - **Property 6: Fingerprint version increment on update**
    - After update, version = previous + 1, new text persisted
    - **Validates: Requirements 3.1**

  - [ ]* 19.7 Property 7: Cache invalidation on data update
    - **Property 7: Cache invalidation on data update**
    - After fingerprint update, cache returns new version. After brain recompilation, Redis returns new text
    - **Validates: Requirements 3.3, 4.9, 6.3, 6.5**

  - [ ]* 19.8 Property 8: Tier-based access control
    - **Property 8: Tier-based access control**
    - Free tier: 1 fingerprint, no library save, no export. Paid tiers: all 5 fingerprints, library, export
    - **Validates: Requirements 2.4, 2.5, 8.10, 10.5**

  - [ ]* 19.9 Property 9: Component-based batch scaling correctness
    - **Property 9: Component-based batch scaling correctness**
    - For any Recipe with components, `scaleRecipe` produces scaled amounts = `roundToKitchenPrecision(original * multiplier)` for every ingredient in every component, units unchanged, component metadata (name, role, steps, doneness_cues) preserved
    - **Validates: Requirements 11.1, 11.2**

  - [ ]* 19.10 Property 10: Kitchen precision rounding
    - **Property 10: Kitchen precision rounding**
    - >10: whole number. ≤10: multiple of 0.5. Always positive
    - **Validates: Requirements 11.3**

  - [ ]* 19.11 Property 11: Recipe library sort order
    - **Property 11: Recipe library sort order**
    - Retrieved recipes in strictly descending `updatedAt` order
    - **Validates: Requirements 8.2**

  - [ ]* 19.12 Property 12: Recipe search returns only matching results
    - **Property 12: Recipe search returns only matching results**
    - Every result contains query string (case-insensitive) in title, ingredient name within any component, or tag
    - **Validates: Requirements 8.4**

  - [ ]* 19.13 Property 13: AI provider error mapping
    - **Property 13: AI provider error mapping**
    - Valid error code, non-empty message without API key substrings, correct retryable flag
    - **Validates: Requirements 5.19, 12.4**

  - [ ]* 19.14 Property 14: Rate limiting enforcement
    - **Property 14: Rate limiting enforcement**
    - Allow if paid or count < limit, reject if count >= limit with remaining=0 and valid resetDate
    - **Validates: Requirements 14.1, 14.2, 14.5**

  - [ ]* 19.15 Property 15: Generation cost calculation
    - **Property 15: Generation cost calculation**
    - Cost = (inputTokens × inputRate) + (outputTokens × outputRate)
    - **Validates: Requirements 14.4**

  - [ ]* 19.16 Property 16: Fermentation overdue detection
    - **Property 16: Fermentation overdue detection**
    - Overdue iff elapsed days > targetDurationDays
    - **Validates: Requirements 16.2, 16.5**

  - [ ]* 19.17 Property 17: Version history chronological ordering
    - **Property 17: Version history chronological ordering**
    - Entries in ascending `createdAt` order, sequential `versionNumber`
    - **Validates: Requirements 9.2**

  - [ ]* 19.18 Property 18: Version diff accuracy
    - **Property 18: Version diff accuracy**
    - Identifies all differences in components, ingredients, steps, flavour, variations, thinking. No false positives for identical fields
    - **Validates: Requirements 9.3**

  - [ ]* 19.19 Property 19: Version revert produces equivalent output
    - **Property 19: Version revert produces equivalent output**
    - Reverted recipe_data equals target version's recipe_data
    - **Validates: Requirements 9.4**

  - [ ]* 19.20 Property 20: Export content correctness
    - **Property 20: Export content correctness**
    - PDF/Markdown contains recipe title, all ingredients from all components, all steps, serving size. Scaling applied. Branding included for Creator/Brigade
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

  - [ ]* 19.21 Property 21: Login error opacity
    - **Property 21: Login error opacity**
    - Same error message for wrong email vs wrong password
    - **Validates: Requirements 7.5**

  - [ ]* 19.22 Property 22: Recipe Zod validation
    - **Property 22: Recipe Zod validation**
    - Valid only if title non-empty, components non-empty array with valid Component objects (each with ingredients[], steps[], doneness_cues[]), intent with valid effort, flavour with valid architecture. Invalid objects rejected with specific errors
    - **Validates: Requirements 5.4, 5.6**

  - [ ]* 19.23 Property 23: Stripe webhook tier update
    - **Property 23: Stripe webhook tier update**
    - Subscription webhook updates user tier correctly. Cancellation sets tier to free after billing period
    - **Validates: Requirements 13.3, 13.4**

  - [ ]* 19.24 Property 24: Display renderer determinism and content correctness
    - **Property 24: Display renderer determinism and content correctness**
    - Each of the 7 renderers (renderBrief, renderFullRecipe, renderCookMode, renderFlavourMap, renderShoppingList, renderTimeline, renderRiff) produces identical output when called twice with the same inputs (pure/deterministic), and produces non-empty output containing the recipe's title
    - **Validates: Requirements 19.1, 19.9**

  - [ ]* 19.25 Property 25: Shopping list aggregation across components
    - **Property 25: Shopping list aggregation across components**
    - For any Recipe with multiple components, `renderShoppingList` produces a list where every ingredient name from every component appears exactly once (duplicates merged), quantities for duplicates are summed, and pantry items are flagged as "already have" (not omitted)
    - **Validates: Requirements 21.1, 21.2**

  - [ ]* 19.26 Property 26: Taste profile switching round-trip
    - **Property 26: Taste profile switching round-trip**
    - Applying a non-"Current" profile's adjustments then reverting to "Current" produces a recipe equivalent to the original. Applying "Current" is a no-op
    - **Validates: Requirements 5.8**

  - [ ]* 19.27 Property 27: Complexity mode detail ordering
    - **Property 27: Complexity mode detail ordering**
    - Foundation mode output has greater or equal detail (content length) than Kitchen, which has greater or equal detail than Riff. Riff output contains no ingredient amounts
    - **Validates: Requirements 20.2, 20.3, 20.4**

- [ ] 20. Deployment & Seed Data
  - [ ] 20.1 Configure Vercel deployment
    - Create `vercel.json` if needed for any custom config (regions, functions)
    - Ensure `next.config.js` is production-ready (image domains, env vars)
    - Verify zero-config deploy on push works
    - _Requirements: 17.1_

  - [ ] 20.2 Set up environment variables for all services
    - Document all required env vars in `.env.local.example`
    - Verify Vercel environment variables are configured: Supabase, Upstash, Stripe, Anthropic, Resend
    - _Requirements: 17.6_

  - [ ] 20.3 Create seed data (5 default fingerprints, System Core prompt)
    - Create SQL seed script inserting 5 default fingerprints: Matty Matheson, Brad Leone, Ottolenghi, Samin Nosrat, Claire Saffitz — each with ~300-token prompt_text, version 1, is_default true
    - Include System Core prompt text in the seed or as a config constant
    - _Requirements: 2.1, 1.1_

  - [ ] 20.4 Verify Canadian English throughout all user-facing text
    - Audit all UI strings for Canadian spelling: flavour, colour, favourite, etc.
    - _Requirements: 17.8_

- [ ] 21. Final checkpoint — Ensure all tests pass
  - Ensure all modules compile, all property-based tests pass, all UI pages render, end-to-end flow works (register → generate → library → dial → export). Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (27 properties)
- All display modes are pure render functions — no API calls for switching views
- The Dial generates full new versions via API calls — distinct from stored taste profile previews
- Markdown is never stored — all rendering is from structured JSON
- `recipe_forks` and `sub_recipe_refs` tables created in V1 for data model readiness, UI ships later
