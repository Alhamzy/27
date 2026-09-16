#!/usr/bin/env python3
import json
import re
import sys
from calendar import month_name
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

URLS = [
    'https://www.mara.gov.om/calendar_page2.asp',
    'http://www.mara.gov.om/calendar_page2.asp',
    'https://mara.gov.om/calendar_page2.asp',
    'http://mara.gov.om/calendar_page2.asp',
]
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; OmanPrayerTimesMirror/1.0)',
    'Accept': 'text/html,application/xhtml+xml',
}


def normalize_time(value, prayer):
    m = re.search(r'(\d{1,2}):(\d{2})', value)
    if not m:
        raise ValueError(f'Invalid time {value!r}')
    h, minute = int(m.group(1)), m.group(2)
    if prayer in {'asr', 'maghrib', 'isha'} and h < 12:
        h += 12
    return f'{h:02d}:{minute}'


def fetch_base(session):
    errors = []
    for url in URLS:
        try:
            r = session.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            if r.ok and '<html' in r.text.lower():
                print(f'Using MARA URL: {r.url} ({r.status_code}, {len(r.text)} bytes)')
                return r.url, r.text
            errors.append(f'{url}: HTTP {r.status_code}')
        except Exception as exc:
            errors.append(f'{url}: {exc!r}')
    raise RuntimeError('Unable to fetch MARA: ' + ' | '.join(errors))


def option_match(select, predicate):
    for option in select.find_all('option'):
        value = (option.get('value') or option.get_text(' ', strip=True)).strip()
        text = option.get_text(' ', strip=True)
        if predicate(value, text):
            return value
    return None


def classify_selects(form, year, month):
    month_word = month_name[month].lower()
    month_select = year_select = city_select = None
    for select in form.find_all('select'):
        options = [((o.get('value') or '').strip(), o.get_text(' ', strip=True)) for o in select.find_all('option')]
        if any(text.lower() == month_word or month_word in text.lower() or value == str(month) or text == str(month) for value, text in options):
            month_select = month_select or select
        if any(value == str(year) or text == str(year) for value, text in options):
            year_select = year_select or select
        if any(re.search(r'muscat|مسقط', f'{value} {text}', re.I) for value, text in options):
            city_select = city_select or select
    return month_select, year_select, city_select


def submit_month(session, base_url, base_html, year, month):
    soup = BeautifulSoup(base_html, 'html.parser')
    forms = soup.find_all('form') or [soup]
    for form in forms:
        month_select, year_select, city_select = classify_selects(form, year, month)
        if not month_select or not year_select:
            continue

        data = {}
        for inp in form.find_all('input'):
            name = inp.get('name')
            if name and (inp.get('type') or '').lower() in {'hidden', 'submit'}:
                data[name] = inp.get('value', '')

        mval = option_match(month_select, lambda v, t: t.lower() == month_name[month].lower() or month_name[month].lower() in t.lower() or v == str(month) or t == str(month))
        yval = option_match(year_select, lambda v, t: v == str(year) or t == str(year))
        if not mval or not yval:
            continue
        data[month_select.get('name') or month_select.get('id')] = mval
        data[year_select.get('name') or year_select.get('id')] = yval
        if city_select:
            cval = option_match(city_select, lambda v, t: bool(re.search(r'muscat|مسقط', f'{v} {t}', re.I)))
            if cval:
                data[city_select.get('name') or city_select.get('id')] = cval

        action = urljoin(base_url, form.get('action') or base_url)
        method = (form.get('method') or 'get').lower()
        print(f'Submitting {year}-{month:02d}: {method.upper()} {action} fields={data}')
        if method == 'post':
            r = session.post(action, data=data, headers={**HEADERS, 'Referer': base_url}, timeout=30, allow_redirects=True)
        else:
            r = session.get(action, params=data, headers={**HEADERS, 'Referer': base_url}, timeout=30, allow_redirects=True)
        r.raise_for_status()
        return r.text

    names = [(s.get('name'), [o.get_text(' ', strip=True) for o in s.find_all('option')[:5]]) for s in soup.find_all('select')]
    raise RuntimeError(f'Could not identify MARA month/year controls. Selects: {names}')


def parse_month(html, year, month):
    soup = BeautifulSoup(html, 'html.parser')
    result = []
    prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
    for tr in soup.find_all('tr'):
        text = ' '.join(tr.stripped_strings)
        dm = re.search(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b', text)
        if not dm or int(dm.group(2)) != month or int(dm.group(3)) != year:
            continue
        times = re.findall(r'\b\d{1,2}:\d{2}\b', text[dm.end():])
        if len(times) < 6:
            continue
        row = {'date': f'{year:04d}-{month:02d}-{int(dm.group(1)):02d}'}
        for prayer, value in zip(prayers, times[:6]):
            row[prayer] = normalize_time(value, prayer)
        result.append(row)
    result.sort(key=lambda x: x['date'])
    if len(result) < 28:
        raise RuntimeError(f'Parsed only {len(result)} days for {year}-{month:02d}')
    return result


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    start_month = int(sys.argv[2]) if len(sys.argv) > 2 else 9
    end_month = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    out = Path(sys.argv[4]) if len(sys.argv) > 4 else Path(f'src/data/mara-muscat-{year}.json')

    session = requests.Session()
    base_url, base_html = fetch_base(session)
    months = {}
    for month in range(start_month, end_month + 1):
        try:
            rows = parse_month(base_html, year, month)
        except Exception:
            rows = parse_month(submit_month(session, base_url, base_html, year, month), year, month)
        months[str(month)] = rows
        print(f'{year}-{month:02d}: {len(rows)} days; first={rows[0]}')

    payload = {
        'source': {'name': 'Oman Ministry of Endowments and Religious Affairs (MARA)', 'url': 'https://www.mara.gov.om/calendar_page2.asp', 'city': 'Muscat', 'country': 'Oman'},
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'year': year,
        'months': months,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    check = next((d for d in months.get('9', []) if d['date'] == '2026-09-16'), None)
    expected = {'date': '2026-09-16', 'fajr': '04:38', 'sunrise': '05:54', 'dhuhr': '12:07', 'asr': '15:34', 'maghrib': '18:15', 'isha': '19:26'}
    if year == 2026 and start_month <= 9 <= end_month and check != expected:
        raise RuntimeError(f'Source verification failed for 2026-09-16: got {check}, expected {expected}')


if __name__ == '__main__':
    main()
