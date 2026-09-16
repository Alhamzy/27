revoke execute on function public.save_iqamah_rules(uuid,jsonb) from anon;
revoke execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) from anon;
grant execute on function public.save_iqamah_rules(uuid,jsonb) to authenticated;
grant execute on function public.create_mosque_as_owner(text,text,text,text,double precision,double precision) to authenticated;
