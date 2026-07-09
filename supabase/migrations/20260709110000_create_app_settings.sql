create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_no_direct_access on public.app_settings;

create policy app_settings_no_direct_access
on public.app_settings
for all
using (false)
with check (false);

grant all on table public.app_settings to service_role;
