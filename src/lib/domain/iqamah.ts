import type { IqamahRule, PrayerKey, PrayerScheduleRow } from './prayer';

function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

function toMinutes(value: string): number {
  const [hours, minutes] = normalizeTime(value).split(':').map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function calculateIqamahTime(adhanTime: string, rule: IqamahRule): string {
  if (rule.rule_type === 'fixed') {
    if (!rule.fixed_time) throw new Error(`Missing fixed time for ${rule.prayer}`);
    return normalizeTime(rule.fixed_time);
  }

  if (rule.offset_minutes == null) {
    throw new Error(`Missing offset for ${rule.prayer}`);
  }

  return fromMinutes(toMinutes(adhanTime) + rule.offset_minutes);
}

export function buildPrayerScheduleRow(
  prayer: PrayerKey,
  adhanTime: string,
  rule: IqamahRule,
): PrayerScheduleRow {
  return {
    prayer,
    adhanTime: normalizeTime(adhanTime),
    iqamahTime: calculateIqamahTime(adhanTime, rule),
    ruleType: rule.rule_type,
    offsetMinutes: rule.rule_type === 'offset' ? rule.offset_minutes : null,
    lastConfirmedAt: rule.last_confirmed_at,
    verificationType: rule.verification_type,
  };
}
