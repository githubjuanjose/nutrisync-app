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

/**
 * Toque en la notificación → DESTINO EXACTO (criterio de Pilar, 10-ago).
 *
 * `mapGrupoTab` dejaba a la usuaria en la pestaña y ahí se acababa el viaje:
 * tenía que buscar el aviso que acababa de tocar. Pilar decidió a dónde va
 * cada cosa: **el recordatorio de comida abre el registro de comida, y el
 * aviso de cambio de fase lleva al calendario.**
 *
 * Devuelve `pantalla` solo cuando hay un destino más profundo que la pestaña.
 * Lo desconocido nunca rompe: cae en la pestaña de siempre, sin pantalla.
 */
export type DestinoPush = { tab: 'Progress' | 'Calendar' | 'Cycle'; pantalla?: 'MealLog' };

export function destinoPush(grupo: string | null | undefined): DestinoPush {
  const g = typeof grupo === 'string' ? grupo.trim().toLowerCase() : '';
  // Recordatorio de comida → directo al formulario de registro, no a la lista.
  if (g === 'daily_meal' || g === 'meal_reminder' || g.startsWith('meal_')) {
    return { tab: 'Cycle', pantalla: 'MealLog' };
  }
  return { tab: mapGrupoTab(g) };
}
