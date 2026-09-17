'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_EMAIL = 'demo@27.om';
const DEMO_PASSWORD = 'prayer27';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError('بيانات حساب النسخة التجريبية غير صحيحة.');
      setLoading(false);
      return;
    }

    document.cookie = 'poc_admin=1; path=/; max-age=86400; samesite=lax';
    router.replace('/admin');
    router.refresh();
  };

  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-topbar">
        <div className="brand-mark">27</div>
        <div className="admin-title-wrap">
          <div className="admin-title-row"><h1>حساب مشرف المسجد</h1></div>
          <p>حساب تجريبي للنسخة الأولية لتعديل مواقيت الإقامة</p>
        </div>
        <button className="icon-button" onClick={() => router.push('/')} aria-label="العودة لمواقيت الصلاة">×</button>
      </header>

      <section className="admin-mosque-card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div className="admin-hint" style={{ marginBottom: 18 }}>
          حساب POC جاهز للاستخدام — البيانات مملوءة مسبقاً.
        </div>

        <form onSubmit={submit}>
          <label className="admin-label" htmlFor="admin-email">البريد الإلكتروني</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
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
            {loading ? 'جارٍ الدخول…' : 'دخول لوحة المشرف'}
          </button>
        </form>

        <button className="ghost-action wide" type="button" onClick={() => router.push('/')} style={{ marginTop: 10 }}>
          العودة لمواقيت الصلاة
        </button>
      </section>
    </main>
  );
}
