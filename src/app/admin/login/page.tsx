'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.');
      setLoading(false);
      return;
    }

    router.replace('/admin');
    router.refresh();
  };

  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-topbar">
        <div className="brand-mark">27</div>
        <div className="admin-title-wrap">
          <div className="admin-title-row"><h1>دخول مشرف المسجد</h1></div>
          <p>الدخول مخصص للمشرفين المصرّح لهم فقط</p>
        </div>
        <button className="icon-button" onClick={() => router.push('/')} aria-label="إغلاق">×</button>
      </header>

      <section className="admin-mosque-card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <form onSubmit={submit}>
          <label className="admin-label" htmlFor="admin-email">البريد الإلكتروني</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ width: '100%', padding: 12, border: '1px solid #d7e3da', borderRadius: 12, marginBottom: 16 }}
          />

          <label className="admin-label" htmlFor="admin-password">كلمة المرور</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ width: '100%', padding: 12, border: '1px solid #d7e3da', borderRadius: 12, marginBottom: 16 }}
          />

          {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}

          <button className="primary-action wide" type="submit" disabled={loading}>
            {loading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>
      </section>
    </main>
  );
}
