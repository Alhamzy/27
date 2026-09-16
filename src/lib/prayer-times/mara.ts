import prayerData from '@/data/mara-muscat-2026.json';

export type MaraPrayerDay = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type PrayerMirror = {
  source: {
    name: string;
    url: string;
    city: string;
    country: string;
  };
  generatedAt: string;
  year: number;
  months: Record<string, MaraPrayerDay[]>;
};

const mirror = prayerData as PrayerMirror;

export async function getMaraMonth(year: number, month: number): Promise<MaraPrayerDay[]> {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Invalid year');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid month');
  if (year !== mirror.year) throw new Error(`Official MARA mirror is not available for ${year}`);

  const days = mirror.months[String(month)];
  if (!days?.length) throw new Error(`Official MARA mirror is not available for ${year}-${String(month).padStart(2, '0')}`);
  return days;
}

export const maraSource = mirror.source;
export const maraGeneratedAt = mirror.generatedAt;
