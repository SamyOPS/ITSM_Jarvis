create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete cascade,
  type character varying(40) not null,
  title text not null,
  message text not null,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),

  constraint chk_notifications_type check (
    type in (
      'TICKET_CREATED',
      'TICKET_ASSIGNED',
      'TICKET_COMMENTED',
      'TICKET_STATUS_CHANGED'
    )
  ),
  constraint chk_notifications_title_not_blank check (btrim(title) <> ''),
  constraint chk_notifications_message_not_blank check (btrim(message) <> ''),
  constraint chk_notifications_internal_link check (
    link is null or left(link, 1) = '/'
  )
);

create index if not exists idx_notifications_recipient_created_at
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists idx_notifications_recipient_unread
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

grant all on table public.notifications to service_role;
