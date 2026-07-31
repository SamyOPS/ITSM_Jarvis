alter table public.users
  add column if not exists account_status text;

update public.users
set account_status = case
  when is_active then 'ACTIVE'
  else 'TRASHED'
end
where account_status is null;

alter table public.users
  alter column account_status set default 'ACTIVE';

alter table public.users
  alter column account_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_account_status_check'
  ) then
    alter table public.users
      add constraint users_account_status_check
      check (account_status in ('ACTIVE', 'TRASHED', 'DELETED'));
  end if;
end $$;
