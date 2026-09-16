'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

type Mode = 'signin' | 'signup';

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const bootstrapPocAdmin = async () => {
    const supabase = createClient();
    await supabase.rpc('claim_first_poc_mosque');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    if (mode === 'signin') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.');
        setLoading(false);
        return;
      }

      await bootstrapPocAdmin();
      router.replace('/admin');
      router.refresh();
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError.message.includes('already registered')
        ? 'هذا البريد مسجل مسبقاً. استخدم تسجيل الدخول.'
        : 'تعذر إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى.');
      setLoading(false);
      return;
    }

    if (data.session) {
      await bootstrapPocAdmin();
      router.replace('/admin');
      router.refresh();
      return;
    }

    setMessage('تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً في Supabase، أكّد بريدك ثم سجّل الدخول.');
    setMode('signin');
    setLoading(false);
  };

  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-topbar">
        <div className="brand-mark">27</div>
        <div className="admin-title-wrap">
          <div className="admin-title-row"><h1>حساب مشرف المسجد</h1></div>
          <p>نسخة POC بسيطة: أنشئ حساباً أو سجّل الدخول لتعديل مواقيت الإقامة</p>
        </div>
        <button className="icon-button" onClick={() => router.push('/')} aria-label="إغلاق">×</button>
      </header>

      <section className="admin-mosque-card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            className={mode === 'signin' ? 'primary-action' : 'ghost-action'}
            onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'primary-action' : 'ghost-action'}
            onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
          >
            إنشاء حساب
          </button>
        </div>

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
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ width: '100%', padding: 12, border: '1px solid #d7e3da', borderRadius: 12, marginBottom: 16 }}
          />

          {message && <p role="status" className="admin-muted">{message}</p>}
          {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}

          <button className="primary-action wide" type="submit" disabled={loading}>
            {loading
              ? (mode === 'signin' ? 'جارٍ تسجيل الدخول…' : 'جارٍ إنشاء الحساب…')
              : (mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب')}
          </button>
        </form>
      </section>
    </main>
  );
}
