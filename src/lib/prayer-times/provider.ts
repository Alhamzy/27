import type { CityPrayerTimes } from '../domain/prayer';

export interface PrayerTimeProvider {
  getCityDay(cityKey: string, prayerDate: string): Promise<CityPrayerTimes | null>;
}
