import { unstable_cache } from 'next/cache';

const MARA_MONTHLY_URL = 'https://www.mara.gov.om/calendar_page2.asp';
const SOURCE_NAME = 'Oman Ministry of Endowments and Religious Affairs (MARA)';

export type MaraPrayerDay = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type SelectOption = { value: string; text: string };
type HtmlSelect = { name: string; options: SelectOption[] };

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1] ?? null;
}

function parseSelects(html: string): HtmlSelect[] {
  const selects: HtmlSelect[] = [];
  const selectRegex = /<select\b[^>]*>[\s\S]*?<\/select>/gi;

  for (const match of html.matchAll(selectRegex)) {
    const block = match[0];
    const openTag = block.match(/<select\b[^>]*>/i)?.[0] ?? '';
    const name = getAttribute(openTag, 'name') ?? getAttribute(openTag, 'id');
    if (!name) continue;

    const options: SelectOption[] = [];
    const optionRegex = /<option\b[^>]*>[\s\S]*?<\/option>/gi;
    for (const optionMatch of block.matchAll(optionRegex)) {
      const option = optionMatch[0];
      const open = option.match(/<option\b[^>]*>/i)?.[0] ?? '';
      const value = getAttribute(open, 'value') ?? decodeHtml(option);
      options.push({ value, text: decodeHtml(option) });
    }
    selects.push({ name, options });
  }

  return selects;
}

function parseHiddenInputs(html: string) {
  const fields = new URLSearchParams();
  const inputRegex = /<input\b[^>]*>/gi;
  for (const match of html.matchAll(inputRegex)) {
    const tag = match[0];
    const type = (getAttribute(tag, 'type') ?? '').toLowerCase();
    const name = getAttribute(tag, 'name');
    if (!name || type !== 'hidden') continue;
    fields.set(name, getAttribute(tag, 'value') ?? '');
  }
  return fields;
}

function optionMatchesMonth(option: SelectOption, month: number) {
  const text = option.text.toLowerCase();
  const value = option.value.toLowerCase();
  const monthName = MONTH_NAMES[month - 1];
  return text === monthName || text.includes(monthName) || Number(value) === month || Number(text) === month;
}

function findMonthSelect(selects: HtmlSelect[], month: number) {
  return selects.find((select) => select.options.some((option) => optionMatchesMonth(option, month)));
}

function findYearSelect(selects: HtmlSelect[], year: number) {
  return selects.find((select) => select.options.some((option) => option.text.trim() === String(year) || option.value.trim() === String(year)));
}

function findCitySelect(selects: HtmlSelect[]) {
  return selects.find((select) => select.options.some((option) => /muscat|مسقط/i.test(`${option.text} ${option.value}`)));
}

function selectValue(select: HtmlSelect | undefined, matcher: (option: SelectOption) => boolean) {
  return select?.options.find(matcher)?.value;
}

function normalizePrayerTime(value: string, prayer: keyof Omit<MaraPrayerDay, 'date'>) {
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) throw new Error(`Invalid ${prayer} time: ${value}`);
  let hour = Number(match[1]);
  const minute = match[2];

  if ((prayer === 'asr' || prayer === 'maghrib' || prayer === 'isha') && hour < 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function toIsoDate(rawDate: string) {
  const match = rawDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) throw new Error(`Invalid MARA date: ${rawDate}`);
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

export function parseMaraMonthlyHtml(html: string, expectedYear: number, expectedMonth: number): MaraPrayerDay[] {
  const rows: MaraPrayerDay[] = [];
  const rowRegex = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowRegex)) {
    const row = decodeHtml(rowMatch[0]);
    const dateMatch = row.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    if (!dateMatch) continue;

    const date = toIsoDate(dateMatch[1]);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (parsedDate.getUTCFullYear() !== expectedYear || parsedDate.getUTCMonth() + 1 !== expectedMonth) continue;

    const afterDate = row.slice((row.indexOf(dateMatch[1]) + dateMatch[1].length));
    const times = Array.from(afterDate.matchAll(/\b(\d{1,2}:\d{2})\b/g), (m) => m[1]);
    if (times.length < 6) continue;

    rows.push({
      date,
      fajr: normalizePrayerTime(times[0], 'fajr'),
      sunrise: normalizePrayerTime(times[1], 'sunrise'),
      dhuhr: normalizePrayerTime(times[2], 'dhuhr'),
      asr: normalizePrayerTime(times[3], 'asr'),
      maghrib: normalizePrayerTime(times[4], 'maghrib'),
      isha: normalizePrayerTime(times[5], 'isha'),
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length < 28) throw new Error(`MARA parser returned only ${rows.length} rows for ${expectedYear}-${expectedMonth}`);
  return rows;
}

async function fetchBasePage() {
  const response = await fetch(MARA_MONTHLY_URL, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; OmanPrayerTimesPOC/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`MARA returned HTTP ${response.status}`);
  return response.text();
}

function formAction(html: string) {
  const formTag = html.match(/<form\b[^>]*>/i)?.[0] ?? '';
  const action = getAttribute(formTag, 'action');
  if (!action) return MARA_MONTHLY_URL;
  return new URL(action, MARA_MONTHLY_URL).toString();
}

async function fetchRequestedMonth(year: number, month: number) {
  const baseHtml = await fetchBasePage();
  const directRows = (() => {
    try { return parseMaraMonthlyHtml(baseHtml, year, month); } catch { return []; }
  })();
  if (directRows.length >= 28) return directRows;

  const selects = parseSelects(baseHtml);
  const monthSelect = findMonthSelect(selects, month);
  const yearSelect = findYearSelect(selects, year);
  const citySelect = findCitySelect(selects);

  if (!monthSelect || !yearSelect) {
    throw new Error('Could not discover MARA month/year form controls. The Ministry page structure may have changed.');
  }

  const body = parseHiddenInputs(baseHtml);
  const monthValue = selectValue(monthSelect, (option) => optionMatchesMonth(option, month));
  const yearValue = selectValue(yearSelect, (option) => option.text.trim() === String(year) || option.value.trim() === String(year));
  if (!monthValue || !yearValue) throw new Error('Could not resolve MARA month/year option values.');

  body.set(monthSelect.name, monthValue);
  body.set(yearSelect.name, yearValue);

  if (citySelect) {
    const cityValue = selectValue(citySelect, (option) => /muscat|مسقط/i.test(`${option.text} ${option.value}`));
    if (cityValue) body.set(citySelect.name, cityValue);
  }

  const submitResponse = await fetch(formAction(baseHtml), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'Mozilla/5.0 (compatible; OmanPrayerTimesPOC/1.0)',
      accept: 'text/html,application/xhtml+xml',
      referer: MARA_MONTHLY_URL,
    },
    body: body.toString(),
    cache: 'no-store',
    redirect: 'follow',
  });

  if (!submitResponse.ok) throw new Error(`MARA month request returned HTTP ${submitResponse.status}`);
  return parseMaraMonthlyHtml(await submitResponse.text(), year, month);
}

export async function getMaraMonth(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Invalid year');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Invalid month');

  return unstable_cache(
    () => fetchRequestedMonth(year, month),
    ['mara-muscat-prayer-times', String(year), String(month)],
    { revalidate: 60 * 60 * 24 * 30 },
  )();
}

export const maraSource = {
  name: SOURCE_NAME,
  url: MARA_MONTHLY_URL,
  city: 'Muscat',
  country: 'Oman',
};
