import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * r11a · Units + input sanity helpers.
 * Canonical storage is ALWAYS metric (height_cm, weight_kg, ISO dates) — the UI
 * converts at the edges according to the user's preference (App Preferences →
 * Units), which defaults from the device region (US customary → imperial).
 */
export type UnitSystem = 'metric' | 'imperial';
const PREFS_KEY = 'nutrisync.appPrefs.v1'; // same store App Preferences writes

export async function getUnits(): Promise<UnitSystem> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    const u = raw ? JSON.parse(raw).units : null;
    if (u === 'metric' || u === 'imperial') return u;
  } catch { /* fall through */ }
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const region = (tag.split('-')[1] ?? '').toUpperCase();
    if (region === 'US' || region === 'LR' || region === 'MM') return 'imperial';
  } catch { /* fall through */ }
  return 'metric';
}

/** Accepts "88", "88.5" and European "88,5". Returns null for garbage. */
export const parseNum = (s: string): number | null => {
  const t = String(s ?? '').trim().replace(',', '.');
  if (!t) return null;                       // '' → Number('') es 0: rechazar vacío
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export const cmToFtIn = (cm: number) => {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  return { ft, inch: Math.round(totalIn - ft * 12) };
};
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54);
export const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
export const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;

/** Validation ranges over CANONICAL (metric) values. cycleLenSoft = no-friction
 *  band from Propuesta 31 — outside it we confirm, never block. */
export const R = {
  heightCm: [90, 230] as const,
  weightKg: [30, 250] as const,
  cycleLen: [15, 90] as const,
  cycleLenSoft: [21, 45] as const,
  periodDur: [1, 14] as const,
};
export const inR = (v: number, r: readonly [number, number]) => v >= r[0] && v <= r[1];

/** ISO (storage) ↔ localized display */
export const isoToDate = (iso: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return null;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
};
export const dateToIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
