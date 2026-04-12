-- ============================================================
-- MISE Combined Schema — Run in Supabase SQL Editor
-- ============================================================

-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Users
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  tier text not null default 'free' check (tier in ('free', 'home_cook', 'creator', 'brigade')),
  stripe_customer_id text,
  default_complexity_mode text not null default 'kitchen' check (default_complexity_mode in ('foundation', 'kitchen', 'riff')),
  generation_count_this_month integer not null default 0,
  generation_count_reset_date date not null default current_date,
  pantry_constants jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fingerprints
create table public.fingerprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  prompt_text text not null,
  full_profile jsonb default '{}'::jsonb,
  version integer not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Chef Brains
create table public.chef_brains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  prompt_text text not null default '',
  raw_data jsonb default '{}'::jsonb,
  version integer not null default 1,
  compiled_at timestamptz not null default now(),
  unique (user_id)
);

-- Recipes
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  fingerprint_id uuid references public.fingerprints,
  title text not null,
  version integer not null default 1,
  intent jsonb default '{}'::jsonb,
  flavour jsonb default '{}'::jsonb,
  components jsonb not null default '[]'::jsonb,
  timeline jsonb default '[]'::jsonb,
  variations jsonb default '{}'::jsonb,
  related jsonb default '{}'::jsonb,
  thinking jsonb default '{}'::jsonb,
  prompt_used jsonb default '{}'::jsonb,
  complexity_mode text not null default 'kitchen' check (complexity_mode in ('foundation', 'kitchen', 'riff')),
  cooked boolean not null default false,
  dev_notes text,
  tags jsonb default '[]'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipe Versions
create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  version_number integer not null,
  recipe_data jsonb not null,
  prompt_snapshot jsonb not null default '{}'::jsonb,
  dial_direction text,
  created_at timestamptz not null default now()
);

-- Recipe Forks
create table public.recipe_forks (
  id uuid primary key default gen_random_uuid(),
  source_recipe_id uuid not null references public.recipes on delete cascade,
  source_version integer not null,
  forked_recipe_id uuid not null references public.recipes on delete cascade,
  forked_by_user_id uuid not null references public.users on delete cascade,
  forked_at timestamptz not null default now()
);

-- Sub-Recipe References
create table public.sub_recipe_refs (
  id uuid primary key default gen_random_uuid(),
  parent_recipe_id uuid not null references public.recipes on delete cascade,
  child_recipe_id uuid not null references public.recipes on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

-- Fermentation Logs
create table public.fermentation_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes on delete set null,
  user_id uuid not null references public.users on delete cascade,
  start_date date not null,
  target_duration_days integer not null,
  temperature numeric,
  method_description text,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasting Notes
create table public.tasting_notes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  taste text, texture text, appearance text, aroma text, overall text, comments text,
  created_at timestamptz not null default now()
);

-- AI Provider Config
create table public.ai_provider_config (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  api_key_encrypted text,
  model_id text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generation Costs
create table public.generation_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  recipe_id uuid references public.recipes on delete set null,
  input_tokens integer not null,
  output_tokens integer not null,
  estimated_cost numeric not null,
  created_at timestamptz not null default now()
);

-- Sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  recipe_id uuid references public.recipes on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  stages_completed jsonb default '[]'::jsonb,
  questions_asked jsonb default '[]'::jsonb,
  substitutions jsonb default '[]'::jsonb,
  summary text
);

-- Preferences
create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  key text not null,
  value jsonb default '{}'::jsonb,
  confidence float not null default 0.5,
  source text not null default 'explicit' check (source in ('rating', 'dev_note', 'chat', 'tasting_note', 'explicit', 'inferred', 'pattern')),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

-- Ideas
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  recipe_id uuid references public.recipes on delete cascade,
  note text,
  status text not null default 'uncooked' check (status in ('uncooked', 'annotated', 'generated')),
  created_at timestamptz not null default now()
);

-- Ratings
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  cook_again text check (cook_again in ('absolutely', 'maybe_tweaked', 'probably_not')),
  highlight text check (highlight in ('flavour', 'technique', 'the_occasion', 'surprised_me')),
  change_note text check (change_note in ('nothing', 'more_acid', 'different_texture', 'different_technique', 'something_else')),
  change_text text,
  cooked_at timestamptz not null default now(),
  unique (recipe_id, user_id)
);

-- Kitchens
create table public.kitchens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fingerprint_id uuid references public.fingerprints,
  zine_url text,
  available_from timestamptz,
  available_to timestamptz,
  units_total integer,
  units_sold integer not null default 0,
  stripe_price_id text
);

-- Kitchen Access
create table public.kitchen_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  kitchen_id uuid not null references public.kitchens on delete cascade,
  granted_at timestamptz not null default now(),
  unique (user_id, kitchen_id)
);

-- Brain Snapshots
create table public.brain_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  prompt_text text not null,
  compiled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index idx_recipes_user_updated on public.recipes (user_id, updated_at desc);
