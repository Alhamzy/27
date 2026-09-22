import { NextResponse } from 'next/server';
import { listWorkouts } from '../../../lib/workout-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workouts = await listWorkouts();
    return NextResponse.json({
      ok: true,
      workoutCount: workouts.length,
      latestWorkout: workouts[0] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
