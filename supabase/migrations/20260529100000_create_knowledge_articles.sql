create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  slug text not null unique check (length(trim(slug)) > 0),
  category text not null check (length(trim(category)) > 0),
  content text not null check (length(trim(content)) > 0),
  status text not null check (status in ('DRAFT', 'PUBLISHED')),
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists knowledge_articles_status_idx
  on public.knowledge_articles (status);

create index if not exists knowledge_articles_category_idx
  on public.knowledge_articles (category);

create index if not exists knowledge_articles_created_by_user_id_idx
  on public.knowledge_articles (created_by_user_id);

alter table public.knowledge_articles enable row level security;
