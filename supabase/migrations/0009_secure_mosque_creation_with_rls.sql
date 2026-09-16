create policy "authenticated create own mosque" on public.mosques
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'active'
);

create policy "creator assign self owner" on public.mosque_admins
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and exists (
    select 1 from public.mosques m
    where m.id = mosque_admins.mosque_id
      and m.created_by = (select auth.uid())
  )
);

alter function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) security invoker;
