/**
 * NS-0041 / NS-0043 — el crash de «Body Insight».
 *
 * Cada caso de aquí es un valor que, con el código anterior, hacía
 * `undefined.toLowerCase()` y cerraba la app de golpe en producción.
 */
import { etiquetaMood, etiquetaEnergia, etiquetaFlujo, pinta, SIN_DATO } from '../etiquetas';

const t = (clave: string, respaldo: string) => `«${clave}»` || respaldo;

describe('etiquetas de los registros rápidos', () => {
  describe('ánimo (1-5)', () => {
    it('traduce los cinco valores buenos', () => {
      expect(etiquetaMood(1)).toEqual({ clave: 'mob.valM.low', texto: 'Low' });
      expect(etiquetaMood(3)).toEqual({ clave: 'mob.valM.okay', texto: 'Okay' });
      expect(etiquetaMood(5)).toEqual({ clave: 'mob.valM.great', texto: 'Great' });
    });
    it('sin dato → guion, nunca una excepción', () => {
      expect(etiquetaMood(null).texto).toBe(SIN_DATO);
      expect(etiquetaMood(undefined).texto).toBe(SIN_DATO);
      expect(etiquetaMood(0).texto).toBe(SIN_DATO);
    });
    it('EL CRASH: valores fuera de rango o corruptos', () => {
      // 6 venía de la base y reventaba la pantalla entera
      expect(etiquetaMood(6).texto).toBe(SIN_DATO);
      expect(etiquetaMood(99).texto).toBe(SIN_DATO);
      expect(etiquetaMood(-1).texto).toBe(SIN_DATO);
      expect(etiquetaMood(2.5 as any).texto).toBe(SIN_DATO);
      expect(etiquetaMood(NaN as any).texto).toBe(SIN_DATO);
      expect(etiquetaMood('3' as any).texto).toBe(SIN_DATO);
    });
  });

  describe('energía (1-5)', () => {
    it('traduce y respeta los duplicados de la escala', () => {
      expect(etiquetaEnergia(1)).toEqual({ clave: 'mob.valE.low', texto: 'Low' });
      expect(etiquetaEnergia(2)).toEqual({ clave: 'mob.valE.low', texto: 'Low' });
      expect(etiquetaEnergia(4)).toEqual({ clave: 'mob.valE.high', texto: 'High' });
    });
    it('fuera de rango → guion', () => {
      expect(etiquetaEnergia(6).texto).toBe(SIN_DATO);
      expect(etiquetaEnergia(null).texto).toBe(SIN_DATO);
    });
  });

  describe('flujo (0-3, donde el 0 SÍ es un dato)', () => {
    it('el cero es «None», no «sin dato»', () => {
      expect(etiquetaFlujo(0)).toEqual({ clave: 'mob.valF.none', texto: 'None' });
    });
    it('traduce el resto', () => {
      expect(etiquetaFlujo(3)).toEqual({ clave: 'mob.valF.heavy', texto: 'Heavy' });
    });
    it('EL CRASH: un 4 guardado por una versión vieja', () => {
      expect(etiquetaFlujo(4).texto).toBe(SIN_DATO);
      expect(etiquetaFlujo(-1).texto).toBe(SIN_DATO);
      expect(etiquetaFlujo(null).texto).toBe(SIN_DATO);
    });
  });

  describe('pinta', () => {
    it('usa la traducción cuando hay clave', () => {
      expect(pinta(etiquetaMood(4), t)).toBe('«mob.valM.good»');
    });
    it('devuelve el guion sin pasar por t cuando no hay dato', () => {
      expect(pinta(etiquetaMood(77), t)).toBe(SIN_DATO);
    });
  });

  it('NINGÚN valor imaginable lanza excepción', () => {
    const bestiario = [null, undefined, 0, 1, 5, 6, -3, 2.7, NaN, Infinity, '2', {}, []] as any[];
    for (const v of bestiario) {
      expect(() => etiquetaMood(v)).not.toThrow();
      expect(() => etiquetaEnergia(v)).not.toThrow();
      expect(() => etiquetaFlujo(v)).not.toThrow();
    }
  });
});
