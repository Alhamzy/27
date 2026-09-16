import { PublicPrayerScreen } from './public-prayer-screen';
import { getMosqueSchedule, listActiveMosques } from '../lib/schedules';

export const dynamic = 'force-dynamic';

function muscatDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Muscat',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mosque?: string }>;
}) {
  const mosques = await listActiveMosques();

  if (mosques.length === 0) {
    return (
      <main className="empty-state" dir="rtl">
        <div className="brand-mark">27</div>
        <h1>لا توجد مساجد مضافة بعد</h1>
        <p>سيتم عرض مواقيت الإقامة هنا بمجرد إضافة أول مسجد.</p>
      </main>
    );
  }

  const params = await searchParams;
  const requestedMosque = mosques.find((mosque) => mosque.id === params.mosque);
  const mosque = requestedMosque ?? mosques[0];
  const prayerDate = muscatDateKey();

  try {
    const schedule = await getMosqueSchedule(mosque.id, prayerDate);
    return <PublicPrayerScreen mosques={mosques} schedule={schedule} />;
  } catch {
    return (
      <main className="empty-state" dir="rtl">
        <div className="brand-mark">27</div>
        <h1>{mosque.name_ar}</h1>
        <p>لم تتوفر مواقيت الصلاة لهذا اليوم بعد.</p>
        <small>سنُظهر مواقيت الإقامة فور توفر جدول المدينة.</small>
      </main>
    );
  }
}
