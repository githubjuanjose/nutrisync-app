/**
 * Epic P · Incremento P1 — la lógica PURA de la foto de comida.
 *
 * QUÉ HACE ESTE FICHERO Y POR QUÉ ESTÁ SEPARADO
 * La pantalla de captura hace IO (cámara, disco, red) y eso no se puede
 * probar en jest. Aquí vive todo lo que SÍ se puede: la ruta en el bucket,
 * el tipo de comida que se propone, cuánto hay que encoger la imagen, si el
 * borrador de la IA sirve para algo y qué se le dice a la usuaria cuando no.
 * Regla r11c-2: la lógica nace con sus unitarios en el mismo cambio.
 *
 * DOS INVARIANTES QUE NO SE NEGOCIAN
 *  1. Cero PII hacia el proveedor de visión (doc 39 §4 · Propuesta 32 §2):
 *     la imagen sale reescalada y RECOMPRIMIDA, lo que tira el bloque EXIF
 *     entero — con él se van el GPS, el modelo del móvil y la hora exacta.
 *  2. El día y la hora son los DE ELLA, nunca los de Greenwich (NS-0010).
 *     Por eso `tipoPorHora` recibe una hora local ya calculada; este fichero
 *     no llama a Date por su cuenta.
 */

/** El lado largo que se manda a la IA. Más píxeles no mejoran el acierto y sí
 *  el coste: la imagen se cobra por tamaño en todos los proveedores. */
export const LADO_MAX = 1024;

/** Recomprimir es lo que borra el EXIF. 0.7 mantiene legible un plato. */
export const CALIDAD_JPEG = 0.7;

/** Puerta de cordura antes de subir: por encima de esto algo va mal. */
export const BYTES_MAX = 8 * 1024 * 1024;

/** Confianza por debajo de la cual el borrador se marca como dudoso y la
 *  pantalla pide revisión explícita en vez de dar el resultado por bueno. */
export const CONFIANZA_MINIMA = 0.45;

export type TipoComida = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink' | 'other';

/**
 * Ruta dentro del bucket `meal-images`.
 * La política RLS exige que el PRIMER tramo sea el uid de la usuaria
 * (`storage.foldername(name))[1] = auth.uid()`), así que la carpeta no es
 * decoración: si se pierde, el upload lo rechaza el servidor.
 */
export function rutaFoto(userId: string, ts: number, ext = 'jpg'): string {
  const limpio = String(ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${userId}/${ts}.${limpio}`;
}

/**
 * Qué comida se propone según la hora LOCAL de la usuaria (0-23).
 * Es una PROPUESTA: la pantalla la deja cambiar siempre. Regla r12-b4, «el
 * valor por defecto es una elección» — pero una elección que se puede corregir.
 * Una hora imposible cae en 'snack', que es lo más inocuo.
 */
export function tipoPorHora(hora: number): TipoComida {
  if (!Number.isFinite(hora)) return 'snack';
  const h = Math.floor(hora);
  if (h < 0 || h > 23) return 'snack';
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 19 && h < 24) return 'dinner';
  return 'snack';               // media tarde y madrugada
}

/**
 * Qué reescalado pide expo-image-manipulator para que el lado largo quede en
 * LADO_MAX. Se da UNA sola dimensión a propósito: la librería calcula la otra
 * y así la proporción no se toca nunca.
 * Devuelve null si la imagen ya cabe — jamás se amplía una foto pequeña:
 * pesaría más sin aportar un solo píxel de información.
 */
export function redimension(
  ancho: number, alto: number,
): { width: number } | { height: number } | null {
  if (!Number.isFinite(ancho) || !Number.isFinite(alto) || ancho <= 0 || alto <= 0) return null;
  if (ancho <= LADO_MAX && alto <= LADO_MAX) return null;
  return ancho >= alto ? { width: LADO_MAX } : { height: LADO_MAX };
}

export type ItemIA = {
  display_name?: string;
  portion_description?: string;
  estimated_grams?: number;
  confidence?: number;
};

export type AnalisisIA = {
  is_food?: boolean;
  meal_name?: string;
  meal_type_guess?: string;
  overall_confidence?: number;
  items?: ItemIA[];
};

/**
 * ¿El borrador sirve para enseñárselo a la usuaria?
 * El listón es deliberadamente bajo —comida + al menos un item con nombre—
 * porque un borrador flojo que ella corrige VALE (alimenta el dataset), y un
 * borrador vacío no vale nada. La confianza baja no descarta: avisa.
 */
export function borradorUtil(a: AnalisisIA | null | undefined): boolean {
  if (!a || a.is_food !== true) return false;
  const items = Array.isArray(a.items) ? a.items : [];
  return items.some((i) => typeof i?.display_name === 'string' && i.display_name.trim().length > 0);
}

export type NivelConfianza = 'alta' | 'media' | 'baja' | 'sin';

/** Traduce un 0-1 al lenguaje de un chip de color. */
export function nivelConfianza(c: number | null | undefined): NivelConfianza {
  if (typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 1) return 'sin';
  if (c >= 0.75) return 'alta';
  if (c >= CONFIANZA_MINIMA) return 'media';
  return 'baja';
}

/** Suma de gramos del borrador, ignorando lo que no sea un número de verdad. */
export function gramosTotales(items: ItemIA[] | null | undefined): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, i) => {
    const g = i?.estimated_grams;
    return s + (typeof g === 'number' && Number.isFinite(g) && g > 0 ? g : 0);
  }, 0);
}

export type Motivo = { clave: string; texto: string };

/**
 * Qué se le dice a la usuaria cuando el análisis no sale.
 * Regla r12-b9 llevada a la app: NUNCA una pantalla muda. Cada fallo tiene
 * nombre y una salida («repite la foto», «inténtalo luego»), y el motivo
 * técnico queda en meal_captures.failure_reason para nosotros.
 */
export function motivoFallo(razon: string | null | undefined): Motivo {
  const r = String(razon ?? '').toLowerCase();
  if (r.includes('not_food') || r.includes('is_food'))
    return { clave: 'mob.foto.errNoComida', texto: 'No veo comida en esta foto. ¿Repetimos?' };
  if (r.includes('budget') || r.includes('presupuesto') || r.includes('quota'))
    return { clave: 'mob.foto.errCupo', texto: 'Has llegado al límite de análisis de hoy.' };
  if (r.includes('timeout') || r.includes('network') || r.includes('fetch'))
    return { clave: 'mob.foto.errRed', texto: 'No he podido conectar. Inténtalo en un momento.' };
  if (r.includes('too_large') || r.includes('size'))
    return { clave: 'mob.foto.errPeso', texto: 'La foto es demasiado grande. Prueba con otra.' };
  return { clave: 'mob.foto.errGenerico', texto: 'No he podido analizar la foto. Puedes reintentarlo.' };
}

/** Puerta de cordura antes de gastar red: tamaño con sentido. */
export function pesoAceptable(bytes: number | null | undefined): boolean {
  return typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 && bytes <= BYTES_MAX;
}

/** El tipo que propone la IA solo se acepta si es uno de los del CHECK de la
 *  tabla; cualquier otra cosa se queda con lo que ya había elegido ella. */
export function tipoValido(v: unknown, respaldo: TipoComida): TipoComida {
  const permitidos: TipoComida[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'other'];
  return permitidos.includes(v as TipoComida) ? (v as TipoComida) : respaldo;
}
