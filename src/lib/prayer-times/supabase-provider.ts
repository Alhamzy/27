import type { SupabaseClient } from '@supabase/supabase-js';
import type { CityPrayerTimes } from '../domain/prayer';
import type { PrayerTimeProvider } from './provider';

export class SupabasePrayerTimeProvider implements PrayerTimeProvider {
  constructor(private readonly client: SupabaseClient) {}

  async getCityDay(cityKey: string, prayerDate: string): Promise<CityPrayerTimes | null> {
    const exact = await this.client
      .from('city_prayer_times')
      .select('city_key,prayer_date,fajr,dhuhr,asr,maghrib,isha,source_name,source_url,fetched_at')
      .eq('city_key', cityKey)
      .eq('prayer_date', prayerDate)
      .maybeSingle();

    if (exact.error) throw exact.error;
    if (exact.data) return exact.data as CityPrayerTimes;

    // POC fallback: use the latest available row for that city until an official
    // automated Oman provider is connected. The UI can still surface the source.
    const fallback = await this.client
      .from('city_prayer_times')
      .select('city_key,prayer_date,fajr,dhuhr,asr,maghrib,isha,source_name,source_url,fetched_at')
      .eq('city_key', cityKey)
      .lte('prayer_date', prayerDate)
      .order('prayer_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallback.error) throw fallback.error;
    return (fallback.data as CityPrayerTimes | null) ?? null;
  }
}
