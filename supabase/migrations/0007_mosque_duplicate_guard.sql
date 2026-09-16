create unique index if not exists mosques_unique_active_identity
on public.mosques ((lower(trim(name_ar))), (lower(trim(coalesce(area_ar,'')))), (lower(trim(city_key))))
where status <> 'archived';
