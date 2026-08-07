/**
 * M-1 · Cycle Intelligence — pure cycle statistics (Propuesta 31, decisiones
 * D9/D10/D11 = A/A/A de la ronda 10).
 *
 * Única fuente de verdad para:
 *  - ciclos CERRADOS (derivados de los inicios consecutivos — sin tabla nueva,
 *    principio lean: se calcula, no se almacena)
 *  - media personal RECORTADA (últimos 6 cerrados, outliers fuera salvo patrón)
 *  - banda normal personal, predicción del próximo inicio
 *  - clasificación del día vigente: normal → grace (>avg) → awaiting (+3, D9)
 *    → drift (+8) → care (+14)
 *
 * Todo determinista y sin IO → cubierto por jest (lib/__tests__/cycleStats.test.ts).
 */

export type ClosedCycle = { start: string; end: string; length: number; outlier: boolean };

const DAY = 86_400_000;
const toMs = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00').getTime();
export const addDaysISO = (iso: string, d: number) => {
  const t = new Date(toMs(iso) + d * DAY);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Longitudes cerradas a partir de los INICIOS de ciclo (ISO asc o desordenados).
 *  Diferencias fuera de 15–90 días (rango BD) se descartan como no-ciclos
 *  (huecos de registro), no como outliers. */
export function closedCycles(startsISO: string[]): ClosedCycle[] {
  const starts = [...new Set(startsISO.map((s) => s.slice(0, 10)))].sort();
  const out: ClosedCycle[] = [];
  for (let i = 1; i < starts.length; i++) {
    const len = Math.round((toMs(starts[i]) - toMs(starts[i - 1])) / DAY);
    if (len >= 15 && len <= 90) {
      out.push({ start: starts[i - 1], end: addDaysISO(starts[i], -1), length: len, outlier: false });
    }
  }
  return markOutliers(out);
}

/** R10: outlier = a >8 días de la mediana de los últimos 6 — SALVO que se
 *  repita (2 consecutivos hacia el mismo lado = patrón nuevo, no outlier). */
export function markOutliers(cycles: ClosedCycle[]): ClosedCycle[] {
  if (cycles.length < 3) return cycles.map((c) => ({ ...c, outlier: false }));
  const win = cycles.slice(-6);
  const med = median(win.map((c) => c.length));
  const flag = cycles.map((c) => ({ ...c, outlier: Math.abs(c.length - med) > 8 }));
  for (let i = 1; i < flag.length; i++) {
    const a = flag[i - 1], b = flag[i];
    if (a.outlier && b.outlier && Math.sign(a.length - med) === Math.sign(b.length - med)) {
      a.outlier = false; b.outlier = false;   // repetido → patrón, entra en la media
    }
  }
  return flag;
}

/** Media personal: media recortada de los últimos 6 cerrados sin outliers.
 *  null hasta que exista al menos 1 cerrado. */
export function personalAvg(cycles: ClosedCycle[]): number | null {
  const win = cycles.slice(-6);
  if (!win.length) return null;
  const kept = win.filter((c) => !c.outlier).map((c) => c.length);
  const use = kept.length ? kept : win.map((c) => c.length);
  return Math.round(use.reduce((a, b) => a + b, 0) / use.length);
}

/** D10 · rebaseline AUTOMÁTICO: la media personal sustituye al valor de
 *  onboarding a partir del 3er ciclo cerrado (antes: null → sigue onboarding). */
export function baselineLen(cycles: ClosedCycle[], onboardingLen: number): { len: number; personal: boolean } {
  if (cycles.length >= 3) {
    const avg = personalAvg(cycles);
    if (avg != null) return { len: avg, personal: true };
  }
  return { len: onboardingLen, personal: false };
}

/** Banda normal personal: media ± max(2, sd de los no-outliers), acotada 15–90. */
export function normalRange(cycles: ClosedCycle[]): { lo: number; hi: number } | null {
  const kept = cycles.slice(-6).filter((c) => !c.outlier).map((c) => c.length);
  if (kept.length < 2) return null;
  const m = kept.reduce((a, b) => a + b, 0) / kept.length;
  const sd = Math.sqrt(kept.reduce((a, b) => a + (b - m) * (b - m), 0) / kept.length);
  const spread = Math.max(2, Math.round(sd));
  return { lo: Math.max(15, Math.round(m) - spread), hi: Math.min(90, Math.round(m) + spread) };
}

/** Predicción del próximo inicio: último inicio + media personal, ± spread. */
export function predictNext(lastStartISO: string, cycles: ClosedCycle[], fallbackLen: number):
  { dateISO: string; plusMinus: number } {
  const avg = personalAvg(cycles) ?? fallbackLen;
  const band = normalRange(cycles);
  const plusMinus = band ? Math.max(1, Math.round((band.hi - band.lo) / 2)) : 2;
  return { dateISO: addDaysISO(lastStartISO, avg), plusMinus };
}

/** r11c-2 · End period: duración real = día actual - 1 (hoy ya es folicular),
 *  acotada al rango BD 1–14. Pura para test. */
export function clampPeriodDur(todayCycleDay: number): number {
  return Math.max(1, Math.min(14, todayCycleDay - 1));
}

/** r11c-2 · Decisión completa al registrar un inicio de período — extraída de
 *  api.startNewCycle para que las reglas D10/corrección/outlier tengan tests.
 *  'duplicate' = mismo inicio (no-op) · 'correction' = fecha ANTERIOR al inicio
 *  vigente (se corrige la fila actual, jamás se inserta desordenada). */
export type NewCyclePlan =
  | { kind: 'duplicate' }
  | { kind: 'correction' }
  | { kind: 'new'; avg: number; closed?: number; rebaselined: boolean; outlier: boolean };

export function planNewCycle(existingStartsISO: string[], startISO: string, onboardingLen: number): NewCyclePlan {
  const starts = [...new Set(existingStartsISO.map((s) => s.slice(0, 10)))].sort();
  const prev = starts.length ? starts[starts.length - 1] : null;
  const s10 = startISO.slice(0, 10);
  if (prev && s10 === prev) return { kind: 'duplicate' };
  if (prev && s10 < prev) return { kind: 'correction' };
  const cc = closedCycles([...starts, s10]);
  const base = baselineLen(cc, onboardingLen);
  const closed = prev ? Math.round((toMs(s10) - toMs(prev)) / DAY) : undefined;
  const last = cc.length ? cc[cc.length - 1] : null;
  return {
    kind: 'new',
    avg: base.len,
    closed: closed && closed > 0 ? closed : undefined,
    rebaselined: base.personal && cc.length === 3,
    outlier: !!(last && last.length === closed && last.outlier),
  };
}

export type DayState = 'normal' | 'grace' | 'awaiting' | 'drift' | 'care';

/** Tramos del día vigente vs la media (D9: primer aviso ya en >avg — M-0;
 *  anillo "awaiting" desde +3; drift +8; care +14 con enlace al disclaimer). */
export function dayState(day: number, avgLen: number): DayState {
  if (day > avgLen + 14) return 'care';
  if (day > avgLen + 8) return 'drift';
  if (day > avgLen + 3) return 'awaiting';
  if (day > avgLen) return 'grace';
  return 'normal';
}

// ── NS-0009 (r15) · ¿cae este día dentro del período PREVISTO? ──────────────
// Pura: el calendario la usa para pintar la predicción en la rejilla (mes y
// mini-meses). Ventana: [inicio previsto, inicio + duración), duración acotada
// al rango del producto (1–14, misma banda que el input-guard de BD).
export function inPredictedPeriod(dISO: string, predStartISO: string | null, periodDur: number): boolean {
  if (!predStartISO) return false;
  const dur = Math.max(1, Math.min(14, periodDur || 5));
  return dISO >= predStartISO && dISO < addDaysISO(predStartISO, dur);
}
