create or replace function public.prevent_requester_group_membership()
returns trigger
language plpgsql
as $$
declare
  v_role text;
begin
  select role
  into v_role
  from public.users
  where id = new.user_id;

  if v_role = 'DEMANDEUR' then
    raise exception 'DEMANDEUR users cannot be members of support groups.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_groups_prevent_requester on public.user_groups;

create trigger trg_user_groups_prevent_requester
before insert or update on public.user_groups
for each row
execute function public.prevent_requester_group_membership();

create or replace function public.prepare_requester_role_transition()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'DEMANDEUR' and old.role is distinct from new.role then
    new.group_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_prepare_requester_role on public.users;

create trigger trg_users_prepare_requester_role
before update of role on public.users
for each row
execute function public.prepare_requester_role_transition();

create or replace function public.cleanup_requester_role_transition()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'DEMANDEUR' and old.role is distinct from new.role then
    delete from public.user_groups
    where user_id = new.id;

    update public.tickets
    set assigned_to_user_id = null,
        updated_at = now()
    where assigned_to_user_id = new.id
      and status in ('OPEN', 'IN_PROGRESS', 'PENDING');

    delete from public.planning_tasks
    where technician_id = new.id
      and start_at >= (now() at time zone 'utc');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_cleanup_requester_role on public.users;

create trigger trg_users_cleanup_requester_role
after update of role on public.users
for each row
execute function public.cleanup_requester_role_transition();

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

  if new.assignment_group_id is null then
    raise exception 'assignment_group_id is required when assigned_to_user_id is set.';
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
      and group_id = new.assignment_group_id
  ) then
    raise exception 'Assigned user must belong to the assignment group.';
  end if;

  return new;
end;
$$;
