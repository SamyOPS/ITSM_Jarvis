alter table public.knowledge_articles
drop constraint if exists knowledge_articles_status_check;

update public.knowledge_articles
set status = 'PENDING'
where status = 'DRAFT';

alter table public.knowledge_articles
add constraint knowledge_articles_status_check
check (status in ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'));
