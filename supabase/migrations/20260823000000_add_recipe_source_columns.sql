-- Add source tracking columns to recipes for imported recipes
alter table public.recipes
  add column if not exists source text default null,
  add column if not exists source_url text default null;

-- Index for filtering by source
create index if not exists idx_recipes_source on public.recipes (source) where source is not null;

comment on column public.recipes.source is 'Import source: instagram, tiktok, web, manual, etc.';
comment on column public.recipes.source_url is 'Original URL the recipe was imported from';