create index idx_recipes_title_trgm on public.recipes using gin (title gin_trgm_ops);
create index idx_recipes_components on public.recipes using gin (components);
create index idx_recipes_tags on public.recipes using gin (tags);
create index idx_recipes_fingerprint on public.recipes (fingerprint_id);
create index idx_recipes_intent on public.recipes using gin (intent);
create index idx_sub_recipe_parent on public.sub_recipe_refs (parent_recipe_id);
create index idx_sub_recipe_child on public.sub_recipe_refs (child_recipe_id);
create index idx_fingerprints_default on public.fingerprints (is_default);
create index idx_fermentation_user_status on public.fermentation_logs (user_id, status);
create index idx_generation_costs_user on public.generation_costs (user_id, created_at);
create index idx_sessions_user on public.sessions (user_id, started_at desc);
create index idx_ideas_user_status on public.ideas (user_id, status);
create index idx_recipe_versions_recipe on public.recipe_versions (recipe_id, version_number);
create index idx_brain_snapshots_user_id on public.brain_snapshots(user_id);
create index idx_brain_snapshots_user_version on public.brain_snapshots(user_id, version desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.users enable row level security;
alter table public.fingerprints enable row level security;
alter table public.chef_brains enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.fermentation_logs enable row level security;
alter table public.tasting_notes enable row level security;
alter table public.generation_costs enable row level security;
alter table public.sessions enable row level security;
alter table public.preferences enable row level security;
alter table public.ideas enable row level security;
alter table public.ratings enable row level security;
alter table public.ai_provider_config enable row level security;
alter table public.brain_snapshots enable row level security;

-- Users
create policy "Users read own" on public.users for select using (auth.uid() = id);
create policy "Users insert own" on public.users for insert with check (auth.uid() = id);
create policy "Users update own" on public.users for update using (auth.uid() = id);

-- Fingerprints
create policy "Fingerprints read all" on public.fingerprints for select to authenticated using (true);

-- Chef Brains
create policy "Brains read own" on public.chef_brains for select using (auth.uid() = user_id);
create policy "Brains write own" on public.chef_brains for insert with check (auth.uid() = user_id);
create policy "Brains update own" on public.chef_brains for update using (auth.uid() = user_id);

-- Recipes
create policy "Recipes read own" on public.recipes for select using (auth.uid() = user_id or is_public = true);
create policy "Recipes write own" on public.recipes for insert with check (auth.uid() = user_id);
create policy "Recipes update own" on public.recipes for update using (auth.uid() = user_id);
create policy "Recipes delete own" on public.recipes for delete using (auth.uid() = user_id);

-- Recipe Versions
create policy "Versions read own" on public.recipe_versions for select using (exists (select 1 from public.recipes where recipes.id = recipe_versions.recipe_id and recipes.user_id = auth.uid()));
create policy "Versions write own" on public.recipe_versions for insert with check (exists (select 1 from public.recipes where recipes.id = recipe_versions.recipe_id and recipes.user_id = auth.uid()));
create policy "Versions delete own" on public.recipe_versions for delete using (exists (select 1 from public.recipes where recipes.id = recipe_versions.recipe_id and recipes.user_id = auth.uid()));

-- Fermentation
create policy "Fermentation read own" on public.fermentation_logs for select using (auth.uid() = user_id);
create policy "Fermentation write own" on public.fermentation_logs for insert with check (auth.uid() = user_id);
create policy "Fermentation update own" on public.fermentation_logs for update using (auth.uid() = user_id);

-- Tasting Notes
create policy "Notes read own" on public.tasting_notes for select using (auth.uid() = user_id);
create policy "Notes write own" on public.tasting_notes for insert with check (auth.uid() = user_id);

-- Generation Costs
create policy "Costs read own" on public.generation_costs for select using (auth.uid() = user_id);
create policy "Costs write own" on public.generation_costs for insert with check (auth.uid() = user_id);

-- Sessions
create policy "Sessions read own" on public.sessions for select using (auth.uid() = user_id);
create policy "Sessions write own" on public.sessions for insert with check (auth.uid() = user_id);
create policy "Sessions update own" on public.sessions for update using (auth.uid() = user_id);

-- Preferences
create policy "Prefs read own" on public.preferences for select using (auth.uid() = user_id);
create policy "Prefs write own" on public.preferences for insert with check (auth.uid() = user_id);
create policy "Prefs update own" on public.preferences for update using (auth.uid() = user_id);

-- Ideas
create policy "Ideas read own" on public.ideas for select using (auth.uid() = user_id);
create policy "Ideas write own" on public.ideas for insert with check (auth.uid() = user_id);
create policy "Ideas update own" on public.ideas for update using (auth.uid() = user_id);

-- Ratings
create policy "Ratings read own" on public.ratings for select using (auth.uid() = user_id);
create policy "Ratings write own" on public.ratings for insert with check (auth.uid() = user_id);

-- Brain Snapshots
create policy "Users can read own snapshots" on public.brain_snapshots for select using (auth.uid() = user_id);
create policy "Service role can insert snapshots" on public.brain_snapshots for insert with check (true);

-- ============================================================
-- Updated_at trigger
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.users for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.fingerprints for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.recipes for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.fermentation_logs for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.ai_provider_config for each row execute function public.handle_updated_at();
