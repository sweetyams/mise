-- Add slug column to fingerprints for stable, human-readable references
alter table public.fingerprints add column slug text unique;

-- Backfill existing rows: generate slug from name
update public.fingerprints
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
