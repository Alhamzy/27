create index if not exists correction_suggestions_mosque_id_idx on public.correction_suggestions(mosque_id);
create index if not exists iqamah_changes_changed_by_idx on public.iqamah_changes(changed_by);
create index if not exists iqamah_changes_mosque_id_idx on public.iqamah_changes(mosque_id);
create index if not exists mosque_admins_user_id_idx on public.mosque_admins(user_id);
create index if not exists mosques_created_by_idx on public.mosques(created_by);

drop policy if exists "admins manage assigned mosques" on public.mosques;
create policy "admins manage assigned mosques" on public.mosques
for update to authenticated
using (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = mosques.id
      and ma.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = mosques.id
      and ma.user_id = (select auth.uid())
  )
);

drop policy if exists "admins manage assigned iqamah" on public.iqamah_rules;
create policy "admins insert assigned iqamah" on public.iqamah_rules
for insert to authenticated
with check (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_rules.mosque_id
      and ma.user_id = (select auth.uid())
  )
);
create policy "admins update assigned iqamah" on public.iqamah_rules
for update to authenticated
using (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_rules.mosque_id
      and ma.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_rules.mosque_id
      and ma.user_id = (select auth.uid())
  )
);
create policy "admins delete assigned iqamah" on public.iqamah_rules
for delete to authenticated
using (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_rules.mosque_id
      and ma.user_id = (select auth.uid())
  )
);

drop policy if exists "authenticated admins read assignments" on public.mosque_admins;
create policy "authenticated admins read assignments" on public.mosque_admins
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "admins read assigned iqamah change log" on public.iqamah_changes;
create policy "admins read assigned iqamah change log" on public.iqamah_changes
for select to authenticated
using (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_changes.mosque_id
      and ma.user_id = (select auth.uid())
  )
);

drop policy if exists "admins append assigned iqamah change log" on public.iqamah_changes;
create policy "admins append assigned iqamah change log" on public.iqamah_changes
for insert to authenticated
with check (
  changed_by = (select auth.uid())
  and exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_changes.mosque_id
      and ma.user_id = (select auth.uid())
  )
);
