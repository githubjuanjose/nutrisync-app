/**
 * Guardarraíl del contrato de idiomas.
 *
 * POR QUÉ EXISTE
 * La regla «toda string nueva nace en los 14 catálogos, en el mismo cambio»
 * vivía solo en CLAUDE.md, o sea en la memoria de quien escribe. Al medirlo el
 * 10-ago salió el resultado incómodo: los 12 catálogos que no son en/es tienen
 * ~100 claves bajo `mob` frente a las 422 de en/es. La regla se cumplía a
 * ratos. Un test no se cansa.
 *
 * Alcance deliberado: este test NO exige paridad total todavía (eso rompería
 * en rojo desde el primer día y un semáforo que siempre está rojo no lo mira
 * nadie). Exige paridad en los BLOQUES YA CERRADOS —hoy `mob.foto`, el Epic P—
 * y va creciendo con cada bloque que se completa. La deuda de los 322 textos
 * pendientes queda MEDIDA aquí abajo, no olvidada.
 */
import c_en from '../en.json';
import c_es from '../es.json';
import c_ca from '../ca.json';
import c_val from '../val.json';
import c_gl from '../gl.json';
import c_eu from '../eu.json';
import c_oc from '../oc.json';
import c_fr from '../fr.json';
import c_it from '../it.json';
import c_ja from '../ja.json';
import c_de from '../de.json';
import c_nl from '../nl.json';
import c_el from '../el.json';
import c_zh from '../zh.json';

/* OJO: los catálogos se importan con prefijo `c_` por una razón que este
   mismo test descubrió al primer intento: `import it from '../it.json'`
   TAPA la función `it` de jest y la suite entera muere con un
   «(0 , _it.default) is not a function» que no menciona el italiano por
   ningún lado. El idioma se llamaba como la herramienta. */
const CATALOGOS: Record<string, any> = {
  en: c_en, es: c_es, ca: c_ca, val: c_val, gl: c_gl, eu: c_eu, oc: c_oc, fr: c_fr, it: c_it, ja: c_ja, de: c_de, nl: c_nl, el: c_el, zh: c_zh,
};

/** Aplana {a:{b:'x'}} en ['a.b'] para poder comparar conjuntos de claves. */
function claves(obj: any, prefijo = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? claves(v, `${prefijo}${k}.`) : [`${prefijo}${k}`]);
}

/** Bloques que YA están cerrados en los 14 idiomas y no pueden regresar. */
const BLOQUES_CERRADOS = ['mob.foto'];

describe('catálogos de idioma', () => {
  it('los 14 idiomas existen', () => {
    expect(Object.keys(CATALOGOS)).toHaveLength(14);
  });

  describe.each(BLOQUES_CERRADOS)('bloque cerrado: %s', (ruta) => {
    const tramos = ruta.split('.');
    const sub = (c: any) => tramos.reduce((o, t) => o?.[t], c);
    const esperadas = claves(sub(c_en)).sort();

    it('el bloque de referencia (en) no está vacío', () => {
      expect(esperadas.length).toBeGreaterThan(10);
    });

    it.each(Object.keys(CATALOGOS))('%s tiene exactamente las mismas claves', (lang) => {
      expect(claves(sub(CATALOGOS[lang])).sort()).toEqual(esperadas);
    });

    it.each(Object.keys(CATALOGOS))('%s no deja ningún texto vacío', (lang) => {
      const vacias = claves(sub(CATALOGOS[lang])).filter((k) => {
        const v = k.split('.').reduce((o: any, t) => o?.[t], sub(CATALOGOS[lang]));
        return typeof v !== 'string' || v.trim() === '';
      });
      expect(vacias).toEqual([]);
    });

    it.each(Object.keys(CATALOGOS).filter((l) => l !== 'en'))(
      '%s está traducido de verdad, no copiado del inglés', (lang) => {
        const ref = sub(c_en); const otro = sub(CATALOGOS[lang]);
        const iguales = claves(ref).filter((k) => {
          const a = k.split('.').reduce((o: any, t) => o?.[t], ref);
          const b = k.split('.').reduce((o: any, t) => o?.[t], otro);
          return a === b && String(a).length > 6;   // «Total» o «—» sí pueden coincidir
        });
        // Un idioma entero calcado del inglés es un olvido, no una traducción.
        expect(iguales.length).toBeLessThan(claves(ref).length / 2);
      });
  });

  /* La deuda, medida. Cuando este número baje a 0 en los 14, el bloque `mob`
     entero entra en BLOQUES_CERRADOS y el test pasa a exigir paridad total. */
  it('deja constancia de la deuda de traducción pendiente', () => {
    const ref = claves((c_en as any).mob).length;
    const deuda = Object.entries(CATALOGOS)
      .map(([l, c]) => [l, ref - claves((c as any).mob).length] as const)
      .filter(([, n]) => n > 0);
    expect(Array.isArray(deuda)).toBe(true);   // no falla: informa
    if (deuda.length) {
      // eslint-disable-next-line no-console
      console.log('· deuda i18n (claves mob por traducir):',
        deuda.map(([l, n]) => `${l}:${n}`).join(' '));
    }
  });
});
