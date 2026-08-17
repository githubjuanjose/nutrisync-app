/**
 * Alineación por fase — lógica PURA del lado app. (r19, 17-ago)
 *
 * El servidor (meal_alignment) casa cada alimento detectado con la hoja de
 * Constanza/Pilar y devuelve tier por item + global. Aquí solo vive lo que se
 * puede probar sin red ni pantalla: validar la forma de esa respuesta,
 * mapear tiers a chips, y LA REGLA DEL TONO:
 *
 *   La frase de fase («va bien con tu fase lútea») SOLO se enseña en positivo
 *   (Excellent/Great). En Good/Fair: silencio — el tier se ve en su chip,
 *   pero la app no editorializa después de comer. Es nuestra propuesta a
 *   Pilar hecha código; si ella decide otra cosa, se cambia AQUÍ y solo aquí.
 *
 * Activado en test interno (decisión Juanjo 17-ago) con la firma de Constanza
 * pendiente; el interruptor real vive en la base (alignment_config.activo).
 */

export type Tier = 'Excellent' | 'Great' | 'Good' | 'Fair';

export type AlineacionItem = {
  detected_name: string;
  matched: boolean;
  tier: Tier | null;
};

export type Alineacion = {
  activo: boolean;
  segment: string | null;
  overall: Tier | null;
  items: AlineacionItem[];
};

const TIERS: Tier[] = ['Excellent', 'Great', 'Good', 'Fair'];

/** Valida y normaliza la respuesta del RPC. Forma rara → apagado, no basura. */
export function parseAlineacion(raw: unknown): Alineacion {
  const apagado: Alineacion = { activo: false, segment: null, overall: null, items: [] };
  if (!raw || typeof raw !== 'object') return apagado;
  const r = raw as any;
  if (r.activo !== true) return apagado;

  const items: AlineacionItem[] = Array.isArray(r.items)
    ? r.items
        .filter((i: any) => typeof i?.detected_name === 'string')
        .map((i: any) => ({
          detected_name: i.detected_name,
          matched: i.matched === true && TIERS.includes(i.tier),
          tier: i.matched === true && TIERS.includes(i.tier) ? (i.tier as Tier) : null,
        }))
    : [];

  const ov = r.overall?.tier;
  return {
    activo: true,
    segment: typeof r.segment === 'string' ? r.segment : null,
    overall: TIERS.includes(ov) ? (ov as Tier) : null,
    items,
  };
}

/** El tier de un alimento concreto, buscado por nombre (o null = sin chip). */
export function tierDeItem(a: Alineacion, detectedName: string): Tier | null {
  if (!a.activo) return null;
  const hit = a.items.find(
    (i) => i.detected_name.toLowerCase() === String(detectedName ?? '').toLowerCase());
  return hit?.tier ?? null;
}

/** Clave i18n del chip. El texto vive en los 14 catálogos, no aquí. */
export function claveDeTier(t: Tier): string {
  return 'mob.foto.tier.' + t.toLowerCase();
}

/**
 * ¿Se enseña la frase de fase? SOLO en positivo — jamás un juicio tras comer.
 * (Propuesta nuestra pendiente del sí de Pilar; cambiarla = cambiar esto.)
 */
export function fraseDeFasePermitida(overall: Tier | null): boolean {
  return overall === 'Excellent' || overall === 'Great';
}

/** El segmento de la hoja («Luteal - Mid») en clave i18n corta («luteal»). */
export function faseDeSegmento(segment: string | null): string | null {
  if (!segment) return null;
  const f = segment.split(' - ')[0].toLowerCase();
  return ['menstrual', 'follicular', 'ovulatory', 'luteal'].includes(f) ? f : null;
}
