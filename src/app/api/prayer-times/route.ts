import { NextRequest, NextResponse } from 'next/server';
import {
  getMaraMonth,
  listMaraLocations,
  maraGeneratedAt,
  maraSource,
  resolveMaraLocation,
} from '@/lib/prayer-times/mara';

export const dynamic = 'force-dynamic';

function parseInteger(value: string | null, fallback?: number) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : NaN;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    if (params.get('locations') === 'true') {
      return NextResponse.json({
        source: maraSource,
        lastUpdated: maraGeneratedAt,
        locations: listMaraLocations(),
      });
    }

    const locationInput = params.get('city') ?? params.get('location') ?? 'muscat';
    const location = resolveMaraLocation(locationInput);
    const date = params.get('date');

    if (date) {
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });

      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month < 1 || month > 12) return NextResponse.json({ error: 'Invalid month' }, { status: 400 });

      const days = await getMaraMonth(year, month, location.key);
      const day = days.find((item) => item.date === date);
      if (!day) return NextResponse.json({ error: 'Prayer times not found for that date' }, { status: 404 });

      return NextResponse.json({
        source: maraSource,
        location: { key: location.key, name: location.name },
        lastUpdated: maraGeneratedAt,
        data: day,
      });
    }

    const year = parseInteger(params.get('year'), 2026);
    if (!year || Number.isNaN(year)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

    const month = parseInteger(params.get('month'));
    if (month != null) {
      if (Number.isNaN(month) || month < 1 || month > 12) return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
      const data = await getMaraMonth(year, month, location.key);
      return NextResponse.json({
        source: maraSource,
        location: { key: location.key, name: location.name },
        year,
        month,
        lastUpdated: maraGeneratedAt,
        data,
      });
    }

    const fromMonth = parseInteger(params.get('fromMonth'), 9);
    const toMonth = parseInteger(params.get('toMonth'), 12);
    if (!fromMonth || !toMonth || Number.isNaN(fromMonth) || Number.isNaN(toMonth) || fromMonth < 1 || toMonth > 12 || fromMonth > toMonth) {
      return NextResponse.json({ error: 'Invalid month range' }, { status: 400 });
    }

    const months = [];
    for (let currentMonth = fromMonth; currentMonth <= toMonth; currentMonth += 1) {
      months.push({ month: currentMonth, data: await getMaraMonth(year, currentMonth, location.key) });
    }

    return NextResponse.json({
      source: maraSource,
      location: { key: location.key, name: location.name },
      year,
      fromMonth,
      toMonth,
      lastUpdated: maraGeneratedAt,
      months,
    });
  } catch (error) {
    console.error('Prayer-times API failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load prayer times' },
      { status: 404 },
    );
  }
}
