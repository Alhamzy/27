import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { PocAdminScreen } from './poc-admin-screen';
import { getMosqueSchedule, listActiveMosques } from '@/lib/schedules';

export const dynamic = 'force-dynamic';

type AdminPageProps = {
  searchParams?: Promise<{ mosque?: string }>;
};

function omanToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Muscat',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  if (cookieStore.get('poc_admin')?.value !== '1') {
    redirect('/admin/login');
  }

  const params = await searchParams;
  const mosques = await listActiveMosques();

  if (!mosques.length) {
    return (
      <main className="empty-state" data-ui-baseline="stitch-27_2" dir="rtl">
        <div className="brand-mark">27</div>
        <h1>لا توجد مساجد متاحة</h1>
        <p>لا توجد بيانات مسجد في النسخة التجريبية.</p>
      </main>
    );
  }

  const selected = mosques.find((mosque) => mosque.id === params?.mosque) ?? mosques[0];
  const schedule = await getMosqueSchedule(selected.id, omanToday());

  return <PocAdminScreen schedule={schedule} />;
}
