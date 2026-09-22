'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ensureGoogleSheetsSeeded,
  listWorkouts,
  localSeedStrengthWorkouts,
  saveWorkout,
  type WorkoutExercise,
  type WorkoutRecord,
  type WorkoutSet,
} from '../lib/workout-store';

type View = 'home' | 'strength' | 'previous' | 'run' | 'mobility' | 'add-exercise';

type StrengthExercise = {
  name: string;
  last: string;
  muscleGroup?: string;
  sets: WorkoutSet[];
  notes?: string;
};

const setOptions = Array.from({ length: 10 }, (_, index) => String(index + 1));
const repOptions = [...Array.from({ length: 20 }, (_, index) => String(index + 1)), '20+'];

function displayDate(value: string) {
  if (!value) return '';
  const parsed = new Date(value + 'T00:00:00');
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(/^0/, '');
}

function todayMuscat() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Muscat',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function cleanUpperBName(name: string) {
  return name.toLowerCase().includes('upper b') ? 'Upper B' : name;
}

function previousValue(exercise: WorkoutExercise | undefined, fallback: string) {
  if (!exercise) return fallback;
  const raw = exercise.legacyValue?.replaceAll('--', ' / ').trim();
  if (!raw) return fallback;
  const unit = exercise.unit && exercise.unit !== 'bodyweight' ? ' ' + exercise.unit : '';
  return raw + unit;
}

function defaultStrength(previous?: WorkoutRecord): StrengthExercise[] {
  const find = (name: string) =>
    previous?.exercises?.find((item) => item.name.toLowerCase().includes(name.toLowerCase()));

  const pullups = previousValue(find('Pull-ups'), '4 / 3 / 2');
  const rows = previousValue(find('Barbell rows'), '70 lb');
  const leg = previousValue(find('Leg extension'), '45 kg');

  return [
    {
      name: 'Pull-ups',
      last: pullups,
      muscleGroup: 'Back',
      sets: [
        { set: '1', reps: '4', weight: 'bodyweight' },
        { set: '2', reps: '3', weight: 'bodyweight' },
      ],
    },
    {
      name: 'Barbell rows',
      last: rows,
      muscleGroup: 'Back',
      sets: [
        { set: '1', reps: '8', weight: rows || '70 lb' },
        { set: '2', reps: '8', weight: rows || '70 lb' },
      ],
    },
    {
      name: 'Leg extension',
      last: leg,
      muscleGroup: 'Legs',
      sets: [
        { set: '1', reps: '10', weight: leg || '45 kg' },
        { set: '2', reps: '10', weight: leg || '45 kg' },
      ],
    },
  ];
}

