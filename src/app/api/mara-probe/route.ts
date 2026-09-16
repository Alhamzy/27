import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const urls = [
  'https://www.mara.gov.om/calendar_page2.asp',
  'http://www.mara.gov.om/calendar_page2.asp',
  'https://mara.gov.om/calendar_page2.asp',
  'http://mara.gov.om/calendar_page2.asp',
];

export async function GET() {
  const results = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; PrayerTimesPOC/1.0)',
          accept: 'text/html,application/xhtml+xml',
        },
        cache: 'no-store',
        redirect: 'manual',
      });
      const html = await response.text();
      results.push({ url, ok: response.ok, status: response.status, location: response.headers.get('location'), html: html.slice(0, 2000) });
    } catch (error) {
      const e = error as Error & { cause?: unknown };
      results.push({ url, error: e.message, cause: String(e.cause ?? '') });
    }
  }
  return NextResponse.json({ results });
}
