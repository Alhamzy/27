create extension if not exists pgcrypto;

create table if not exists public.mosques (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  area_ar text not null,
  city_key text not null default 'muscat',
  latitude double precision,
  longitude double precision,
  status text not null default 'active' check (status in ('active','pending','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.city_prayer_times (
  id uuid primary key default gen_random_uuid(),
  city_key text not null,
  prayer_date date not null,
  fajr time not null,
  dhuhr time not null,
  asr time not null,
  maghrib time not null,
  isha time not null,
  source_name text,
  source_url text,
  fetched_at timestamptz not null default now(),
  unique(city_key, prayer_date)
);

create table if not exists public.iqamah_rules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  rule_type text not null default 'offset' check (rule_type in ('offset','fixed')),
  offset_minutes integer,
  fixed_time time,
  valid_from date,
  valid_to date,
  last_confirmed_at timestamptz not null default now(),
  verification_type text not null default 'founder' check (verification_type in ('founder','mosque','community')),
  updated_at timestamptz not null default now(),
  unique(mosque_id, prayer),
  check ((rule_type='offset' and offset_minutes is not null and fixed_time is null) or (rule_type='fixed' and fixed_time is not null))
);

create table if not exists public.mosque_admins (
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor','owner')),
  created_at timestamptz not null default now(),
  primary key (mosque_id, user_id)
);

create table if not exists public.iqamah_changes (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer text,
  changed_by uuid references auth.users(id),
  before_data jsonb,
  after_data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.correction_suggestions (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references public.mosques(id) on delete cascade,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  suggested_rule_type text check (suggested_rule_type in ('offset','fixed')),
  suggested_offset_minutes integer,
  suggested_fixed_time time,
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

alter table public.mosques enable row level security;
alter table public.city_prayer_times enable row level security;
alter table public.iqamah_rules enable row level security;
alter table public.mosque_admins enable row level security;
alter table public.iqamah_changes enable row level security;
alter table public.correction_suggestions enable row level security;

create policy "public read active mosques" on public.mosques for select using (status='active');
create policy "public read prayer times" on public.city_prayer_times for select using (true);
create policy "public read iqamah rules" on public.iqamah_rules for select using (true);
create policy "admins manage assigned mosques" on public.mosques for update using (
  exists (select 1 from public.mosque_admins ma where ma.mosque_id = mosques.id and ma.user_id = auth.uid())
);
create policy "admins manage assigned iqamah" on public.iqamah_rules for all using (
  exists (select 1 from public.mosque_admins ma where ma.mosque_id = iqamah_rules.mosque_id and ma.user_id = auth.uid())
) with check (
  exists (select 1 from public.mosque_admins ma where ma.mosque_id = iqamah_rules.mosque_id and ma.user_id = auth.uid())
);
create policy "authenticated admins read assignments" on public.mosque_admins for select using (user_id = auth.uid());
create policy "public create correction suggestions" on public.correction_suggestions for insert with check (true);
