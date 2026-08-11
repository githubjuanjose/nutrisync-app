/**
 * El color de fase nunca puede salir undefined: en SVG, undefined = NEGRO.
 * Cada caso de aquí es un dato que, con el código anterior, pintaba de negro
 * una parte de la pantalla sin lanzar un solo error.
 */
import { colorDeFase, esFaseConocida, faseVisible, COLOR_SIN_FASE } from '../fases';
import { phaseColor } from '../../theme';

describe('color de fase', () => {
  it('las cuatro fases buenas devuelven su color', () => {
    expect(colorDeFase('menstrual')).toBe(phaseColor.menstrual);
    expect(colorDeFase('follicular')).toBe(phaseColor.follicular);
    expect(colorDeFase('ovulatory')).toBe(phaseColor.ovulatory);
    expect(colorDeFase('luteal')).toBe(phaseColor.luteal);
  });

  it('EL BUG: mayúsculas y espacios ya no pintan de negro', () => {
    expect(colorDeFase('Luteal')).toBe(phaseColor.luteal);
    expect(colorDeFase(' MENSTRUAL ')).toBe(phaseColor.menstrual);
  });

  it('cualquier cosa desconocida cae en el respaldo, jamás en undefined', () => {
    const bestiario = [null, undefined, '', '   ', 'unknown', 'fase5', 7, {}, [], true, NaN];
    for (const v of bestiario) {
      expect(colorDeFase(v as any)).toBe(COLOR_SIN_FASE);
      expect(colorDeFase(v as any)).toBeTruthy();          // nunca undefined
      expect(String(colorDeFase(v as any)).toLowerCase()).not.toBe('#000000');
    }
  });

  it('EL BUG DE VERDAD: las dos lúteas del cálculo pintan color de lútea', () => {
    // phaseColor solo conoce 4 fases; el cálculo produce 5. Sin colapsar,
    // media vuelta del ciclo se pintaba de NEGRO.
    expect(colorDeFase('early_luteal')).toBe(phaseColor.luteal);
    expect(colorDeFase('late_luteal')).toBe(phaseColor.luteal);
    expect(colorDeFase('Early_Luteal')).toBe(phaseColor.luteal);
    expect(faseVisible('late_luteal')).toBe('luteal');
    expect(faseVisible('ovulatory')).toBe('ovulatory');
    expect(faseVisible('inventada')).toBeNull();
  });

  it('esFaseConocida distingue lo que sabemos pintar de lo que no', () => {
    expect(esFaseConocida('luteal')).toBe(true);
    expect(esFaseConocida('early_luteal')).toBe(true);
    expect(esFaseConocida('Luteal')).toBe(true);
    expect(esFaseConocida('sin_datos')).toBe(false);
    expect(esFaseConocida(null)).toBe(false);
  });
});
