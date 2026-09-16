'use client';

import { useState } from 'react';
import type { MosqueSchedule, PrayerKey } from '@/lib/domain/prayer';
import { createClient } from '@/lib/supabase/browser';

const prayerNames: Record<PrayerKey, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export function CorrectionSuggestion({ schedule }: { schedule: MosqueSchedule }) {
  const [open, setOpen] = useState(false);
  const [prayer, setPrayer] = useState<PrayerKey>('fajr');
  const [mode, setMode] = useState<'offset' | 'fixed'>('offset');
  const [offset, setOffset] = useState('');
  const [fixedTime, setFixedTime] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const offsetValue = Number(offset);
    if (mode === 'offset' && (!Number.isFinite(offsetValue) || offsetValue < 0 || offsetValue > 180)) {
      setMessage('أدخل عدد دقائق صحيحاً بين 0 و180.');
      return;
    }
    if (mode === 'fixed' && !fixedTime) {
      setMessage('حدد وقت الإقامة المقترح.');
      return;
    }

    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from('correction_suggestions').insert({
      mosque_id: schedule.mosque.id,
      prayer,
      suggested_rule_type: mode,
      suggested_offset_minutes: mode === 'offset' ? offsetValue : null,
      suggested_fixed_time: mode === 'fixed' ? fixedTime : null,
      note: note.trim() || null,
      status: 'pending',
    });

    if (error) {
      setMessage('تعذر إرسال الاقتراح. حاول مرة أخرى.');
    } else {
      setMessage('تم إرسال الاقتراح للمراجعة. لن تتغير المواقيت الرسمية حتى يعتمدها المشرف.');
      setOffset('');
      setFixedTime('');
      setNote('');
    }
    setSaving(false);
  };

  return (
    <>
      <button className="secondary-action" type="button" onClick={() => setOpen(true)} style={{ marginTop: 16 }}>
        اقتراح تصحيح
      </button>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-label="اقتراح تصحيح" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>اقتراح تصحيح</h2>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="إغلاق">×</button>
            </div>
            <p>سيُرسل اقتراحك للمراجعة فقط، ولن يغيّر مواقيت المسجد مباشرة.</p>

            <label>الصلاة
              <select value={prayer} onChange={(event) => setPrayer(event.target.value as PrayerKey)}>
                {schedule.rows.map((row) => <option key={row.prayer} value={row.prayer}>{prayerNames[row.prayer]}</option>)}
              </select>
            </label>

            <label>نوع التصحيح
              <select value={mode} onChange={(event) => setMode(event.target.value as 'offset' | 'fixed')}>
                <option value="offset">دقائق بعد الأذان</option>
                <option value="fixed">وقت ثابت للإقامة</option>
              </select>
            </label>

            {mode === 'offset' ? (
              <label>الدقائق بعد الأذان
                <input type="number" min="0" max="180" value={offset} onChange={(event) => setOffset(event.target.value)} placeholder="مثال: 20" />
              </label>
            ) : (
              <label>وقت الإقامة
                <input type="time" value={fixedTime} onChange={(event) => setFixedTime(event.target.value)} />
              </label>
            )}

            <label>ملاحظة اختيارية
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: تم التأكد من لوحة المسجد" maxLength={500} />
            </label>

            {message && <p role="status">{message}</p>}
            <button className="primary-action wide" type="button" onClick={submit} disabled={saving}>
              {saving ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
