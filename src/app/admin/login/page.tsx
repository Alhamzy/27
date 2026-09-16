'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: true },
    });

    if (authError) {
      setError('تعذر إرسال رمز الدخول. تحقق من البريد الإلكتروني وحاول مرة أخرى.');
      setLoading(false);
      return;
    }

    setEmail(normalizedEmail);
    setStep('otp');
    setMessage(`تم إرسال رمز الدخول إلى ${normalizedEmail}`);
    setLoading(false);
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!/^\d{6}$/.test(otp)) {
      setError('أدخل رمز التحقق المكوّن من 6 أرقام.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (authError) {
      setError('رمز التحقق غير صحيح أو انتهت صلاحيته.');
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
          <p>الدخول وإنشاء الحساب يتمان بنفس رمز البريد الإلكتروني</p>
        </div>
        <button className="icon-button" onClick={() => router.push('/')} aria-label="إغلاق">×</button>
      </header>

      <section className="admin-mosque-card" style={{ maxWidth: 520, marginInline: 'auto' }}>
        {step === 'email' ? (
          <form onSubmit={sendOtp}>
            <label className="admin-label" htmlFor="admin-email">البريد الإلكتروني</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ width: '100%', padding: 12, border: '1px solid #d7e3da', borderRadius: 12, marginBottom: 12 }}
            />
            <p className="admin-muted" style={{ marginTop: 0 }}>
              إذا كان البريد جديداً فسيُنشأ الحساب بعد التحقق. صلاحية إدارة المسجد تُمنح بشكل منفصل.
            </p>
            {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}
            <button className="primary-action wide" type="submit" disabled={loading}>
              {loading ? 'جارٍ إرسال الرمز…' : 'إرسال رمز الدخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label className="admin-label" htmlFor="admin-otp">رمز الدخول</label>
            <input
              id="admin-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ width: '100%', padding: 12, border: '1px solid #d7e3da', borderRadius: 12, marginBottom: 12, textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
            />
            {message && <p role="status" className="admin-muted">{message}</p>}
            {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}
            <button className="primary-action wide" type="submit" disabled={loading}>
              {loading ? 'جارٍ التحقق…' : 'تأكيد الرمز والدخول'}
            </button>
            <button className="ghost-action wide" type="button" onClick={() => { setStep('email'); setOtp(''); setError(null); setMessage(null); }} style={{ marginTop: 10 }}>
              تغيير البريد الإلكتروني
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
