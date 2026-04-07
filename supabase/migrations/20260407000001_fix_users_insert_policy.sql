-- Allow authenticated users to insert their own row in public.users
create policy "Users insert own" on public.users
  for insert
  with check (auth.uid() = id);