export function WorkoutPoc() {
  const localWorkouts = useMemo(() => localSeedStrengthWorkouts(), []);
  const [view, setView] = useState<View>('home');
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>(localWorkouts);
  const [databaseState, setDatabaseState] = useState<'loading' | 'connected' | 'blocked'>('loading');
  const [message, setMessage] = useState('');

  const previousUpperB = useMemo(
    () =>
      workouts.find(
        (workout) =>
          workout.type === 'strength' && workout.name.toLowerCase().includes('upper b'),
      ) ?? localWorkouts.find((workout) => workout.name.toLowerCase().includes('upper b')),
    [workouts, localWorkouts],
  );

  const [workoutName, setWorkoutName] = useState('Upper B');
  const [strengthNotes, setStrengthNotes] = useState('');
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>(
    () => defaultStrength(previousUpperB),
  );

  const [runName, setRunName] = useState('Easy evening run');
  const [distance, setDistance] = useState('4.8 km');
  const [duration, setDuration] = useState('36:40');
  const [pace, setPace] = useState('7:38 / km');
  const [rpe, setRpe] = useState('6');
  const [runNotes, setRunNotes] = useState(
    'Felt easy after the first 10 minutes. One short walk break at the hill.',
  );

  const [mobilityName, setMobilityName] = useState('Hip + ankle mobility');
  const [mobilityDuration, setMobilityDuration] = useState('18 min');
  const [mobilityDetails, setMobilityDetails] = useState(
    '90/90 hip switches, couch stretch, ankle rocks, light hamstring flossing',
  );
  const [mobilityNotes, setMobilityNotes] = useState(
    'Left ankle felt tight at first; loosened after a few minutes.',
  );

  const [newExerciseName, setNewExerciseName] = useState('Cable row');
  const [newMuscleGroup, setNewMuscleGroup] = useState('Back');
  const [newSet, setNewSet] = useState('1');
  const [newReps, setNewReps] = useState('10');
  const [newWeight, setNewWeight] = useState('55 kg');
  const [newExerciseNotes, setNewExerciseNotes] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await ensureGoogleSheetsSeeded();
        const data = await listWorkouts();
        if (!active) return;
        setWorkouts(data.length ? data : localWorkouts);
        setDatabaseState('connected');
      } catch (error) {
        console.error('Firestore setup/import error', error);
        if (!active) return;
        setDatabaseState('blocked');
        setWorkouts(localWorkouts);
      }
    })();
    return () => {
      active = false;
    };
  }, [localWorkouts]);

  useEffect(() => {
    if (!previousUpperB) return;
    const stored = window.localStorage.getItem('workout-poc-upper-b');
    if (stored) {
      try {
        setStrengthExercises(JSON.parse(stored));
        return;
      } catch {}
    }
    setStrengthExercises(defaultStrength(previousUpperB));
  }, [previousUpperB]);

  useEffect(() => {
    window.localStorage.setItem('workout-poc-upper-b', JSON.stringify(strengthExercises));
  }, [strengthExercises]);

  function flash(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2600);
  }

  function goHome() {
    setView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateSet(
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: string,
  ) {
    setStrengthExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, innerIndex) =>
                innerIndex === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
  }

  function addSet(exerciseIndex: number) {
    setStrengthExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise;
        const next = Math.min(exercise.sets.length + 1, 10);
        return {
          ...exercise,
          sets: [...exercise.sets, { set: String(next), reps: '10', weight: '' }],
        };
      }),
    );
  }

  function addExercise() {
    setStrengthExercises((current) => [
      ...current,
      {
        name: newExerciseName || 'Untitled exercise',
        muscleGroup: newMuscleGroup,
        last: 'New exercise',
        notes: newExerciseNotes,
        sets: [{ set: newSet, reps: newReps, weight: newWeight }],
      },
    ]);
    setView('strength');
    flash('Exercise added');
  }

  async function persist(workout: WorkoutRecord) {
    try {
      await saveWorkout(workout);
      const refreshed = await listWorkouts();
      setWorkouts(refreshed);
      flash('Workout saved');
      goHome();
    } catch (error) {
      console.error(error);
      flash('Firestore write blocked — preview remains usable locally');
    }
  }

  if (view === 'strength') {
    return (
      <Screen>
        <Header back="Workouts" title="Strength" onBack={goHome} trailing="•••" />
        <section className="card workout-name-card">
          <Label>Workout name</Label>
          <input
            className="field"
            value={workoutName}
            onChange={(event) => setWorkoutName(event.target.value)}
            aria-label="Workout name"
          />
        </section>

        <PreviousSummary workout={previousUpperB} onOpen={() => setView('previous')} />

        <div className="section-line">
          <strong>Current workout</strong>
          <span>Autosaves locally</span>
        </div>

        {strengthExercises.map((exercise, exerciseIndex) => (
          <section className="card exercise-card" key={exercise.name + exerciseIndex}>
            <div className="exercise-top">
              <strong>{exercise.name}</strong>
              <span>Last: {exercise.last}</span>
            </div>
            <div className="set-labels">
              <span>SET</span>
              <span>REPS</span>
              <span>WEIGHT</span>
            </div>
            {exercise.sets.map((set, setIndex) => (
              <div className="set-row" key={setIndex}>
                <select
                  className="field set-select"
                  value={set.set}
                  onChange={(event) =>
                    updateSet(exerciseIndex, setIndex, 'set', event.target.value)
                  }
                  aria-label={exercise.name + ' set'}
                >
                  {setOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <select
                  className="field reps-select"
                  value={set.reps}
                  onChange={(event) =>
                    updateSet(exerciseIndex, setIndex, 'reps', event.target.value)
                  }
                  aria-label={exercise.name + ' reps'}
                >
                  {repOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <input
                  className="field weight-input"
                  value={set.weight}
                  placeholder="Enter weight"
                  onChange={(event) =>
                    updateSet(exerciseIndex, setIndex, 'weight', event.target.value)
                  }
                  aria-label={exercise.name + ' weight'}
                />
              </div>
            ))}
            <button className="text-action" onClick={() => addSet(exerciseIndex)}>
              + Add set
            </button>
          </section>
        ))}

        <button className="soft-action" onClick={() => setView('add-exercise')}>
          + Add exercise
        </button>

        <section className="card notes-card">
          <Label>Workout notes</Label>
          <textarea
            className="bare-textarea"
            value={strengthNotes}
            onChange={(event) => setStrengthNotes(event.target.value)}
            placeholder="Anything goes here — tempo, pain, equipment, substitutions…"
          />
        </section>

        <button
          className="primary-action"
          onClick={() =>
            persist({
              type: 'strength',
              name: workoutName || 'Strength workout',
              date: todayMuscat(),
              notes: strengthNotes,
              exercises: strengthExercises.map(({ name, muscleGroup, sets, notes }) => ({
                name,
                muscleGroup,
                sets,
                notes,
              })),
            })
          }
        >
          Finish & save workout
        </button>
        <Toast text={message} />
      </Screen>
    );
  }

  if (view === 'previous') {
    return (
      <Screen>
        <Header
          back="Current workout"
          title="Last Upper B"
          onBack={() => setView('strength')}
        />
        <p className="body muted">
          {previousUpperB ? displayDate(previousUpperB.date) + ' 2026' : '16 Sep 2026'} •
          {' '}reference session
        </p>
        <section className="info-card">
          <Label brand>REFERENCE ONLY</Label>
          <p>Use these numbers while entering today’s workout.</p>
        </section>
        {(previousUpperB?.exercises ?? []).map((exercise) => (
          <PreviousExercise key={exercise.name} exercise={exercise} />
        ))}
        {!previousUpperB?.exercises?.length && (
          <>
            <PreviousExercise
              exercise={{
                name: 'Pull-ups',
                unit: 'bodyweight',
                legacyValue: '4--3--2',
              }}
            />
            <PreviousExercise
              exercise={{ name: 'Barbell rows', unit: 'lb', legacyValue: '70' }}
            />
          </>
        )}
      </Screen>
    );
  }

  if (view === 'run') {
    return (
      <Screen>
        <Header back="Workouts" title="Run" onBack={goHome} />
        <h1>Keep it flexible</h1>
        <p className="body muted">
          Only enter what you know. No required pace, GPS import, or validation in this POC.
        </p>
        <FieldBlock label="Workout name">
          <input className="field full" value={runName} onChange={(e) => setRunName(e.target.value)} />
        </FieldBlock>
        <div className="two-col">
          <FieldBlock label="Distance">
            <input className="field full" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </FieldBlock>
          <FieldBlock label="Duration">
            <input className="field full" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </FieldBlock>
        </div>
        <div className="two-col">
          <FieldBlock label="Average pace">
            <input className="field full" value={pace} onChange={(e) => setPace(e.target.value)} />
          </FieldBlock>
          <FieldBlock label="RPE">
            <input className="field full" value={rpe} onChange={(e) => setRpe(e.target.value)} />
          </FieldBlock>
        </div>
        <FieldBlock label="Notes">
          <textarea className="field textarea" value={runNotes} onChange={(e) => setRunNotes(e.target.value)} />
        </FieldBlock>
        <section className="card optional-card">
          <strong>Optional details</strong>
          <button className="text-action">+ Route / treadmill</button>
          <button className="text-action">+ Heart rate</button>
          <button className="text-action">+ Shoes</button>
        </section>
        <button
          className="primary-action"
          onClick={() =>
            persist({
              type: 'run',
              name: runName || 'Run',
              date: todayMuscat(),
              distance,
              duration,
              pace,
              rpe,
              notes: runNotes,
            })
          }
        >
          Save run
        </button>
        <Toast text={message} />
      </Screen>
    );
  }

  if (view === 'mobility') {
    return (
      <Screen>
        <Header back="Workouts" title="Mobility" onBack={goHome} />
        <section className="success-card">
          <Label success>REST DAY ENTRY</Label>
          <p>Logging mobility does not turn the day into a hard training day.</p>
        </section>
        <FieldBlock label="Session name">
          <input className="field full" value={mobilityName} onChange={(e) => setMobilityName(e.target.value)} />
        </FieldBlock>
        <FieldBlock label="Duration">
          <input className="field full" value={mobilityDuration} onChange={(e) => setMobilityDuration(e.target.value)} />
        </FieldBlock>
        <FieldBlock label="What did you do?">
          <textarea className="field textarea medium" value={mobilityDetails} onChange={(e) => setMobilityDetails(e.target.value)} />
        </FieldBlock>
        <div className="tag-block">
          <Label>Optional tags</Label>
          <div className="tags">
            {['Recovery', 'Hips', 'Ankles'].map((tag) => (
              <span className="tag" key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <FieldBlock label="Notes">
          <textarea className="field textarea small" value={mobilityNotes} onChange={(e) => setMobilityNotes(e.target.value)} />
        </FieldBlock>
        <button
          className="primary-action"
          onClick={() =>
            persist({
              type: 'mobility',
              name: mobilityName || 'Mobility',
              date: todayMuscat(),
              duration: mobilityDuration,
              mobilityDetails,
              notes: mobilityNotes,
            })
          }
        >
          Save mobility session
        </button>
        <Toast text={message} />
      </Screen>
    );
  }

  if (view === 'add-exercise') {
    return (
      <Screen>
        <Header back="Upper B" title="Add exercise" onBack={() => setView('strength')} />
        <h1>Keep it permissive</h1>
        <p className="body muted">
          Exercise names are free text for now. We can normalize them later if needed.
        </p>
        <FieldBlock label="Exercise name">
          <input className="field full" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} />
        </FieldBlock>
        <FieldBlock label="Muscle group">
          <input className="field full" value={newMuscleGroup} onChange={(e) => setNewMuscleGroup(e.target.value)} />
        </FieldBlock>
        <div className="set-row add-exercise-row">
          <FieldBlock label="Set">
            <select className="field add-set" value={newSet} onChange={(e) => setNewSet(e.target.value)}>
              {setOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </FieldBlock>
          <FieldBlock label="Reps">
            <select className="field add-reps" value={newReps} onChange={(e) => setNewReps(e.target.value)}>
              {repOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </FieldBlock>
          <FieldBlock label="Weight">
            <input className="field add-weight" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
          </FieldBlock>
        </div>
        <button className="text-action">+ Add another set</button>
        <FieldBlock label="Exercise notes">
          <textarea
            className="field textarea medium"
            value={newExerciseNotes}
            onChange={(e) => setNewExerciseNotes(e.target.value)}
            placeholder="Optional — grip, machine setting, tempo, substitution…"
          />
        </FieldBlock>
        <section className="info-card">
          <Label brand>POC INPUT RULE</Label>
          <p>
            Set and reps use dropdowns. Weight accepts any text: “55 kg”, “bodyweight”,
            “band”, “+20 lb”, etc.
          </p>
        </section>
        <button className="primary-action" onClick={addExercise}>Add to Upper B</button>
        <Toast text={message} />
      </Screen>
    );
  }

  const recent = workouts.slice(0, 3);
  return (
    <Screen home>
      <h1>Log a workout</h1>
      <p className="body muted">
        Start entering data immediately. You can keep it rough and fix details later.
      </p>

      <section className="card today-card">
        <Label>Today • Rest day</Label>
        <strong>Mobility is still a valid workout entry</strong>
      </section>

      <div className="choice-list">
        <button className="choice primary-choice" onClick={() => setView('strength')}>
          <span>
            <strong>Strength</strong>
            <small>Upper B, Upper A, or anything else</small>
          </span>
          <b>→</b>
        </button>
        <button className="choice" onClick={() => setView('run')}>
          <span>
            <strong>Run</strong>
            <small>Distance, duration, pace, notes</small>
          </span>
          <b>→</b>
        </button>
        <button className="choice" onClick={() => setView('mobility')}>
          <span>
            <strong>Mobility</strong>
            <small>Stretching, rehab, warm-up, recovery</small>
          </span>
          <b>→</b>
        </button>
      </div>

      <section className="card recent-card">
        <div className="recent-heading">
          <strong>Recent workouts</strong>
          <span className={'database-dot ' + databaseState} aria-label={'Database ' + databaseState} />
        </div>
        {recent.map((workout) => (
          <div className="recent-row" key={workout.id ?? workout.date + workout.name}>
            <span>
              <strong>{cleanUpperBName(workout.name)}</strong>
              <small>
                {workout.type === 'strength'
                  ? (workout.exercises?.length ?? 0) + ' exercises'
                  : workout.type}
                {workout.duration ? ' • ' + workout.duration : ''}
              </small>
            </span>
            <small>{displayDate(workout.date)}</small>
          </div>
        ))}
      </section>
      {databaseState === 'blocked' && (
        <p className="setup-note">
          Firestore is currently blocking browser reads/writes. The full Sheet seed is bundled and
          will import automatically as soon as preview access is allowed.
        </p>
      )}
      <Toast text={message} />
    </Screen>
  );
}

function Screen({ children, home = false }: { children: React.ReactNode; home?: boolean }) {
  return <main className={'poc-screen' + (home ? ' home-screen' : '')}>{children}</main>;
}

function Header({
  back,
  title,
  onBack,
  trailing = '',
}: {
  back: string;
  title: string;
  onBack: () => void;
  trailing?: string;
}) {
  return (
    <header className="poc-header">
      <button className="back-button" onClick={onBack}>‹ {back}</button>
      <strong>{title}</strong>
      <span>{trailing || '\u200b'}</span>
    </header>
  );
}

function Label({
  children,
  brand = false,
  success = false,
}: {
  children: React.ReactNode;
  brand?: boolean;
  success?: boolean;
}) {
  return (
    <span className={'label' + (brand ? ' brand' : '') + (success ? ' success' : '')}>
      {children}
    </span>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field-block">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function PreviousSummary({
  workout,
  onOpen,
}: {
  workout?: WorkoutRecord;
  onOpen: () => void;
}) {
  const exercises = workout?.exercises ?? [];
  const pull = exercises.find((item) => item.name.toLowerCase().includes('pull-up'));
  const rows = exercises.find((item) => item.name.toLowerCase().includes('barbell rows'));
  const leg = exercises.find((item) => item.name.toLowerCase().includes('leg extension'));

  return (
    <section className="previous-summary">
      <div className="previous-title">
        <strong>Last Upper B • {workout ? displayDate(workout.date) : '16 Sep'}</strong>
        <button onClick={onOpen}>View all →</button>
      </div>
      <span>Pull-ups&nbsp;&nbsp;{previousValue(pull, '4 / 3 / 2')}</span>
      <span>Barbell rows&nbsp;&nbsp;{previousValue(rows, '70 lb')}</span>
      <span>Leg extension&nbsp;&nbsp;{previousValue(leg, '45 kg')}</span>
    </section>
  );
}

function PreviousExercise({ exercise }: { exercise: WorkoutExercise }) {
  const raw = exercise.legacyValue?.replaceAll('--', ' / ') || '';
  const pullupReps =
    exercise.name.toLowerCase().includes('pull-up') && raw
      ? raw.split('/').map((value) => value.trim()).filter(Boolean)
      : [];
  const cells =
    exercise.sets?.length
      ? exercise.sets.slice(0, 3)
      : pullupReps.length
        ? pullupReps.slice(0, 3).map((reps, index) => ({
            set: String(index + 1),
            reps,
            weight: 'bodyweight',
          }))
        : Array.from({ length: 3 }, (_, index) => ({
            set: String(index + 1),
            reps: '—',
            weight: (raw + (exercise.unit ? ' ' + exercise.unit : '')).trim() || '—',
          }));

  return (
    <section className="card previous-exercise">
      <strong>{exercise.name}</strong>
      <div className="previous-set-grid">
        {cells.map((set, index) => (
          <div className="previous-set" key={index}>
            <Label>Set {set.set}</Label>
            <span>{set.reps} reps • {set.weight}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Toast({ text }: { text: string }) {
  if (!text) return null;
  return <div className="toast">{text}</div>;
}
