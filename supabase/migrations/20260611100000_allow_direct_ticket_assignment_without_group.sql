create or replace function public.check_ticket_assignment()
returns trigger
language plpgsql
as $$
declare
  v_role varchar(20);
  v_is_active boolean;
begin
  if new.assigned_to_user_id is null then
    return new;
  end if;

  select role, is_active
  into v_role, v_is_active
  from public.users
  where id = new.assigned_to_user_id;

  if not found then
    raise exception 'Assigned user does not exist.';
  end if;

  if v_is_active is distinct from true then
    raise exception 'Assigned user must be active.';
  end if;

  if v_role not in ('ADMIN', 'AGENT') then
    raise exception 'Assigned user must be ADMIN or AGENT.';
  end if;

  if not exists (
    select 1
    from public.user_groups
    where user_id = new.assigned_to_user_id
  ) then
    raise exception 'Assigned user must belong to a support group.';
  end if;

  if new.assignment_group_id is not null
    and not exists (
      select 1
      from public.user_groups
      where user_id = new.assigned_to_user_id
        and group_id = new.assignment_group_id
    )
  then
    raise exception 'Assigned user must belong to the assignment group.';
  end if;

  return new;
end;
$$;
