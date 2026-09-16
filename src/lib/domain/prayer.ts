export const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

export type PrayerKey = (typeof PRAYER_KEYS)[number];
export type IqamahRuleType = 'offset' | 'fixed';
export type VerificationType = 'founder' | 'mosque' | 'community';

export type Mosque = {
  id: string;
  name_ar: string;
  name_en: string | null;
  area_ar: string | null;
  city_key: string;
  status: 'active' | 'inactive';
};

export type CityPrayerTimes = {
  city_key: string;
  prayer_date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  source_name: string | null;
  source_url: string | null;
  fetched_at: string | null;
};

export type IqamahRule = {
  mosque_id: string;
  prayer: PrayerKey;
  rule_type: IqamahRuleType;
  offset_minutes: number | null;
  fixed_time: string | null;
  last_confirmed_at: string | null;
  verification_type: VerificationType | null;
};

export type PrayerScheduleRow = {
  prayer: PrayerKey;
  adhanTime: string;
  iqamahTime: string;
  ruleType: IqamahRuleType;
  offsetMinutes: number | null;
  lastConfirmedAt: string | null;
  verificationType: VerificationType | null;
};

export type MosqueSchedule = {
  mosque: Mosque;
  prayerDate: string;
  sourceName: string | null;
  sourceUrl: string | null;
  rows: PrayerScheduleRow[];
};
