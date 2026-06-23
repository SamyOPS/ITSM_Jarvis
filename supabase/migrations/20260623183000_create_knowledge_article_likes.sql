create table if not exists public.knowledge_article_likes (
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (article_id, user_id)
);

create index if not exists knowledge_article_likes_article_id_idx
  on public.knowledge_article_likes (article_id);

create index if not exists knowledge_article_likes_user_id_idx
  on public.knowledge_article_likes (user_id);

alter table public.knowledge_article_likes enable row level security;
