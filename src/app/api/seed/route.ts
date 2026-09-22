import { NextResponse } from 'next/server';
import { ensureGoogleSheetsSeeded, listWorkouts } from '../../../lib/workout-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const importResult = await ensureGoogleSheetsSeeded();
    const workouts = await listWorkouts();
    return NextResponse.json({
      ok: true,
      importResult,
      workoutCount: workouts.length,
      latestWorkout: workouts[0] ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hint: 'Firestore security rules must permit preview reads/writes for this POC seed.',
      },
      { status: 500 },
    );
  }
}
