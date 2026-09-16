#!/usr/bin/env python3
import json, re, sys, unicodedata
from calendar import month_name
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests, urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
URLS = ['https://www.mara.gov.om/calendar_page2.asp','http://www.mara.gov.om/calendar_page2.asp','https://mara.gov.om/calendar_page2.asp','http://mara.gov.om/calendar_page2.asp']
HEADERS = {'User-Agent':'Mozilla/5.0 (compatible; OmanPrayerTimesMirror/2.0)','Accept':'text/html,application/xhtml+xml'}
PRAYERS = ['fajr','sunrise','dhuhr','asr','maghrib','isha']


def slugify(text, fallback):
    ascii_text = unicodedata.normalize('NFKD', text).encode('ascii','ignore').decode().lower()
    slug = re.sub(r'[^a-z0-9]+','-',ascii_text).strip('-')
    return slug or f'location-{re.sub(r"[^a-zA-Z0-9]+","-",fallback).strip("-").lower()}'


def normalize_time(value, prayer):
    m = re.search(r'(\d{1,2}):(\d{2})', value)
    if not m: raise ValueError(f'Invalid time {value!r}')
    h = int(m.group(1))
    if prayer in {'asr','maghrib','isha'} and h < 12: h += 12
    return f'{h:02d}:{m.group(2)}'


def fetch_base(session):
    errors=[]
    for url in URLS:
        try:
            r=session.get(url,headers=HEADERS,timeout=30,allow_redirects=True)
            if r.ok and '<html' in r.text.lower():
                print(f'Using MARA URL: {r.url} ({len(r.text)} bytes)')
                return r.url,r.text
            errors.append(f'{url}: HTTP {r.status_code}')
        except Exception as exc: errors.append(f'{url}: {exc!r}')
    raise RuntimeError('Unable to fetch MARA: '+' | '.join(errors))


def parse_month(html, year, month):
    soup=BeautifulSoup(html,'html.parser'); result=[]
    for tr in soup.find_all('tr'):
        text=' '.join(tr.stripped_strings)
        dm=re.search(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b',text)
        if not dm or int(dm.group(2))!=month or int(dm.group(3))!=year: continue
        times=re.findall(r'\b\d{1,2}:\d{2}\b',text[dm.end():])
        if len(times)<6: continue
        row={'date':f'{year:04d}-{month:02d}-{int(dm.group(1)):02d}'}
        for prayer,value in zip(PRAYERS,times[:6]): row[prayer]=normalize_time(value,prayer)
        result.append(row)
    result.sort(key=lambda x:x['date'])
    if len(result)<28: raise RuntimeError(f'Parsed only {len(result)} days for {year}-{month:02d}')
    return result


def discover_form(base_html, year, month):
    soup=BeautifulSoup(base_html,'html.parser')
    for form in soup.find_all('form') or [soup]:
        selects=form.find_all('select'); month_sel=year_sel=loc_sel=None
        for sel in selects:
            opts=[((o.get('value') or '').strip(),o.get_text(' ',strip=True)) for o in sel.find_all('option')]
            if any(month_name[month].lower() in t.lower() or v==str(month) or t==str(month) for v,t in opts): month_sel=month_sel or sel
            if any(v==str(year) or t==str(year) for v,t in opts): year_sel=year_sel or sel
            if any(re.search(r'muscat|مسقط',f'{v} {t}',re.I) for v,t in opts): loc_sel=loc_sel or sel
        if month_sel and year_sel and loc_sel: return form,month_sel,year_sel,loc_sel
    raise RuntimeError('Could not identify MARA month/year/location controls')


def option_value(sel, predicate):
    for o in sel.find_all('option'):
        v=(o.get('value') or o.get_text(' ',strip=True)).strip(); t=o.get_text(' ',strip=True)
        if predicate(v,t): return v
    return None


def locations_from_select(loc_sel):
    locations=[]; seen=set()
    for o in loc_sel.find_all('option'):
        value=(o.get('value') or '').strip(); name=o.get_text(' ',strip=True)
        if not value or not name or re.search(r'select|choose|اختر',name,re.I): continue
        key=slugify(name,value)
        base=key; n=2
        while key in seen: key=f'{base}-{n}'; n+=1
        seen.add(key); locations.append({'key':key,'name':name,'sourceValue':value})
    if not any(re.search(r'muscat|مسقط',x['name'],re.I) for x in locations): raise RuntimeError('Muscat missing from MARA location list')
    return locations


def request_month(session, base_url, base_html, year, month, location_value):
    form,month_sel,year_sel,loc_sel=discover_form(base_html,year,month)
    data={}
    for inp in form.find_all('input'):
        name=inp.get('name'); typ=(inp.get('type') or '').lower()
        if name and typ in {'hidden','submit'}: data[name]=inp.get('value','')
    mval=option_value(month_sel,lambda v,t: month_name[month].lower() in t.lower() or v==str(month) or t==str(month))
    yval=option_value(year_sel,lambda v,t: v==str(year) or t==str(year))
    data[month_sel.get('name') or month_sel.get('id')]=mval
    data[year_sel.get('name') or year_sel.get('id')]=yval
    data[loc_sel.get('name') or loc_sel.get('id')]=location_value
    action=urljoin(base_url,form.get('action') or base_url); method=(form.get('method') or 'get').lower()
    if method=='post': r=session.post(action,data=data,headers={**HEADERS,'Referer':base_url},timeout=30,allow_redirects=True)
    else: r=session.get(action,params=data,headers={**HEADERS,'Referer':base_url},timeout=30,allow_redirects=True)
    r.raise_for_status(); return parse_month(r.text,year,month)


def main():
    year=int(sys.argv[1]) if len(sys.argv)>1 else 2026
    start=int(sys.argv[2]) if len(sys.argv)>2 else 9
    end=int(sys.argv[3]) if len(sys.argv)>3 else 12
    out=Path(sys.argv[4]) if len(sys.argv)>4 else Path(f'src/data/mara-oman-{year}.json')
    session=requests.Session(); session.verify=False
    base_url,base_html=fetch_base(session)
    _,_,_,loc_sel=discover_form(base_html,year,start)
    locations=locations_from_select(loc_sel)
    print('Locations:',[(x['key'],x['name'],x['sourceValue']) for x in locations])

    payload={'source':{'name':'Oman Ministry of Endowments and Religious Affairs (MARA)','url':'https://www.mara.gov.om/calendar_page2.asp','country':'Oman'},'generatedAt':datetime.now(timezone.utc).isoformat(),'year':year,'locations':{}}
    for loc in locations:
        months={}
        for month in range(start,end+1):
            rows=request_month(session,base_url,base_html,year,month,loc['sourceValue'])
            months[str(month)]=rows
            print(f"{loc['name']} {year}-{month:02d}: {len(rows)} days")
        payload['locations'][loc['key']]={'name':loc['name'],'sourceValue':loc['sourceValue'],'months':months}

    muscat=next(v for v in payload['locations'].values() if re.search(r'muscat|مسقط',v['name'],re.I))
    check=next((d for d in muscat['months'].get('9',[]) if d['date']=='2026-09-16'),None)
    expected={'date':'2026-09-16','fajr':'04:38','sunrise':'05:54','dhuhr':'12:07','asr':'15:34','maghrib':'18:15','isha':'19:26'}
    if year==2026 and start<=9<=end and check!=expected: raise RuntimeError(f'Muscat verification failed: got {check}, expected {expected}')
    out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {len(locations)} locations to {out}')

if __name__=='__main__': main()
