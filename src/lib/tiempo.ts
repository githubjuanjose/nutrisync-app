/**
 * Navegador temporal del Today (UST-02 v2 · L3/L5, validadas 19-ago) — PURO.
 *
 * La escalera: 7 días (día a día) → meses (hasta 12) → trimestres (hasta 8)
 * → años (hasta el alta). Solo pasado; el futuro no existe (Q4). El suelo es
 * el periodo que contiene la fecha de alta (Q3). AYER es el único pasado
 * editable (L5) — la BD lo blinda además con su trigger.
 *
 * Los cortes 12 meses / 8 trimestres son decisión de ingeniería dentro del
 * marco validado («de ahí mensual, de ahí trimestral…») — anotados en la UST.
 *
 * TODO aquí es día LOCAL (NS-0010): jamás toISOString() para días de usuaria.
 */

export type Periodo =
  | { tipo: 'dia'; fecha: string }                 // YYYY-MM-DD (local)
  | { tipo: 'mes'; anio: number; mes: number }     // mes 1-12
  | { tipo: 'tri'; anio: number; tri: number }     // tri 1-4
  | { tipo: 'anio'; anio: number };

const DIAS_DIARIOS = 7;      // hoy y 6 hacia atrás, día a día
const MESES_MAX = 12;
const TRIS_MAX = 8;

