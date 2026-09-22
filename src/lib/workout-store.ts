import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { GOOGLE_SHEETS_SEED } from './workout-seed';

export type WorkoutType = 'strength' | 'run' | 'mobility';

export type WorkoutSet = {
  set: string;
  reps: string;
  weight: string;
};

export type WorkoutExercise = {
  name: string;
  muscleGroup?: string;
  unit?: string;
  legacyValue?: string;
  sets?: WorkoutSet[];
  notes?: string;
};

export type WorkoutRecord = {
  id?: string;
  type: WorkoutType;
  name: string;
  date: string;
  duration?: string;
  notes?: string;
  source?: 'google_sheets' | 'app';
  exercises?: WorkoutExercise[];
  distance?: string;
  pace?: string;
  rpe?: string;
  mobilityDetails?: string;
};

const months: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function toIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const match = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return value;
  const [, day, mon, year] = match;
  return `${year}-${months[mon] ?? '01'}-${day.padStart(2, '0')}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

export function localSeedStrengthWorkouts(): WorkoutRecord[] {
  const rows = GOOGLE_SHEETS_SEED.strengthLog as readonly (readonly unknown[])[];
  const grouped = new Map<string, WorkoutRecord>();
  let currentDate = '';
  let currentWorkout = '';

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const rowDate = typeof row[0] === 'string' ? row[0] : '';
    const rowWorkout = typeof row[1] === 'string' ? row[1] : '';
    if (rowDate) currentDate = toIsoDate(rowDate);
    if (rowWorkout) currentWorkout = rowWorkout;

    const exerciseName = typeof row[3] === 'string' ? row[3].trim() : '';
    if (!exerciseName || !currentDate || !currentWorkout) continue;

    const key = `${currentDate}|${currentWorkout}`;
    const existing = grouped.get(key) ?? {
      type: 'strength' as const,
      name: currentWorkout,
      date: currentDate,
      source: 'google_sheets' as const,
      exercises: [],
    };

    existing.exercises!.push({
      muscleGroup: typeof row[2] === 'string' ? row[2].trim() : '',
      name: exerciseName,
      unit: typeof row[4] === 'string' ? row[4] : '',
      legacyValue: row[5] == null ? '' : String(row[5]),
      notes: typeof row[6] === 'string' ? row[6] : '',
    });
    grouped.set(key, existing);
  }

  return [...grouped.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function rowsAsMaps(rows: readonly (readonly unknown[])[]) {
  return rows.map((cells, index) => ({
    index,
    cells: Array.from(cells).map((cell) => cell ?? null),
  }));
}

export async function ensureGoogleSheetsSeeded() {
  const markerRef = doc(db, 'meta', 'google-sheets-import-v1');
  const marker = await getDoc(markerRef);
  if (marker.exists()) return { seeded: false, alreadyPresent: true };

  const batch = writeBatch(db);
  batch.set(doc(db, 'sheet_imports', 'training_checklist'), {
    sourceSpreadsheetId: GOOGLE_SHEETS_SEED.sourceSpreadsheetId,
    sourceTitle: GOOGLE_SHEETS_SEED.sourceTitle,
    sheetName: 'Training Checklist',
    rows: rowsAsMaps(GOOGLE_SHEETS_SEED.trainingChecklist),
  });
  batch.set(doc(db, 'sheet_imports', 'strength_log'), {
    sourceSpreadsheetId: GOOGLE_SHEETS_SEED.sourceSpreadsheetId,
    sourceTitle: GOOGLE_SHEETS_SEED.sourceTitle,
    sheetName: 'Strength Log',
    rows: rowsAsMaps(GOOGLE_SHEETS_SEED.strengthLog),
  });
  batch.set(doc(db, 'sheet_imports', 'guidance'), {
    sourceSpreadsheetId: GOOGLE_SHEETS_SEED.sourceSpreadsheetId,
    sourceTitle: GOOGLE_SHEETS_SEED.sourceTitle,
    sheetName: 'Guidance',
    rows: rowsAsMaps(GOOGLE_SHEETS_SEED.guidance),
  });
  batch.set(doc(db, 'sheet_imports', 'strength_reference'), {
    sourceSpreadsheetId: GOOGLE_SHEETS_SEED.sourceSpreadsheetId,
    sourceTitle: GOOGLE_SHEETS_SEED.sourceTitle,
    sheetName: 'Strength Reference',
    rows: rowsAsMaps(GOOGLE_SHEETS_SEED.strengthReference),
  });

  for (const workout of localSeedStrengthWorkouts()) {
    const id = `${workout.date}-${slug(workout.name)}`;
    batch.set(doc(db, 'workouts', id), workout);
  }

  batch.set(markerRef, {
    sourceSpreadsheetId: GOOGLE_SHEETS_SEED.sourceSpreadsheetId,
    importedAt: serverTimestamp(),
    sheetRowCounts: {
      trainingChecklist: GOOGLE_SHEETS_SEED.trainingChecklist.length,
      strengthLog: GOOGLE_SHEETS_SEED.strengthLog.length,
      guidance: GOOGLE_SHEETS_SEED.guidance.length,
      strengthReference: GOOGLE_SHEETS_SEED.strengthReference.length,
    },
  });

  await batch.commit();
  return { seeded: true, alreadyPresent: false };
}

export async function listWorkouts(): Promise<WorkoutRecord[]> {
  const snapshot = await getDocs(collection(db, 'workouts'));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...(item.data() as WorkoutRecord) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveWorkout(workout: WorkoutRecord) {
  const ref = await addDoc(collection(db, 'workouts'), {
    ...workout,
    source: 'app',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markPocConfigured() {
  await setDoc(doc(db, 'meta', 'poc'), { updatedAt: serverTimestamp() }, { merge: true });
}
