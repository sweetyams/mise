-- Allow users to delete their own recipe versions
create policy "Versions delete own" on public.recipe_versions
  for delete
  using (exists (select 1 from public.recipes where recipes.id = recipe_versions.recipe_id and recipes.user_id = auth.uid()));
