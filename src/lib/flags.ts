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
  // Epic E — wearable/health connectors. r24-j (3-sep): DEFAULT true. Los
  // módulos nativos ya viajan desde el build 0.23.0, así que no hay marcha
  // atrás que proteger — y el `export` de bash no siempre llegaba a Metro, que
  // inlinea EXPO_PUBLIC_* en compilación (por eso la OTA de STEPS salió con
  // connectors=false y desapareció «Connected Devices»). Interruptor de
  // emergencia intacto: EXPO_PUBLIC_FLAG_CONNECTORS=false + OTA lo apaga.
  connectors: bool(process.env.EXPO_PUBLIC_FLAG_CONNECTORS, true),

  // Epic P — meal photo → AI draft. EXCEPCIÓN DELIBERADA al «por defecto OFF»:
  // la 0.22 se construye PARA que el piloto lo pruebe, y una capacidad que
  // nace apagada no la prueba nadie. Lo que sí compra este flag es un
  // INTERRUPTOR DE EMERGENCIA: EXPO_PUBLIC_FLAG_MEALPHOTO=false + una OTA lo
  // apaga en todos los móviles el mismo día, sin pasar por las tiendas.
  mealPhoto: bool(process.env.EXPO_PUBLIC_FLAG_MEALPHOTO, true),
} as const;

export type FlagKey = keyof typeof flags;

export const isEnabled = (k: FlagKey): boolean => flags[k];
