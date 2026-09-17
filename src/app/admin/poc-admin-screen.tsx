'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MosqueSchedule, PrayerKey } from '@/lib/domain/prayer';
import { createClient } from '@/lib/supabase/browser';

const prayerNames: Record<PrayerKey, string> = {
  fajr: 'صلاة الفجر',
  dhuhr: 'صلاة الظهر',
  asr: 'صلاة العصر',
  maghrib: 'صلاة المغرب',
  isha: 'صلاة العشاء',
};

function normalize(time: string) {
  return time.slice(0, 5);
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = normalize(time).split(':').map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function formatTime(time: string) {
  const [hText, m] = normalize(time).split(':');
  let h = Number(hText);
  const suffix = h >= 12 ? 'م' : 'ص';
  h %= 12;
  if (!h) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${suffix}`;
}

export function PocAdminScreen({ schedule }: { schedule: MosqueSchedule }) {
  const router = useRouter();
  const initial = useMemo(() => schedule.rows.map((row) => ({
    prayer: row.prayer,
    adhan: normalize(row.adhanTime),
    offset: row.offsetMinutes ?? 0,
  })), [schedule]);

  const [rules, setRules] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const changeOffset = (prayer: PrayerKey, offset: number) => {
    setRules((current) => current.map((rule) => rule.prayer === prayer
      ? { ...rule, offset: Math.max(0, Math.min(180, offset)) }
      : rule));
  };

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const payload = rules.map((rule) => ({
      prayer: rule.prayer,
      rule_type: 'offset',
      offset_minutes: rule.offset,
      fixed_time: null,
    }));

    const { error } = await supabase.rpc('save_poc_iqamah_rules', {
      p_mosque_id: schedule.mosque.id,
      p_rules: payload,
    });

    if (error) {
      setToast('تعذر حفظ التغييرات. حاول مرة أخرى.');
    } else {
      setToast('تم حفظ مواقيت الإقامة بنجاح');
      router.refresh();
    }
    setSaving(false);
    window.setTimeout(() => setToast(null), 3000);
  };

  const signOut = () => {
    document.cookie = 'poc_admin=; path=/; max-age=0; samesite=lax';
    router.replace('/');
    router.refresh();
  };

  return (
    <main className="admin-shell" data-ui-baseline="stitch-27_2" dir="rtl">
      <header className="admin-topbar">
        <div className="brand-mark">27</div>
        <div className="admin-title-wrap">
          <div className="admin-title-row">
            <h1>إدارة مواقيت الإقامة</h1>
            <span className="admin-badge">حساب POC</span>
          </div>
          <p>عدّل عدد الدقائق بين الأذان والإقامة</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ghost-action" type="button" onClick={signOut}>تسجيل الخروج</button>
          <button className="icon-button" onClick={() => router.push('/')} aria-label="العودة لمواقيت الصلاة">×</button>
        </div>
      </header>

      <section className="admin-mosque-card">
        <div className="admin-mosque-actions">
          <div>
            <span className="admin-label">المسجد المحدد</span>
            <strong>{schedule.mosque.name_ar}</strong>
            <small>{schedule.mosque.area_ar ?? 'مسقط'} — عُمان</small>
          </div>
        </div>
      </section>

      <section className="admin-hint">ⓘ هذه لوحة مبسطة للنسخة الأولية. عدّل دقائق الانتظار ثم احفظ.</section>

      <section className="admin-prayer-list">
        {rules.map((rule) => {
          const iqamah = addMinutes(rule.adhan, rule.offset);
          return (
            <article className="admin-prayer-card" key={rule.prayer}>
              <div className="admin-prayer-header">
                <div className="admin-prayer-name"><span className="row-dot" /><strong>{prayerNames[rule.prayer]}</strong></div>
                <span className="adhan-chip">🔒 الأذان: <b>{formatTime(rule.adhan)}</b></span>
              </div>

              <div className="offset-editor-row">
                <div className="offset-caption"><span>الانتظار</span><strong>دقيقة بعد الأذان</strong></div>
                <div className="stepper">
                  <button type="button" onClick={() => changeOffset(rule.prayer, rule.offset - 5)}>−</button>
                  <input
                    aria-label={`دقائق ${prayerNames[rule.prayer]}`}
                    value={rule.offset}
                    inputMode="numeric"
                    onChange={(event) => changeOffset(rule.prayer, Number(event.target.value) || 0)}
                  />
                  <button type="button" onClick={() => changeOffset(rule.prayer, rule.offset + 5)}>+</button>
                </div>
              </div>

              <div className="derived-time">
                <span>{formatTime(rule.adhan)} + {rule.offset} دقيقة</span>
                <strong>الإقامة: {formatTime(iqamah)}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-savebar">
        <button className="ghost-action" type="button" onClick={() => setRules(initial)}>تراجع</button>
        <button className="primary-action" type="button" disabled={saving} onClick={save}>
          {saving ? 'جارٍ الحفظ…' : '✓ حفظ التغييرات'}
        </button>
      </div>

      {toast && <div className="admin-toast" role="status">{toast}</div>}
    </main>
  );
}
