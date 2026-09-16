import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = 'https://www.mara.gov.om/calendar_page2.asp';
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; PrayerTimesPOC/1.0)',
      accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });

  const html = await response.text();
  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    url: response.url,
    html: html.slice(0, 20000),
  });
}
