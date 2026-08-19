/**
 * F3 (UST-03, VALIDADA 18-ago por Pilar — pesos de la hoja de Constanza):
 * el componente 3 puntúa por TIERS cuando hay comidas casadas, y cae al
 * checklist cuando no las hay (transición). Regla r11c-2: la lógica nace
 * con sus casos en el mismo cambio.
 */
import { component3Nutrition, component3NutritionV2, computeDailyCAS, TIER_PESOS } from '../cas';

describe('component3NutritionV2 — el relevo del score de nutrición', () => {
  it('pesos aprobados: E=100 · G=75 · Good=50 · F=25 (escala fiel)', () => {
    expect(TIER_PESOS.Excellent).toBe(100);
    expect(TIER_PESOS.Great).toBe(75);
    expect(TIER_PESOS.Good).toBe(50);
    expect(TIER_PESOS.Fair).toBe(25);
  });

  it('un dia Excellent puro llena el componente (30/30)', () => {
    expect(component3NutritionV2(['Excellent'], 0, 0)).toBe(30);
  });

  it('la media manda: Great + Fair = 50 → 15 puntos', () => {
    expect(component3NutritionV2(['Great', 'Fair'], 0, 0)).toBe(15);
  });

  it('Good solo = 15 · Fair solo = 8 (redondeo hacia el entero)', () => {
    expect(component3NutritionV2(['Good'], 0, 0)).toBe(15);
    expect(component3NutritionV2(['Fair'], 0, 0)).toBe(8);
  });

  it('sin tiers → TRANSICIÓN: manda el checklist de siempre', () => {
    expect(component3NutritionV2([], 2, 3)).toBe(component3Nutrition(2, 3));
    expect(component3NutritionV2([], 0, 0)).toBe(0);
  });

  it('tiers desconocidos se ignoran; si no queda ninguno, checklist', () => {
    expect(component3NutritionV2(['???', 'Great'], 0, 0)).toBe(Math.round(0.75 * 30));
    expect(component3NutritionV2(['???'], 3, 3)).toBe(component3Nutrition(3, 3));
  });

  it('computeDailyCAS con dayTiers usa la v2 (c3 por tiers, no por checks)', () => {
    const base = {
      phase: 'follicular' as const, hasPeriodStart: true,
      nutritionChecked: 0, nutritionTotal: 5, logsCompleted: 2,
    };
    const con = computeDailyCAS({ ...base, dayTiers: ['Excellent'] });
    const sin = computeDailyCAS({ ...base });
    expect(con.c3).toBe(30);
    expect(sin.c3).toBe(component3Nutrition(0, 5));
  });
});
