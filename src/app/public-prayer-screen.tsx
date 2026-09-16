'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Mosque, MosqueSchedule, PrayerKey } from '../lib/domain/prayer';

const prayerNames: Record<PrayerKey, string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

function toOmanDate(date: string, time: string) {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalized}+04:00`);
}

function formatTime(time: string) {
  const [hoursString, minutes] = time.split(':');
  let hours = Number(hoursString);
  const suffix = hours >= 12 ? 'م' : 'ص';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${suffix}`;
}

function relativeFreshness(value: string | null, now: number) {
  if (!value) return 'غير مؤكد حديثاً';
  if (!now) return 'جارٍ التحقق من آخر تحديث';
  const diffHours = Math.floor((now - new Date(value).getTime()) / 3_600_000);
  if (diffHours < 24) return 'تم التأكيد اليوم';
  const days = Math.floor(diffHours / 24);
  if (days === 1) return 'تم التأكيد أمس';
  if (days < 30) return `تم التأكيد قبل ${days} أيام`;
  return 'يحتاج إلى إعادة تأكيد';
}

export function PublicPrayerScreen({ mosques, schedule }: { mosques: Mosque[]; schedule: MosqueSchedule }) {
  const router = useRouter();
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const referenceNow = now || 0;
  const nextRow = schedule.rows.find((row) => toOmanDate(schedule.prayerDate, row.iqamahTime).getTime() > referenceNow) ?? null;
  const nextIqamah = nextRow ? toOmanDate(schedule.prayerDate, nextRow.iqamahTime).getTime() : null;
  const countdownMinutes = now && nextIqamah ? Math.max(0, Math.ceil((nextIqamah - now) / 60_000)) : null;

  const freshestConfirmation = schedule.rows
    .map((row) => row.lastConfirmedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return (
    <main className="public-shell" data-ui-baseline="stitch-arabic-public" dir="rtl">
      <header className="topbar">
        <div>
          <div className="eyebrow">مواقيت الصلاة والإقامة</div>
          <h1>٢٧</h1>
        </div>
        <div className="brand-mark" aria-label="27">27</div>
      </header>

      <section className="mosque-picker-card">
        <label htmlFor="mosque-select">المسجد</label>
        <div className="mosque-picker-row">
          <div>
            <strong>{schedule.mosque.name_ar}</strong>
            <span>{schedule.mosque.area_ar ?? 'مسقط'} — عُمان</span>
          </div>
          <select
            id="mosque-select"
            value={schedule.mosque.id}
            onChange={(event) => router.push(`/?mosque=${event.target.value}`)}
            aria-label="تغيير المسجد"
          >
            {mosques.map((mosque) => (
              <option key={mosque.id} value={mosque.id}>{mosque.name_ar}</option>
            ))}
          </select>
        </div>
        <div className="freshness-line">
          <span className="verified-dot" />
          <span>{relativeFreshness(freshestConfirmation, now)}</span>
        </div>
      </section>

      <section className="next-card" aria-live="polite">
        {nextRow ? (
          <>
            <div className="next-card-topline">الصلاة القادمة</div>
            <div className="next-prayer-name">صلاة {prayerNames[nextRow.prayer]}</div>
            <div className="next-time-grid">
              <div>
                <span>الأذان</span>
                <strong>{formatTime(nextRow.adhanTime)}</strong>
              </div>
              <div>
                <span>الإقامة</span>
                <strong>{formatTime(nextRow.iqamahTime)}</strong>
              </div>
            </div>
            <div className="countdown-pill">
              {countdownMinutes === null ? 'جارٍ حساب الوقت المتبقي' : countdownMinutes === 0 ? 'تقام الصلاة الآن' : `الإقامة بعد ${countdownMinutes} دقيقة`}
            </div>
          </>
        ) : (
          <>
            <div className="next-card-topline">اليوم</div>
            <div className="next-prayer-name">انتهت صلوات الجماعة لليوم</div>
            <p className="next-card-note">ستظهر مواعيد اليوم التالي عند توفرها.</p>
          </>
        )}
      </section>

      <section className="schedule-section">
        <div className="section-heading">
          <h2>مواقيت اليوم</h2>
          <span>{new Intl.DateTimeFormat('ar-OM', { dateStyle: 'medium', timeZone: 'Asia/Muscat' }).format(new Date(`${schedule.prayerDate}T12:00:00+04:00`))}</span>
        </div>

        <div className="prayer-list">
          {schedule.rows.map((row) => {
            const active = nextRow?.prayer === row.prayer;
            return (
              <article className={`prayer-row${active ? ' is-next' : ''}`} key={row.prayer}>
                <div className="prayer-name-block">
                  <span className="row-dot" />
                  <div>
                    <strong>{prayerNames[row.prayer]}</strong>
                    <small>{row.ruleType === 'offset' ? `${row.offsetMinutes ?? 0}+ دقيقة بعد الأذان` : 'وقت إقامة ثابت'}</small>
                  </div>
                </div>
                <div className="time-cell muted-time">
                  <span>الأذان</span>
                  <strong>{formatTime(row.adhanTime)}</strong>
                </div>
                <div className="time-cell iqamah-time">
                  <span>الإقامة</span>
                  <strong>{formatTime(row.iqamahTime)}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="public-footer">
        <span>{schedule.sourceName?.startsWith('POC') ? 'بيانات تجريبية للنسخة الأولية' : schedule.sourceName ?? '27'}</span>
        <span>مواعيد الإقامة تختلف من مسجد لآخر</span>
      </footer>
    </main>
  );
}
