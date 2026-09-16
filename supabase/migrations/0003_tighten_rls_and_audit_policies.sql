revoke execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) from public;
revoke execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) from anon;
grant execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) to authenticated;

create policy "admins read assigned iqamah change log" on public.iqamah_changes for select using (
  exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_changes.mosque_id
      and ma.user_id = auth.uid()
  )
);

create policy "admins append assigned iqamah change log" on public.iqamah_changes for insert with check (
  changed_by = auth.uid()
  and exists (
    select 1 from public.mosque_admins ma
    where ma.mosque_id = iqamah_changes.mosque_id
      and ma.user_id = auth.uid()
  )
);
