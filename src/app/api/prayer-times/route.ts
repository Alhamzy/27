import { NextRequest, NextResponse } from 'next/server';
import { getMaraMonth, maraSource } from '@/lib/prayer-times/mara';

export const dynamic = 'force-dynamic';

function parseInteger(value: string | null, fallback?: number) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const date = params.get('date');

    if (date) {
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });

      const year = Number(match[1]);
      const month = Number(match[2]);
      const days = await getMaraMonth(year, month);
      const day = days.find((item) => item.date === date);
      if (!day) return NextResponse.json({ error: 'Prayer times not found for that date' }, { status: 404 });

      return NextResponse.json({
        source: maraSource,
        lastUpdated: new Date().toISOString(),
        data: day,
      });
    }

    const year = parseInteger(params.get('year'), new Date().getUTCFullYear());
    if (!year || Number.isNaN(year)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

    const month = parseInteger(params.get('month'));
    if (month != null && !Number.isNaN(month)) {
      const data = await getMaraMonth(year, month);
      return NextResponse.json({
        source: maraSource,
        year,
        month,
        lastUpdated: new Date().toISOString(),
        data,
      });
    }

    const fromMonth = parseInteger(params.get('fromMonth'), 1);
    const toMonth = parseInteger(params.get('toMonth'), 12);
    if (!fromMonth || !toMonth || Number.isNaN(fromMonth) || Number.isNaN(toMonth) || fromMonth < 1 || toMonth > 12 || fromMonth > toMonth) {
      return NextResponse.json({ error: 'Invalid month range' }, { status: 400 });
    }

    const months = [];
    for (let currentMonth = fromMonth; currentMonth <= toMonth; currentMonth += 1) {
      months.push({ month: currentMonth, data: await getMaraMonth(year, currentMonth) });
    }

    return NextResponse.json({
      source: maraSource,
      year,
      fromMonth,
      toMonth,
      lastUpdated: new Date().toISOString(),
      months,
    });
  } catch (error) {
    console.error('Prayer-times API failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load prayer times' },
      { status: 502 },
    );
  }
}
