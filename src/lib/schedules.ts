import type { SupabaseClient } from '@supabase/supabase-js';
import { buildPrayerScheduleRow } from './domain/iqamah';
import { PRAYER_KEYS, type IqamahRule, type Mosque, type MosqueSchedule } from './domain/prayer';
import { SupabasePrayerTimeProvider } from './prayer-times/supabase-provider';
import { createPublicServerClient } from './supabase/server';

export async function listActiveMosques(client: SupabaseClient = createPublicServerClient()): Promise<Mosque[]> {
  const { data, error } = await client
    .from('mosques')
    .select('id,name_ar,name_en,area_ar,city_key,status')
    .eq('status', 'active')
    .order('name_ar');

  if (error) throw error;
  return (data ?? []) as Mosque[];
}

export async function getMosqueSchedule(
  mosqueId: string,
  prayerDate: string,
  client: SupabaseClient = createPublicServerClient(),
): Promise<MosqueSchedule> {
  const mosqueResult = await client
    .from('mosques')
    .select('id,name_ar,name_en,area_ar,city_key,status')
    .eq('id', mosqueId)
    .single();

  if (mosqueResult.error) throw mosqueResult.error;
  const mosque = mosqueResult.data as Mosque;

  const provider = new SupabasePrayerTimeProvider(client);
  const cityTimes = await provider.getCityDay(mosque.city_key, prayerDate);
  if (!cityTimes) throw new Error(`No prayer times available for ${mosque.city_key}`);

  const rulesResult = await client
    .from('iqamah_rules')
    .select('mosque_id,prayer,rule_type,offset_minutes,fixed_time,last_confirmed_at,verification_type')
    .eq('mosque_id', mosqueId);

  if (rulesResult.error) throw rulesResult.error;
  const rules = (rulesResult.data ?? []) as IqamahRule[];
  const byPrayer = new Map(rules.map((rule) => [rule.prayer, rule]));

  const rows = PRAYER_KEYS.map((prayer) => {
    const rule = byPrayer.get(prayer);
    if (!rule) throw new Error(`Missing iqamah rule for ${prayer}`);
    return buildPrayerScheduleRow(prayer, cityTimes[prayer], rule);
  });

  return {
    mosque,
    prayerDate: cityTimes.prayer_date,
    sourceName: cityTimes.source_name,
    sourceUrl: cityTimes.source_url,
    rows,
  };
}
