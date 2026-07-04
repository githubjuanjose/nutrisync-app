/**
 * Feature flags — one place to turn capabilities on/off per build.
 *
 * Each flag defaults OFF (safe) and can be switched on with an env var at build
 * time. To enable a flag, add it to the app's .env, e.g.:
 *
 *   EXPO_PUBLIC_FLAG_CONNECTORS=true
 *
 * OTA-safe: because flags read EXPO_PUBLIC_* env, flipping one and pushing ships
 * over-the-air — no store resubmission. Native flags (like connectors) should
 * only be turned on for a native dev/TestFlight build, since the underlying
 * HealthKit / Health Connect modules don't exist in Expo Go.
 */
const bool = (v: string | undefined, def: boolean) =>
  v == null || v === '' ? def : /^(1|true|yes|on)$/i.test(v);

export const flags = {
  // Epic E — wearable/health connectors. OFF until the native iOS/TestFlight build.
  connectors: bool(process.env.EXPO_PUBLIC_FLAG_CONNECTORS, false),
} as const;

export type FlagKey = keyof typeof flags;

export const isEnabled = (k: FlagKey): boolean => flags[k];
