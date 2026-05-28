create table if not exists public.planning_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  technician_id uuid not null references public.users(id) on delete restrict,
  start_at timestamp without time zone not null,
  duration_minutes integer not null check (duration_minutes > 0),
  status text not null check (status in ('TODO', 'DONE')),
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists planning_tasks_technician_id_idx
  on public.planning_tasks (technician_id);

create index if not exists planning_tasks_start_at_idx
  on public.planning_tasks (start_at);

create index if not exists planning_tasks_status_idx
  on public.planning_tasks (status);

create index if not exists planning_tasks_created_by_user_id_idx
  on public.planning_tasks (created_by_user_id);

alter table public.planning_tasks enable row level security;
