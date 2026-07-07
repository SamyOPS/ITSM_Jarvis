alter table public.users
drop constraint if exists chk_users_role;

alter table public.users
add constraint chk_users_role
check (
  role in ('ADMIN', 'AGENT', 'DEMANDEUR', 'SUPER_ADMIN')
)
not valid;

alter table public.users
validate constraint chk_users_role;
