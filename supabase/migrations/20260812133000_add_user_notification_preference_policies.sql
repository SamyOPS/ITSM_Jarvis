drop policy if exists "Users can read their notification preferences"
  on public.user_notification_preferences;
drop policy if exists "Users can insert their notification preferences"
  on public.user_notification_preferences;
drop policy if exists "Users can update their notification preferences"
  on public.user_notification_preferences;

create policy "Users can read their notification preferences"
  on public.user_notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their notification preferences"
  on public.user_notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their notification preferences"
  on public.user_notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.user_notification_preferences to authenticated;
