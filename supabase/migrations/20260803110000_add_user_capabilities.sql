alter table public.users
  add column if not exists is_vip boolean not null default false,
  add column if not exists can_manage_assets boolean not null default false,
  add column if not exists can_manage_knowledge_base boolean not null default false,
  add column if not exists can_validate_knowledge_base boolean not null default false;
