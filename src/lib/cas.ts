/**
 * NutriSync — Cycle Alignment Score (CAS) engine (TypeScript port of packages/core/cas.mjs).
 * Faithful to Developer Spec §5–6, §15–16. Pure functions.
 */
export const PHASES = ['menstrual', 'follicular', 'ovulatory', 'early_luteal', 'late_luteal'] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_COLORS: Record<Phase, string> = {
  menstrual: '#E8472A',
  follicular: '#6B9E6B',
  ovulatory: '#D4A017',
  early_luteal: '#7B5EA7',
  late_luteal: '#7B5EA7',
};

/** Display label maps the 5 scoring phases to the 4 shown in the UI. */
export function displayPhase(p: Phase): 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' {
  return p === 'early_luteal' || p === 'late_luteal' ? 'luteal' : p;
}

const stripTime = (d: Date | string) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

/** cycle_day = today − last_period_start + 1, wrapped to cycle length. */
export function cycleDay(lastPeriodStart: Date | string, today: Date = new Date(), cycleLength = 28): number {
  const ms = stripTime(today) - stripTime(lastPeriodStart);
  const days = Math.floor(ms / 86_400_000);
  return (((days % cycleLength) + cycleLength) % cycleLength) + 1;
}

/**
 * R4-f31: the ACTUAL day counter — never wraps. Past day 28 (or the user's
 * length) it keeps counting (29, 30, …) until she logs a new period start;
 * the app must not auto-restart a cycle on its own. `cycleDay` above keeps
 * the modulo behaviour for FORECASTING future dates (calendar predictions).
 */
