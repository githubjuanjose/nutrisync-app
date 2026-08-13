/**
 * Pulso — una pregunta corta dentro de la app. Lógica PURA, con unitarios.
 *
 * POR QUÉ EXISTE (11-ago)
 * 49 invitadas, 32 con la app, 3 respuestas al cuestionario de la web. El
 * diagnóstico no fue el correo: fue que las tenemos dentro de la app y les
 * escribimos fuera. Y la decisión de Juanjo no es «medir la web» —ya hay 3 de 3
 * a favor— sino conseguir que responder se vuelva costumbre.
 *
 * QUÉ VIVE AQUÍ Y QUÉ NO
 * Aquí solo está lo que se puede probar sin pintar nada: elegir el idioma del
 * texto, validar la opción y decidir si se enseña. La pregunta, las opciones y
 * el mensaje de vuelta llegan de la base (regla de oro: una pregunta es un
 * dato). Así cambiar el copy no necesita una OTA.
 */

/** Lo que devuelve `pulso_pendiente` en la base. */
export type PulsoRaw = {
  code: string;
  pregunta_es: string; pregunta_en: string;
  opciones_es: string[]; opciones_en: string[];
  gracias_es?: string | null; gracias_en?: string | null;
} | null;

/** Lo que la pantalla necesita para pintarlo, ya en un solo idioma. */
export type Pulso = {
  code: string;
  pregunta: string;
  opciones: string[];
  gracias: string | null;
};

/**
 * Traduce el pulso al idioma de la usuaria.
 *
 * Devuelve null si no hay pulso o si viene incompleto. Un dato a medias NO se
 * pinta a medias: se calla. (Misma familia que el negro de la gráfica — un
 * valor inesperado no debe producir una pantalla rara, debe producir nada.)
 */
export function pulsoEnIdioma(raw: PulsoRaw, idioma: string): Pulso | null {
  if (!raw || typeof raw !== 'object') return null;
  const es = String(idioma || '').toLowerCase().startsWith('es');

  const pregunta = (es ? raw.pregunta_es : raw.pregunta_en) || raw.pregunta_en || raw.pregunta_es;
  const opciones = (es ? raw.opciones_es : raw.opciones_en) || raw.opciones_en || raw.opciones_es;
  const gracias  = (es ? raw.gracias_es  : raw.gracias_en) ?? null;

  if (!raw.code || !pregunta) return null;
  if (!Array.isArray(opciones) || opciones.length < 2) return null;   // sin opciones no hay pulso
  if (opciones.some((o) => typeof o !== 'string' || !o.trim())) return null;

  return { code: raw.code, pregunta, opciones, gracias: gracias || null };
}

/**
 * ¿Es válida esta opción? Las opciones van de 1 a N, como en la base — no de 0,
 * para que el número que se guarda sea el que se lee sin restar mentalmente.
 */
export function opcionValida(pulso: Pulso | null, n: unknown): boolean {
  if (!pulso) return false;
  if (typeof n !== 'number' || !Number.isInteger(n)) return false;
  return n >= 1 && n <= pulso.opciones.length;
}

/**
 * ¿Se enseña ahora? Solo tras un momento de éxito — nunca interrumpiendo.
 *
 * El pulso aparece DESPUÉS de que algo le haya salido bien (guardar la comida),
 * no al abrir la pantalla. Preguntar «¿qué tal?» a quien está a mitad de una
 * tarea es la forma más rápida de que cierre sin leer, y de gastar la única
 * oportunidad que hay con cada persona.
 */
export function toca(hayPulso: boolean, momento: 'entrando' | 'exito' | 'error'): boolean {
  return hayPulso && momento === 'exito';
}
