'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Mosque, MosqueSchedule, PrayerKey } from '@/lib/domain/prayer';

const prayerNames: Record<PrayerKey, string> = {
  fajr: 'صلاة الفجر',
  dhuhr: 'صلاة الظهر',
  asr: 'صلاة العصر',
  maghrib: 'صلاة المغرب',
  isha: 'صلاة العشاء',
};

type DraftRule = {
  prayer: PrayerKey;
  mode: 'offset' | 'fixed';
  offset: number;
  fixedTime: string;
  adhanTime: string;
};

function normalize(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
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

export function AdminScreen({ mosques, schedule }: { mosques: Mosque[]; schedule: MosqueSchedule }) {
  const router = useRouter();
  const [draftMosques, setDraftMosques] = useState<Mosque[]>(mosques);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('');

  const initialDraft = useMemo<DraftRule[]>(() => schedule.rows.map((row) => ({
    prayer: row.prayer,
    mode: row.ruleType,
    offset: row.offsetMinutes ?? 0,
    fixedTime: normalize(row.iqamahTime),
    adhanTime: normalize(row.adhanTime),
  })), [schedule]);

  const [rules, setRules] = useState<DraftRule[]>(initialDraft);

  const changeRule = (prayer: PrayerKey, patch: Partial<DraftRule>) => {
    setRules((current) => current.map((rule) => rule.prayer === prayer ? { ...rule, ...patch } : rule));
  };

  const reset = () => setRules(initialDraft);

  const savePreview = () => {
    setToast('تم حفظ التغييرات في نسخة المعاينة');
    window.setTimeout(() => setToast(null), 2600);
  };

  const addMosquePreview = () => {
    const name = newName.trim();
    if (!name) return;
    const tempId = `preview-${Date.now()}`;
    setDraftMosques((current) => [...current, {
      id: tempId,
      name_ar: name,
      name_en: null,
      area_ar: newArea.trim() || 'مسقط',
      city_key: 'muscat',
      status: 'active',
    }]);
    setNewName('');
    setNewArea('');
    setShowAdd(false);
    setToast('تمت إضافة المسجد للمعاينة — الحفظ الدائم يأتي مع صلاحيات الإدارة');
    window.setTimeout(() => setToast(null), 3600);
  };

  return (
    <main className="admin-shell" data-ui-baseline="stitch-27_2" dir="rtl">
      <header className="admin-topbar">
        <div className="brand-mark">27</div>
        <div className="admin-title-wrap">
          <div className="admin-title-row">
            <h1>إدارة مواقيت الإقامة</h1>
            <span className="admin-badge">مشرف معتمد</span>
          </div>
          <p>آخر تحديث: اليوم، 08:42 ص</p>
        </div>
        <button className="icon-button" onClick={() => router.push('/')} aria-label="إغلاق">×</button>
      </header>

      <section className="admin-mosque-card">
        <div className="admin-mosque-actions">
          <div>
            <span className="admin-label">المسجد المحدد للضبط والتعديل</span>
            <strong>{schedule.mosque.name_ar}</strong>
            <small>{schedule.mosque.area_ar ?? 'مسقط'} — عُمان</small>
          </div>
          <div className="admin-action-row">
            <button className="secondary-action" onClick={() => setShowAdd(true)}>+ إضافة مسجد</button>
            <select
              className="mosque-admin-select"
              value={schedule.mosque.id}
              onChange={(event) => {
                if (event.target.value.startsWith('preview-')) {
                  setToast('المسجد الجديد في وضع المعاينة فقط حالياً');
                  return;
                }
                router.push(`/admin?mosque=${event.target.value}`);
              }}
            >
              {draftMosques.map((mosque) => <option value={mosque.id} key={mosque.id}>{mosque.name_ar}</option>)}
            </select>
          </div>
        </div>
        <div className="admin-status-row">
          <span className="status-chip"><span className="verified-dot" /> مفعّل</span>
          <span className="admin-muted">مواقيت الإقامة معروضة حالياً للمستخدمين</span>
        </div>
      </section>

      <section className="admin-hint">ⓘ حدد دقائق الانتظار بعد الأذان لكل صلاة، أو اضبط وقتاً ثابتاً للإقامة.</section>

      <section className="admin-prayer-list">
        {rules.map((rule) => {
          const iqamah = rule.mode === 'offset' ? addMinutes(rule.adhanTime, rule.offset) : rule.fixedTime;
          return (
            <article className="admin-prayer-card" key={rule.prayer}>
              <div className="admin-prayer-header">
                <div className="admin-prayer-name"><span className="row-dot" /><strong>{prayerNames[rule.prayer]}</strong></div>
                <span className="adhan-chip">🔒 الأذان: <b>{formatTime(rule.adhanTime)}</b></span>
              </div>

              <div className="rule-mode-row">
                <span>طريقة الحساب:</span>
                <div className="segmented">
                  <button className={rule.mode === 'offset' ? 'active' : ''} onClick={() => changeRule(rule.prayer, { mode: 'offset' })}>بعد الأذان</button>
                  <button className={rule.mode === 'fixed' ? 'active' : ''} onClick={() => changeRule(rule.prayer, { mode: 'fixed' })}>وقت ثابت</button>
                </div>
              </div>

              {rule.mode === 'offset' ? (
                <div className="offset-editor-row">
                  <div className="offset-caption"><span>الانتظار</span><strong>دقيقة بعد الأذان</strong></div>
                  <div className="stepper">
                    <button onClick={() => changeRule(rule.prayer, { offset: Math.max(0, rule.offset - 5) })}>−</button>
                    <input
                      aria-label={`دقائق ${prayerNames[rule.prayer]}`}
                      value={rule.offset}
                      inputMode="numeric"
                      onChange={(event) => changeRule(rule.prayer, { offset: Math.max(0, Number(event.target.value) || 0) })}
                    />
                    <button onClick={() => changeRule(rule.prayer, { offset: Math.min(180, rule.offset + 5) })}>+</button>
                  </div>
                </div>
              ) : (
                <div className="fixed-editor-row">
                  <label>وقت الإقامة المحدد:</label>
                  <input type="time" value={rule.fixedTime} onChange={(event) => changeRule(rule.prayer, { fixedTime: event.target.value })} />
                </div>
              )}

              <div className="derived-time">
                <span>{rule.mode === 'offset' ? `${formatTime(rule.adhanTime)} + ${rule.offset} دقيقة` : 'وقت ثابت'}</span>
                <strong>الإقامة: {formatTime(iqamah)}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-savebar">
        <button className="danger-link" onClick={reset}>الاستعادة الافتراضية</button>
        <button className="ghost-action" onClick={reset}>تراجع</button>
        <button className="primary-action" onClick={savePreview}>✓ حفظ التغييرات</button>
      </div>

      {showAdd && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowAdd(false)}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-label="إضافة مسجد" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h2>إضافة مسجد</h2><button className="icon-button" onClick={() => setShowAdd(false)}>×</button></div>
            <p>أضف بيانات المسجد الأساسية، ثم يمكنك ضبط مواقيت الإقامة مباشرة.</p>
            <label>اسم المسجد<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="مثال: مسجد النور" /></label>
            <label>المنطقة<input value={newArea} onChange={(event) => setNewArea(event.target.value)} placeholder="مثال: الخوض" /></label>
            <label>المدينة<select defaultValue="muscat"><option value="muscat">مسقط</option></select></label>
            <button className="primary-action wide" onClick={addMosquePreview}>إضافة والانتقال إلى الضبط</button>
          </section>
        </div>
      )}

      {toast && <div className="admin-toast" role="status">{toast}</div>}
    </main>
  );
}