export function cycleDayActual(lastPeriodStart: Date | string, today: Date = new Date()): number {
  const ms = stripTime(today) - stripTime(lastPeriodStart);
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function phaseForDay(day: number, cycleLength = 28, periodDuration = 5): Phase {
  const ovulation = cycleLength - 14;
  const ovStart = ovulation;
  const ovEnd = ovulation + 2;
  if (day <= periodDuration) return 'menstrual';
  if (day < ovStart) return 'follicular';
  if (day <= ovEnd) return 'ovulatory';
  if (day >= cycleLength - 6) return 'late_luteal';
  return 'early_luteal';
}

/** Fraction of the cycle completed (0..1) — drives the ring fill. */
export function cycleProgress(day: number, cycleLength = 28): number {
  return Math.max(0, Math.min(1, day / cycleLength));
}

/* ---- CAS components (subset needed client-side; full tables in packages/core) ---- */
const between = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

export function component1PhaseConfidence(o: { hasPeriodStartOnFile: boolean; loggedPeriodToday?: boolean; contraception?: boolean }) {
  if (!o.hasPeriodStartOnFile) return { points: 0, blocked: true };
  let p = 10;
  if (o.loggedPeriodToday) p += 5;
  if (o.contraception) p = Math.min(p, 12);
  return { points: p, blocked: false };
}

function energyPts(phase: Phase, v: number | null) {
  if (v == null) return 0;
  switch (phase) {
    case 'menstrual': return between(v, 1, 2) ? 5 : between(v, 4, 5) ? 2 : 4;
    case 'follicular': return between(v, 3, 5) ? 5 : 2;
    case 'ovulatory': return between(v, 4, 5) ? 5 : between(v, 1, 2) ? 1 : 3;
    case 'early_luteal': return between(v, 2, 4) ? 5 : 3;
    case 'late_luteal': return between(v, 1, 3) ? 5 : 2;
  }
}
function moodPts(phase: Phase, v: number | null) {
  if (v == null) return 0;
  switch (phase) {
    case 'menstrual': return v <= 3 ? 5 : 3;
    case 'follicular': return between(v, 3, 5) ? 5 : 2;
    case 'ovulatory': return between(v, 4, 5) ? 5 : 2;
    case 'early_luteal': return between(v, 3, 4) ? 5 : 2;
    case 'late_luteal': return 5;
  }
}
export type Intensity = 'rest' | 'low' | 'moderate' | 'high';
const INTENSITY: Record<Intensity, number> = { rest: 0, low: 1, moderate: 2, high: 3 };

function performancePts(phase: Phase, intensity: Intensity | null) {
  if (intensity == null) return 0;
  const i = INTENSITY[intensity];
  switch (phase) {
    case 'menstrual': return i <= 1 ? 5 : 2;
    case 'follicular': return i >= 2 ? 5 : 2;
    case 'ovulatory': return i === 3 ? 5 : 1;
    case 'early_luteal': return i === 2 ? 5 : 3;
    case 'late_luteal': return i <= 2 ? 5 : 2;
  }
}

function sleepPts(phase: Phase, v: number | null) {
  if (v == null) return 0;
  switch (phase) {
    case 'menstrual': return between(v, 1, 2) ? 5 : 4;
    case 'follicular': return between(v, 3, 5) ? 5 : 2;
    case 'ovulatory': return between(v, 4, 5) ? 5 : 1;
    case 'early_luteal': return between(v, 2, 4) ? 5 : 4;
    case 'late_luteal': return 5;
  }
}
function appetitePts(phase: Phase, v: number | null) {
  if (v == null) return 0;
  switch (phase) {
    case 'menstrual': return between(v, 2, 3) ? 5 : between(v, 4, 5) ? 3 : 4;
    case 'follicular': return between(v, 2, 4) ? 5 : 4;
    case 'ovulatory': return between(v, 2, 4) ? 5 : 4;
    case 'early_luteal': return between(v, 3, 5) ? 5 : 2;
    case 'late_luteal': return between(v, 3, 5) ? 5 : 2;
  }
}

export function component2Biomarkers(o: {
  phase: Phase; energy?: number | null; mood?: number | null;
  sleep?: number | null; appetite?: number | null; performanceIntensity?: Intensity | null;
}) {
  const energy = energyPts(o.phase, o.energy ?? null);
  const mood = moodPts(o.phase, o.mood ?? null);
  const sleep = sleepPts(o.phase, o.sleep ?? null);
  const appetite = appetitePts(o.phase, o.appetite ?? null);
  const performance = performancePts(o.phase, o.performanceIntensity ?? null);
  return { points: energy + mood + sleep + appetite + performance, sub: { energy, mood, sleep, appetite, performance } };
}

export function component3Nutrition(checked: number, total: number) {
  return total ? Math.round((checked / total) * 30) : 0;
}

const PHASE_RECOMMENDED_INTENSITY: Record<Phase, number> = {
  menstrual: 0, follicular: 3, ovulatory: 3, early_luteal: 2, late_luteal: 1,
};
export function component4Fitness(o: { phase: Phase; loggedIntensity?: Intensity | null; optedOut?: boolean }) {
  if (o.optedOut) return 10;
  if (o.loggedIntensity == null) return 0;
  const dist = Math.abs(INTENSITY[o.loggedIntensity] - PHASE_RECOMMENDED_INTENSITY[o.phase]);
  return dist === 0 ? 20 : dist === 1 ? 16 : dist === 2 ? 10 : 4;
}

const LOGGING_TABLE: Record<number, number> = { 0: 0, 1: 2, 2: 4, 3: 7, 4: 10 };
export function component5Logging(n: number) {
  return LOGGING_TABLE[Math.max(0, Math.min(4, n))];
}

/** Full CAS from the inputs available in the daily loop. */
export function computeDailyCAS(input: {
  phase: Phase;
  hasPeriodStart: boolean;
  contraception?: boolean;
  energy?: number | null;
  mood?: number | null;
  sleep?: number | null;
  appetite?: number | null;
  performanceIntensity?: Intensity | null;
  nutritionChecked: number;
  nutritionTotal: number;
  fitnessIntensity?: Intensity | null;
  logsCompleted: number;
}) {
  const c1 = component1PhaseConfidence({ hasPeriodStartOnFile: input.hasPeriodStart, contraception: input.contraception });
  if (c1.blocked) return { blocked: true, total: 0, c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
  const c2 = component2Biomarkers({
    phase: input.phase, energy: input.energy, mood: input.mood,
    sleep: input.sleep, appetite: input.appetite, performanceIntensity: input.performanceIntensity,
  }).points;
  const c3 = component3Nutrition(input.nutritionChecked, input.nutritionTotal);
  const c4 = component4Fitness({ phase: input.phase, loggedIntensity: input.fitnessIntensity });
  const c5 = component5Logging(input.logsCompleted);
  return { blocked: false, total: c1.points + c2 + c3 + c4 + c5, c1: c1.points, c2, c3, c4, c5 };
}
