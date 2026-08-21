/**
 * Glosario ES de alimentos (UST-04 F7, 21-ago · NS-0068 «Bulgur??? Seitan???»).
 *
 * Los nombres canónicos van en inglés por diseño (meal-photo-v2); lo que la
 * tester ES necesita es el español AL LADO, patrón que History ya enseñaba:
 * «Avocado (Aguacate)». La verdad vive en public.food_glosario (sembrada de
 * la Meal Library de Pilar + los paréntesis de la hoja de Constanza) y aquí
 * solo se DECORA: cero juicio, cero traducción automática.
 *
 * decora() es pura (unitarios); el caché es de sesión y la carga jamás rompe
 * una pantalla (sin glosario, los nombres salen como siempre).
 */
import { supabase } from './supabase';

export type Glosario = Record<string, string>;

let MAPA: Glosario | null = null;
let cargando: Promise<Glosario> | null = null;

/** Pura: añade « (Español)» si el glosario conoce la base del nombre y el
 *  nombre no trae ya un paréntesis. Tolera singular/plural (Carrot/Carrots). */
export function decora(mapa: Glosario, nombre: string | null | undefined): string {
  const n = (nombre ?? '').trim();
  if (!n || n.includes('(')) return n;
  const clave = n.toLowerCase();
  const es = mapa[clave] ?? mapa[clave.replace(/s$/, '')] ?? mapa[clave + 's'];
  if (!es || es.toLowerCase() === clave) return n;
  return `${n} (${es})`;
}

/** Carga perezosa con caché de sesión. Nunca lanza. */
export async function cargaGlosario(): Promise<Glosario> {
  if (MAPA) return MAPA;
  if (cargando) return cargando;
  cargando = (async () => {
    try {
      const { data } = await supabase.from('food_glosario').select('en,es');
      const m: Glosario = {};
      (data ?? []).forEach((r: any) => {
        const en = String(r.en ?? '').trim().toLowerCase();
        if (en) m[en] = String(r.es ?? '').trim();
      });
      MAPA = m;
    } catch { MAPA = {}; }
    return MAPA!;
  })();
  return cargando;
}

/** Para render síncrono tras cargaGlosario(): si aún no cargó, devuelve tal cual. */
export function decoraNombre(nombre: string | null | undefined): string {
  return MAPA ? decora(MAPA, nombre) : (nombre ?? '');
}
