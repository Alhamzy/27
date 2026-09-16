import { redirect } from 'next/navigation';
import { AdminScreen } from './admin-screen';
import { getMosqueSchedule } from '@/lib/schedules';
import type { Mosque } from '@/lib/domain/prayer';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

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
  const params = await searchParams;
  const supabase = await createAuthServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    redirect('/admin/login');
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from('mosque_admins')
    .select('role, mosque:mosques!inner(id,name_ar,name_en,area_ar,city_key,status)')
    .eq('user_id', authData.user.id);

  if (assignmentError) throw assignmentError;

  const mosques = (assignments ?? [])
    .map((assignment) => assignment.mosque)
    .filter(Boolean) as unknown as Mosque[];

  if (!mosques.length) {
    return (
      <main className="empty-state" data-ui-baseline="stitch-27_2" dir="rtl">
        <div className="brand-mark">27</div>
        <h1>لا توجد مساجد مرتبطة بحسابك</h1>
        <p>يجب تعيين حسابك كمشرف لمسجد قبل أن تتمكن من تعديل مواقيت الإقامة.</p>
      </main>
    );
  }

  const selected = mosques.find((mosque) => mosque.id === params?.mosque) ?? mosques[0];
  const schedule = await getMosqueSchedule(selected.id, omanToday(), supabase);

  return <AdminScreen mosques={mosques} schedule={schedule} />;
}
