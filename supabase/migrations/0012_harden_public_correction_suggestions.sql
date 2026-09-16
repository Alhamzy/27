drop policy if exists "public create correction suggestions" on public.correction_suggestions;

create policy "public submit pending correction suggestions"
on public.correction_suggestions
for insert
to anon, authenticated
with check (
  status = 'pending'
  and (
    (suggested_rule_type = 'offset' and suggested_offset_minutes between 0 and 180 and suggested_fixed_time is null)
    or
    (suggested_rule_type = 'fixed' and suggested_fixed_time is not null and suggested_offset_minutes is null)
  )
);
