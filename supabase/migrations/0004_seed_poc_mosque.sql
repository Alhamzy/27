-- POC seed only. The city prayer-time row is explicitly non-official and must be
-- replaced by the approved Oman source before production launch.

with inserted_mosque as (
  insert into public.mosques (name_ar, name_en, area_ar, city_key, status)
  select 'مسجد الهدى', 'Al Huda Mosque', 'الغبرة الشمالية', 'muscat', 'active'
  where not exists (
    select 1 from public.mosques where name_ar = 'مسجد الهدى' and city_key = 'muscat'
  )
  returning id
), target_mosque as (
  select id from inserted_mosque
  union all
  select id from public.mosques where name_ar = 'مسجد الهدى' and city_key = 'muscat' limit 1
)
insert into public.iqamah_rules (
  mosque_id, prayer, rule_type, offset_minutes, fixed_time,
  verification_type, last_confirmed_at
)
select target_mosque.id, seed.prayer, 'offset', seed.offset_minutes, null, 'founder', now()
from target_mosque
cross join (values
  ('fajr', 25),
  ('dhuhr', 25),
  ('asr', 25),
  ('maghrib', 10),
  ('isha', 25)
) as seed(prayer, offset_minutes)
where not exists (
  select 1 from public.iqamah_rules r
  where r.mosque_id = target_mosque.id and r.prayer = seed.prayer
);

insert into public.city_prayer_times (
  city_key, prayer_date, fajr, dhuhr, asr, maghrib, isha,
  source_name, source_url, fetched_at
)
select
  'muscat', date '2026-09-16', time '04:36', time '12:09', time '15:36',
  time '18:20', time '19:31', 'POC seed — replace with official Oman source', null, now()
where not exists (
  select 1 from public.city_prayer_times
  where city_key = 'muscat' and prayer_date = date '2026-09-16'
);
