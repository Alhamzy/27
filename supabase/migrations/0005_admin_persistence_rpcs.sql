create or replace function public.save_iqamah_rules(
  p_mosque_id uuid,
  p_rules jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_rule jsonb;
  v_prayer text;
  v_type text;
  v_offset integer;
  v_fixed time;
  v_before jsonb;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.mosque_admins
    where mosque_id = p_mosque_id and user_id = v_user
  ) then
    raise exception 'Not authorized for this mosque';
  end if;

  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) <> 5 then
    raise exception 'Exactly five prayer rules are required';
  end if;

  for v_rule in select * from jsonb_array_elements(p_rules)
  loop
    v_prayer := v_rule->>'prayer';
    v_type := v_rule->>'rule_type';
    v_offset := nullif(v_rule->>'offset_minutes','')::integer;
    v_fixed := nullif(v_rule->>'fixed_time','')::time;

    if v_prayer not in ('fajr','dhuhr','asr','maghrib','isha') then
      raise exception 'Invalid prayer: %', v_prayer;
    end if;
    if v_type not in ('offset','fixed') then
      raise exception 'Invalid rule type for %', v_prayer;
    end if;
    if v_type = 'offset' and (v_offset is null or v_offset < 0 or v_offset > 180) then
      raise exception 'Offset must be between 0 and 180 minutes for %', v_prayer;
    end if;
    if v_type = 'fixed' and v_fixed is null then
      raise exception 'Fixed time is required for %', v_prayer;
    end if;

    select to_jsonb(r) into v_before
    from public.iqamah_rules r
    where r.mosque_id = p_mosque_id and r.prayer = v_prayer;

    insert into public.iqamah_rules(
      mosque_id, prayer, rule_type, offset_minutes, fixed_time,
      last_confirmed_at, verification_type, updated_at
    ) values (
      p_mosque_id,
      v_prayer,
      v_type,
      case when v_type='offset' then v_offset else null end,
      case when v_type='fixed' then v_fixed else null end,
      now(), 'mosque', now()
    )
    on conflict (mosque_id, prayer) do update set
      rule_type = excluded.rule_type,
      offset_minutes = excluded.offset_minutes,
      fixed_time = excluded.fixed_time,
      last_confirmed_at = now(),
      verification_type = 'mosque',
      updated_at = now();

    insert into public.iqamah_changes(mosque_id, prayer, changed_by, before_data, after_data)
    select p_mosque_id, v_prayer, v_user, v_before, to_jsonb(r)
    from public.iqamah_rules r
    where r.mosque_id = p_mosque_id and r.prayer = v_prayer;
  end loop;
end;
$$;

revoke all on function public.save_iqamah_rules(uuid,jsonb) from public;
grant execute on function public.save_iqamah_rules(uuid,jsonb) to authenticated;

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
  v_name text := trim(p_name_ar);
  v_area text := trim(p_area_ar);
  v_city text := coalesce(nullif(trim(p_city_key), ''), 'muscat');
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(v_name, '') = '' then
    raise exception 'Arabic mosque name is required';
  end if;

  if exists (
    select 1 from public.mosques m
    where lower(trim(m.name_ar)) = lower(v_name)
      and lower(trim(coalesce(m.area_ar,''))) = lower(v_area)
      and lower(trim(m.city_key)) = lower(v_city)
      and m.status <> 'archived'
  ) then
    raise exception 'A mosque with the same name and area already exists';
  end if;

  insert into public.mosques(name_ar, name_en, area_ar, city_key, latitude, longitude, status, created_by)
  values (v_name, nullif(trim(p_name_en), ''), v_area, v_city, p_latitude, p_longitude, 'active', v_user)
  returning id into v_mosque;

  insert into public.mosque_admins(mosque_id, user_id, role)
  values (v_mosque, v_user, 'owner');

  insert into public.iqamah_rules(mosque_id, prayer, rule_type, offset_minutes, fixed_time, verification_type)
  select v_mosque, prayer, 'offset', 15, null, 'mosque'
  from unnest(array['fajr','dhuhr','asr','maghrib','isha']) as prayer;

  return v_mosque;
end;
$$;

revoke all on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) from public;
grant execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) to authenticated;
