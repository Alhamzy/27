import prayerData from '@/data/mara-oman-2026.json';

export type MaraPrayerDay = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type MaraLocation = {
  name: string;
  sourceValue: string;
  months: Record<string, MaraPrayerDay[]>;
};

type PrayerMirror = {
  source: {
    name: string;
    url: string;
    country: string;
  };
  generatedAt: string;
  year: number;
  locations: Record<string, MaraLocation>;
};

const mirror = prayerData as PrayerMirror;

export function listMaraLocations() {
  return Object.entries(mirror.locations)
    .map(([key, value]) => ({ key, name: value.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveMaraLocation(input?: string | null) {
  const requested = (input || 'muscat').trim().toLowerCase();
  const direct = mirror.locations[requested];
  if (direct) return { key: requested, ...direct };

  const match = Object.entries(mirror.locations).find(
    ([, value]) => value.name.trim().toLowerCase() === requested,
  );
  if (match) return { key: match[0], ...match[1] };

  throw new Error(`Unknown Oman location: ${input}. Use ?locations=true to list supported locations.`);
}

export async function getMaraMonth(year: number, month: number, locationKey?: string | null): Promise<MaraPrayerDay[]> {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Invalid year');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid month');
  if (year !== mirror.year) throw new Error(`Official MARA mirror is not available for ${year}`);

  const location = resolveMaraLocation(locationKey);
  const days = location.months[String(month)];
  if (!days?.length) throw new Error(`Official MARA mirror is not available for ${location.name} ${year}-${String(month).padStart(2, '0')}`);
  return days;
}

export const maraSource = mirror.source;
export const maraGeneratedAt = mirror.generatedAt;
