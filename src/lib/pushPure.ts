// NutriSync · pushPure (N1, 0.21) — la lógica SIN IO del canal push.
// Regla r11c-2: funciones puras con unitarios; el envoltorio (push.ts) consume.

export type PermisoPush = 'granted' | 'denied' | 'ask';

/** Estado del permiso del sistema → nuestros tres caminos. Cualquier cosa
 *  rara (undetermined, null, cadena nueva de iOS) cae en 'ask': volver a
 *  preguntar es seguro; asumir concedido no lo es. */
export function mapPermission(status: string | null | undefined): PermisoPush {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'ask';
}

/** Payload del upsert a notification_prefs. Solo las columnas que este flujo
 *  posee: token, plataforma y zona. Los interruptores (diario/fases/rachas/
 *  reenganche) y las horas NO viajan aquí — los posee la pantalla (N2) y un
 *  upsert parcial jamás debe pisarlos. */
const IDIOMAS = ['en','es','ca','val','gl','eu','oc','fr','it','ja','de','nl','el','zh'];

export function buildPrefsUpsert(userId: string, token: string, plataforma: string, zona: string, idioma = 'en') {
  return {
    user_id: userId,
    push_token: token,
    plataforma: plataforma === 'ios' || plataforma === 'android' ? plataforma : 'other',
    zona: zona && zona.includes('/') ? zona : 'Europe/Madrid',   // IANA o respaldo (regla r12-b4)
    idioma: IDIOMAS.includes(idioma) ? idioma : 'en',            // el despachador lee es→texto_es
  };
}

/** Toque en la notificación → pestaña destino (N4). Racha al progreso, todo lo
 *  de ciclo al calendario, y el resto (diario, reenganche, desconocidos) a
 *  Cycle — la casa. Desconocido jamás rompe: siempre hay destino. */
export function mapGrupoTab(grupo: string | null | undefined): 'Progress' | 'Calendar' | 'Cycle' {
  const g = grupo ?? '';
  if (g === 'streak_hit') return 'Progress';
  if (g.startsWith('phase_') || g === 'new_cycle' || g === 'end_period') return 'Calendar';
  return 'Cycle';
}
