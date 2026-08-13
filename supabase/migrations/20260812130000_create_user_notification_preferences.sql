alter table public.notifications
  drop constraint if exists chk_notifications_type;

alter table public.notifications
  add constraint chk_notifications_type check (
    type in (
      'ADMIN_GROUP_CHANGED',
      'ADMIN_USER_CHARACTERISTICS_CHANGED',
      'ADMIN_USER_CREATED',
      'ADMIN_USER_GROUP_CHANGED',
      'ADMIN_USER_ROLE_CHANGED',
      'ADMIN_USER_STATUS_CHANGED',
      'TICKET_ASSIGNED',
      'TICKET_COMMENTED',
      'TICKET_CREATED',
      'TICKET_SLA',
      'TICKET_STATUS_CHANGED'
    )
  );

create table if not exists public.user_notification_preferences (
  user_id uuid not null references public.users(id) on delete cascade,
  preference_key character varying(80) not null,
  is_enabled boolean not null,
  updated_at timestamp with time zone not null default now(),

  primary key (user_id, preference_key),
  constraint chk_user_notification_preferences_key check (
    preference_key in (
      'ADMIN_GROUP_CHANGED',
      'ADMIN_USER_CHARACTERISTICS_CHANGED',
      'ADMIN_USER_CREATED',
      'ADMIN_USER_GROUP_CHANGED',
      'ADMIN_USER_ROLE_CHANGED',
      'ADMIN_USER_STATUS_CHANGED',
      'TICKET_ASSIGNED',
      'TICKET_COMMENT_ADDED',
      'TICKET_CREATED',
      'TICKET_GROUP',
      'TICKET_SLA',
      'TICKET_STATUS_CHANGED'
    )
  )
);

create index if not exists idx_user_notification_preferences_user_id
  on public.user_notification_preferences (user_id);

alter table public.user_notification_preferences enable row level security;

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

grant all on table public.user_notification_preferences to service_role;
grant select, insert, update on table public.user_notification_preferences to authenticated;
