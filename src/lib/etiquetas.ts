/**
 * Etiquetas de los registros rápidos (ánimo · energía · flujo) — NS-0041/0043.
 *
 * POR QUÉ EXISTE ESTE FICHERO
 * La pestaña «Body Insight» pintaba así:
 *     MOODS[quick.mood - 1].toLowerCase()
 * Si el valor guardado se sale del rango que espera el array, eso es
 * `undefined.toLowerCase()` → TypeError en pleno render. En un build de
 * producción React Native escala un error de JS a fallo NATIVO, y la app se
 * cierra de golpe: es exactamente la firma de los crashes NS-0041 y NS-0043
 * (`objc_exception_rethrow` dentro de `performVoidMethodInvocation`, que es
 * ExceptionsManager informando de la excepción fatal).
 *
 * Regla que aplicamos aquí (r12-b4, «el valor por defecto es una elección»):
 * un dato fuera de rango NO puede tumbar una pantalla. Se muestra el guion
 * largo y la usuaria sigue navegando.
 *
 * Funciones PURAS con unitarios propios (regla r11c-2).
 */

export const MOODS = ['Low', 'Meh', 'Okay', 'Good', 'Great'] as const;
export const ENERGY = ['Low', 'Low', 'Mid', 'High', 'High'] as const;
export const FLOWS = ['None', 'Light', 'Medium', 'Heavy'] as const;

/** Lo que se pinta cuando no hay dato o el dato no es de fiar. */
export const SIN_DATO = '—';

export type Etiqueta = { clave: string | null; texto: string };

/** Solo un número entero de verdad cuenta como dato: un '3' en texto colaría
    por la coerción de JavaScript ('3' - 1 === 2) y eso es un dato corrupto
    disfrazado de bueno. Lo cazó su propio test. */
function esNumero(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Devuelve el nombre en la posición pedida, o null si se sale de la lista. */
function enLista(lista: readonly string[], indice: number): string | null {
  return Number.isInteger(indice) && indice >= 0 && indice < lista.length ? lista[indice] : null;
}

/**
 * Ánimo y energía se guardan de 1 a 5 (el 0 y el null significan «sin dato»).
 * Devuelve la clave de i18n y el texto de respaldo, o SIN_DATO si no aplica.
 */
export function etiquetaMood(valor: number | null | undefined): Etiqueta {
  const nombre = esNumero(valor) && valor ? enLista(MOODS, valor - 1) : null;
  return nombre ? { clave: 'mob.valM.' + nombre.toLowerCase(), texto: nombre }
                : { clave: null, texto: SIN_DATO };
}

export function etiquetaEnergia(valor: number | null | undefined): Etiqueta {
  const nombre = esNumero(valor) && valor ? enLista(ENERGY, valor - 1) : null;
  return nombre ? { clave: 'mob.valE.' + nombre.toLowerCase(), texto: nombre }
                : { clave: null, texto: SIN_DATO };
}

/** El flujo se guarda de 0 a 3 — aquí el 0 SÍ es un dato («None»). */
export function etiquetaFlujo(valor: number | null | undefined): Etiqueta {
  const nombre = esNumero(valor) ? enLista(FLOWS, valor) : null;
  return nombre ? { clave: 'mob.valF.' + nombre.toLowerCase(), texto: nombre }
                : { clave: null, texto: SIN_DATO };
}

/** Traduce una etiqueta con la función t de la pantalla. */
export function pinta(e: Etiqueta, t: (clave: string, respaldo: string) => string): string {
  return e.clave ? t(e.clave, e.texto) : e.texto;
}
