alter table public.mosques add column if not exists created_by uuid references auth.users(id);

create or replace function public.create_mosque_as_owner(
  p_name_ar text,
  p_name_en text default null,
  p_area_ar text default '',
  p_city_key text default 'muscat',
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_mosque uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(trim(p_name_ar), '') = '' then
    raise exception 'Arabic mosque name is required';
  end if;

  insert into public.mosques(name_ar, name_en, area_ar, city_key, latitude, longitude, status, created_by)
  values (trim(p_name_ar), nullif(trim(p_name_en), ''), trim(p_area_ar), coalesce(nullif(trim(p_city_key), ''), 'muscat'), p_latitude, p_longitude, 'active', v_user)
  returning id into v_mosque;

  insert into public.mosque_admins(mosque_id, user_id, role)
  values (v_mosque, v_user, 'owner');

  return v_mosque;
end;
$$;

revoke all on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) from public;
grant execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) to authenticated;

create policy "admins can read assigned mosque admins" on public.mosque_admins for select using (
  user_id = auth.uid() or exists (
    select 1 from public.mosque_admins ma2
    where ma2.mosque_id = mosque_admins.mosque_id
      and ma2.user_id = auth.uid()
      and ma2.role = 'owner'
  )
);
