create or replace function public.claim_first_poc_mosque()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_mosque_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select ma.mosque_id
    into target_mosque_id
  from public.mosque_admins ma
  where ma.user_id = current_user_id
  limit 1;

  if target_mosque_id is not null then
    return target_mosque_id;
  end if;

  select m.id
    into target_mosque_id
  from public.mosques m
  where m.status = 'active'
    and not exists (
      select 1
      from public.mosque_admins ma
      where ma.mosque_id = m.id
    )
  order by m.created_at asc
  limit 1
  for update skip locked;

  if target_mosque_id is null then
    return null;
  end if;

  insert into public.mosque_admins (mosque_id, user_id, role)
  values (target_mosque_id, current_user_id, 'owner')
  on conflict (mosque_id, user_id) do nothing;

  return target_mosque_id;
end;
$$;

revoke all on function public.claim_first_poc_mosque() from public;
grant execute on function public.claim_first_poc_mosque() to authenticated;
