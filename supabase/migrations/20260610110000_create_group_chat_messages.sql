create table if not exists public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone not null default now(),

  constraint chk_group_chat_messages_body_not_blank
    check (btrim(body) <> '')
);

create index if not exists idx_group_chat_messages_group_created_at
  on public.group_chat_messages (group_id, created_at);

grant all on table public.group_chat_messages to service_role;
grant select on table public.group_chat_messages to authenticated;
