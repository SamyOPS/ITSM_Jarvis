alter table public.knowledge_articles
drop constraint if exists knowledge_articles_status_check;

alter table public.knowledge_articles
add constraint knowledge_articles_status_check
check (status in ('DRAFT', 'PUBLISHED', 'REJECTED'));
