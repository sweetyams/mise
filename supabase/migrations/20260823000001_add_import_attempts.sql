-- Import attempts tracking — log successes and failures for retry/history
create table public.import_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  source text not null default 'instagram',
  source_url text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'failed')),
  recipe_id uuid references public.recipes on delete set null,
  error_message text,
  method text check (method in ('text', 'vision')),
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for listing user's imports
create index idx_import_attempts_user on public.import_attempts (user_id, created_at desc);

-- Index for retry queue (failed imports with < 3 attempts)
create index idx_import_attempts_retry on public.import_attempts (status, attempts)
  where status = 'failed' and attempts < 3;

-- RLS policies
alter table public.import_attempts enable row level security;

create policy "Users can view their own imports"
  on public.import_attempts for select
  using (auth.uid() = user_id);

create policy "Service role can manage all imports"
  on public.import_attempts for all
  using (true)
  with check (true);
