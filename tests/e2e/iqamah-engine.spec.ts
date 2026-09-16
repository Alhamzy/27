import { expect, test } from '@playwright/test';
import { calculateIqamahTime } from '../../src/lib/domain/iqamah';
import type { IqamahRule } from '../../src/lib/domain/prayer';

function rule(overrides: Partial<IqamahRule>): IqamahRule {
  return {
    mosque_id: 'test-mosque',
    prayer: 'fajr',
    rule_type: 'offset',
    offset_minutes: 25,
    fixed_time: null,
    last_confirmed_at: null,
    verification_type: 'founder',
    ...overrides,
  };
}

test('offset rule adds minutes to adhan', () => {
  expect(calculateIqamahTime('04:36:00', rule({ offset_minutes: 25 }))).toBe('05:01');
  expect(calculateIqamahTime('18:20:00', rule({ prayer: 'maghrib', offset_minutes: 10 }))).toBe('18:30');
});

test('offset rule wraps over midnight', () => {
  expect(calculateIqamahTime('23:55:00', rule({ offset_minutes: 10 }))).toBe('00:05');
});

test('fixed rule ignores adhan offset', () => {
  expect(
    calculateIqamahTime(
      '04:36:00',
      rule({ rule_type: 'fixed', offset_minutes: null, fixed_time: '05:10:00' }),
    ),
  ).toBe('05:10');
});