// ── aritmética local, sin Greenwich ─────────────────────────────────────────
function desglosa(iso: string): { a: number; m: number; d: number } {
  const [a, m, d] = iso.split('-').map(Number);
  return { a, m, d };
}
function compone(a: number, m: number, d: number): string {
  const f = new Date(a, m - 1, d);              // el constructor normaliza desbordes
  const mm = String(f.getMonth() + 1).padStart(2, '0');
  const dd = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${mm}-${dd}`;
}
export function sumaDias(iso: string, n: number): string {
  const { a, m, d } = desglosa(iso);
  return compone(a, m, d + n);
}
function difDias(a: string, b: string): number {   // a - b en días
  const A = desglosa(a), B = desglosa(b);
  return Math.round((Date.UTC(A.a, A.m - 1, A.d) - Date.UTC(B.a, B.m - 1, B.d)) / 86400000);
}
const triDe = (mes: number) => Math.floor((mes - 1) / 3) + 1;

// ── construcción y rangos ───────────────────────────────────────────────────
export function periodoHoy(hoyISO: string): Periodo {
  return { tipo: 'dia', fecha: hoyISO };
}

/** [desde, hasta) en días locales — lo que consumen las RPC. */
export function rango(p: Periodo): { desde: string; hasta: string } {
  switch (p.tipo) {
    case 'dia': return { desde: p.fecha, hasta: sumaDias(p.fecha, 1) };
    case 'mes': return { desde: compone(p.anio, p.mes, 1), hasta: compone(p.anio, p.mes + 1, 1) };
    case 'tri': {
      const m0 = (p.tri - 1) * 3 + 1;
      return { desde: compone(p.anio, m0, 1), hasta: compone(p.anio, m0 + 3, 1) };
    }
    case 'anio': return { desde: compone(p.anio, 1, 1), hasta: compone(p.anio + 1, 1, 1) };
  }
}

/** ¿Se puede registrar comida en este periodo? Solo hoy y ayer (L5). */
export function esEditable(p: Periodo, hoyISO: string): boolean {
  return p.tipo === 'dia' && (p.fecha === hoyISO || p.fecha === sumaDias(hoyISO, -1));
}

function antesDelAlta(p: Periodo, altaISO: string): boolean {
  return rango(p).hasta <= altaISO;   // el periodo termina antes del alta → fuera
}

// ── la escalera ─────────────────────────────────────────────────────────────
export function atras(p: Periodo, hoyISO: string, altaISO: string): Periodo | null {
  let cand: Periodo;
  switch (p.tipo) {
    case 'dia': {
      const edad = difDias(hoyISO, p.fecha);            // 0 = hoy
      if (edad < DIAS_DIARIOS - 1) cand = { tipo: 'dia', fecha: sumaDias(p.fecha, -1) };
      else {
        const salto = desglosa(sumaDias(hoyISO, -DIAS_DIARIOS));
        cand = { tipo: 'mes', anio: salto.a, mes: salto.m };
      }
      break;
    }
    case 'mes': {
      const { a: hA, m: hM } = desglosa(hoyISO);
      const edadMeses = (hA - p.anio) * 12 + (hM - p.mes);
      if (edadMeses < MESES_MAX - 1) {
        const prev = new Date(p.anio, p.mes - 2, 1);
        cand = { tipo: 'mes', anio: prev.getFullYear(), mes: prev.getMonth() + 1 };
      } else {
        const prev = new Date(p.anio, p.mes - 2, 1);
        cand = { tipo: 'tri', anio: prev.getFullYear(), tri: triDe(prev.getMonth() + 1) };
      }
      break;
    }
    case 'tri': {
      const { a: hA, m: hM } = desglosa(hoyISO);
      const edadTris = (hA - p.anio) * 4 + (triDe(hM) - p.tri);
      const prevTri = p.tri === 1 ? { anio: p.anio - 1, tri: 4 } : { anio: p.anio, tri: p.tri - 1 };
      cand = edadTris < TRIS_MAX - 1
        ? { tipo: 'tri', ...prevTri }
        : { tipo: 'anio', anio: prevTri.anio };
      break;
    }
    case 'anio':
      cand = { tipo: 'anio', anio: p.anio - 1 };
      break;
  }
  return antesDelAlta(cand, altaISO) ? null : cand;
}

export function adelante(p: Periodo, hoyISO: string): Periodo | null {
  switch (p.tipo) {
    case 'dia': {
      if (p.fecha >= hoyISO) return null;               // el futuro no existe (Q4)
      return { tipo: 'dia', fecha: sumaDias(p.fecha, 1) };
    }
    case 'mes': {
      const edad = difDias(hoyISO, rango(p).hasta);     // días entre fin de mes y hoy
      if (edad < DIAS_DIARIOS) {                        // entrando en la zona diaria
        return { tipo: 'dia', fecha: sumaDias(hoyISO, -(DIAS_DIARIOS - 1)) };
      }
      const nxt = new Date(p.anio, p.mes, 1);
      return { tipo: 'mes', anio: nxt.getFullYear(), mes: nxt.getMonth() + 1 };
    }
    case 'tri': {
      const nxt = p.tri === 4 ? { anio: p.anio + 1, tri: 1 } : { anio: p.anio, tri: p.tri + 1 };
      const { a: hA, m: hM } = desglosa(hoyISO);
      const edadTris = (hA - nxt.anio) * 4 + (triDe(hM) - nxt.tri);
      if (edadTris < TRIS_MAX) {
        // al acercarse, el zoom vuelve a meses
        const m0 = (nxt.tri - 1) * 3 + 1;
        return { tipo: 'mes', anio: nxt.anio, mes: m0 };
      }
      return { tipo: 'tri', ...nxt };
    }
    case 'anio': {
      const { a: hA } = desglosa(hoyISO);
      const nxt = p.anio + 1;
      if (nxt >= hA - 1) return { tipo: 'tri', anio: nxt, tri: 1 };
      return { tipo: 'anio', anio: nxt };
    }
  }
}

/** Piezas para la etiqueta del pill — el texto final lo pone i18n en pantalla. */
export function etiqueta(p: Periodo, hoyISO: string):
  { clase: 'hoy' | 'ayer' | 'dia' | 'mes' | 'tri' | 'anio'; fecha?: string; anio?: number; mes?: number; tri?: number } {
  if (p.tipo === 'dia') {
    if (p.fecha === hoyISO) return { clase: 'hoy' };
    if (p.fecha === sumaDias(hoyISO, -1)) return { clase: 'ayer' };
    return { clase: 'dia', fecha: p.fecha };
  }
  if (p.tipo === 'mes') return { clase: 'mes', anio: p.anio, mes: p.mes };
  if (p.tipo === 'tri') return { clase: 'tri', anio: p.anio, tri: p.tri };
  return { clase: 'anio', anio: p.anio };
}
