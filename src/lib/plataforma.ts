/**
 * UST-2026-09-08-15 · Android en paridad con iOS — las REGLAS puras.
 *
 * Todo lo que decide «qué hace Android distinto de iOS» vive aquí, sin IO y
 * con unitarios: los insets de la barra del sistema (edge-to-edge), qué
 * proveedores de salud se enseñan en cada plataforma, cómo se llama la
 * biometría del teléfono y el estado de una captura adjunta. Las pantallas
 * consumen; los tests cubren (r11c-2).
 *
 * Analogía: en Android la app dibuja edge-to-edge como una web sin
 * `env(safe-area-inset-bottom)`; `insetInferior` ES ese env() y hoy nadie
 * lo usaba (MainTabs bottom:10 fijo — lo que Juanjo vio el 8-sep).
 */
import { PROVEEDORES_CON_ADAPTADOR, proveedorDePlataforma } from './health/proveedor';

export type SO = 'ios' | 'android' | 'web' | string;

/** D1 (firmada): la píldora y los pádings suben exactamente el inset del
 *  sistema SOLO en Android. En iPhone el indicador de inicio es una línea fina
 *  y el diseño de Lucía ya lo contempla: cero cambio. Web: cero. */
export function insetInferior(so: SO, inset: number | null | undefined): number {
  if (so !== 'android') return 0;
  const n = Number(inset);
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

/** Bordes que protege el SafeAreaView de una pantalla apilada: en iOS el
 *  paddingBottom:40 de siempre ya cubre el indicador (34 px); en Android la
 *  barra de 3 botones (48 dp) exige el borde inferior. */
export function bordesPantalla(so: SO): ('top' | 'bottom')[] {
  return so === 'android' ? ['top', 'bottom'] : ['top'];
}

/* ── Proveedores de salud por plataforma (C2, D2) ────────────────────────── */
export type ProveedorMin = { key: string; platform: 'ios' | 'android' | 'both'; native: boolean };
export type EstadoProveedor = 'conectable' | 'proximamente' | 'oculto';

/** Qué se enseña de cada proveedor en esta plataforma:
 *  · de OTRA plataforma → oculto (Android no ve «Apple Health · iOS only»)
 *  · nativo SIN adaptador escrito (Samsung Health) → «Próximamente» sin botón:
 *    un botón que no hace nada es peor que no tener botón (P0 de UST-15).
 *  · el resto → conectable.
 *  UST-16 C3: la lista de los que SÍ tienen adaptador vive en health/proveedor.ts
 *  (una sola definición) — al escribir O3, Health Connect entra en ella y esta
 *  función no cambia: deja de ser «próximamente» sola. */
export function estadoProveedor(so: SO, p: ProveedorMin): EstadoProveedor {
  if (p.platform === 'ios' && so !== 'ios') return 'oculto';
  if (p.platform === 'android' && so !== 'android') return 'oculto';
  if (p.native && !PROVEEDORES_CON_ADAPTADOR.has(p.key)) return 'proximamente';
  return 'conectable';
}

export function proveedoresVisibles<T extends ProveedorMin>(so: SO, lista: T[]): T[] {
  return lista.filter((p) => estadoProveedor(so, p) !== 'oculto');
}

/** ¿Puede esta plataforma abrir el consentimiento señal a señal de un
 *  proveedor? El de SU sistema y ninguno más: Apple Salud en iPhone, Health
 *  Connect en Android (UST-16 C3). Con cualquier otro, la pantalla vuelve
 *  atrás sin escribir nada — antes escribía una conexión que nadie leía. */
export function consentimientoDisponible(so: SO, provider: string | null | undefined): boolean {
  return !!provider && proveedorDePlataforma(so) === provider;
}

/* ── Biometría con nombre propio (C4, D5 alternativa) ────────────────────── */
/** Tipos de expo-local-authentication: 1 huella · 2 cara · 3 iris.
 *  Devuelve un IDENTIFICADOR (la pantalla lo traduce: mob.seg.bio.<id>) —
 *  iPhone mantiene las marcas de Apple (D5); Android habla de huella o cara. */
export type TipoBio = 'faceid' | 'touchid' | 'faceOrTouch' | 'huella' | 'cara' | 'huellaOCara' | 'iris';
export function tipoBiometria(tipos: number[] | null | undefined, so: SO): TipoBio {
  const t = new Set((tipos ?? []).filter((n) => Number.isInteger(n)));
  const cara = t.has(2), huella = t.has(1), iris = t.has(3);
  if (so === 'ios') {
    if (cara) return 'faceid';
    if (huella) return 'touchid';
    return 'faceOrTouch';
  }
  if (cara && huella) return 'huellaOCara';
  if (cara) return 'cara';
  if (huella) return 'huella';
  if (iris) return 'iris';
  return 'huellaOCara';
}
/** Texto de respaldo en inglés por identificador (las traducciones viven en los 14 catálogos). */
export const BIO_EN: Record<TipoBio, string> = {
  faceid: 'Face ID', touchid: 'Touch ID', faceOrTouch: 'Face ID / Touch ID',
  huella: 'fingerprint', cara: 'face', huellaOCara: 'fingerprint or face', iris: 'iris',
};

/** Clave i18n del título de la oferta/bloqueo biométrico: iPhone mantiene
 *  «Face ID» (D5); Android habla de huella o cara. */
export function claveTituloBio(so: SO): 'mob.auth.bioTitle' | 'mob.auth.bioTitleAndroid' {
  return so === 'ios' ? 'mob.auth.bioTitle' : 'mob.auth.bioTitleAndroid';
}

/* ── Captura adjunta en Feedback (C6) ─────────────────────────────────────── */
export type EstadoCaptura = 'sin' | 'adjunta' | 'fallo';
/** Qué dice la UI: nunca «adjuntada ✓» si la subida falló (antes mentía en Android). */
export function estadoCaptura(shot: string | null | undefined, subidaFallida: boolean): EstadoCaptura {
  if (!shot) return 'sin';
  return subidaFallida ? 'fallo' : 'adjunta';
}
