import { cycleDay, cycleDayActual, phaseForDay, displayPhase, cycleProgress } from '../cas';

// El caso Lucía (31-jul): último período 26-jun, baseline 28 → día real 36, fase lútea, anillo lleno.
const LUCIA_START = '2026-06-26';
const LUCIA_TODAY = new Date('2026-07-31T15:10:00');

describe('cycleDayActual — la regla de oro: el ciclo NUNCA se reinicia solo', () => {
  it('cuenta el caso real de Lucía más allá del baseline', () => {
    expect(cycleDayActual(LUCIA_START, LUCIA_TODAY)).toBe(36);
  });
  it('día 1 el mismo día del período', () => {
    expect(cycleDayActual('2026-07-26', new Date('2026-07-26T09:00:00'))).toBe(1);
  });
  it('no baja de 1 aunque la fecha sea futura (dato corregido)', () => {
    expect(cycleDayActual('2026-08-15', new Date('2026-08-01'))).toBe(1);
  });
  it('sigue contando: 29, 30… sin envolver', () => {
    expect(cycleDayActual('2026-07-01', new Date('2026-07-29'))).toBe(29);
    expect(cycleDayActual('2026-07-01', new Date('2026-08-26'))).toBe(57);
  });
});

describe('cycleDay — el modulo SOLO para predicciones de calendario', () => {
  it('envuelve para forecasting', () => {
    expect(cycleDay('2026-07-01', new Date('2026-07-29'), 28)).toBe(1);
  });
});

describe('phaseForDay — fases con baseline 28/5', () => {
  it.each([
    [1, 'menstrual'], [5, 'menstrual'], [6, 'follicular'], [13, 'follicular'],
    [14, 'ovulatory'], [16, 'ovulatory'], [17, 'early_luteal'], [21, 'early_luteal'],
    [22, 'late_luteal'], [28, 'late_luteal'],
  ] as const)('día %i → %s', (day, phase) => {
    expect(phaseForDay(day, 28, 5)).toBe(phase);
  });
  it('día 36 (gracia) sigue siendo lútea — jamás rebobina', () => {
    expect(displayPhase(phaseForDay(36, 28, 5))).toBe('luteal');
  });
  it('se adapta a baselines distintos (ovulación = len-14)', () => {
    expect(phaseForDay(21, 35, 5)).toBe('ovulatory');
  });
});

describe('cycleProgress — el anillo clampa, nunca da la vuelta', () => {
  it('día 14 de 28 = 0.5', () => expect(cycleProgress(14, 28)).toBe(0.5));
  it('día 36 de 28 = 1 (cerrado, no 1.28 vueltas)', () => expect(cycleProgress(36, 28)).toBe(1));
  it('nunca negativo', () => expect(cycleProgress(-3, 28)).toBe(0));
});

/* ── r12-b1 · intensidades COMPUESTAS del catálogo (bug Pilar: anillo a 0) ── */
import { normalizeIntensity } from '../daily';

describe('normalizeIntensity — el catálogo real, no solo los 5 valores limpios', () => {
  it.each([
    ['Moderate-High', 'high'], ['moderate_high', 'high'], ['High-Intensity', 'high'],
    ['Low-Mid', 'moderate'], ['Moderates Training', 'moderate'], ['Medium', 'moderate'],
    ['Low-Moderate', 'low'], ['Low', 'low'], ['Gentle walk', 'low'],
    ['Restorative Yoga', 'rest'], ['Rest', 'rest'], ['Restore with Yin Yoga', 'rest'],
  ] as [string, string][])('%s → %s', (raw, want) => {
    expect(normalizeIntensity(raw)).toBe(want);
  });
  it('vacío o desconocido → null (no inventamos intensidad)', () => {
    expect(normalizeIntensity('')).toBeNull();
    expect(normalizeIntensity(null)).toBeNull();
    expect(normalizeIntensity('pilates fusion')).toBeNull();
  });
});

/* ── r12-b4 · el ítem SIN intensidad hereda la de su categoría ──────────────
   Bug real: "strength training · Most Recommended" no trae intensidad en el
   catálogo → se guardaba null → el anillo de movimiento seguía a 0 justo en el
   caso por defecto. La categoría es el respaldo; el registro nunca se pierde. */
import { categoryIntensity, rowIntensity, highestIntensity } from '../daily';

describe('categoryIntensity — respaldo por categoría', () => {
  it.each([
    ['Strength', 'moderate'], ['strength_training', 'moderate'], ['Fuerza', 'moderate'],
    ['HIIT', 'high'], ['Cardio', 'moderate'], ['Yoga', 'low'], ['Mobility', 'low'],
    ['Recovery', 'rest'], ['other', 'low'],
  ] as [string, string][])('%s → %s', (cat, want) => expect(categoryIntensity(cat)).toBe(want));
  it('categoría desconocida o vacía → null', () => {
    expect(categoryIntensity('')).toBeNull();
    expect(categoryIntensity(null)).toBeNull();
    expect(categoryIntensity('zumba espacial')).toBeNull();
  });
});

describe('rowIntensity — la del ítem manda; si no hay, la de la categoría', () => {
  it('CASO PILAR: strength sin intensidad ya NO es cero', () => {
    expect(rowIntensity({ intensity_level: null, category_tag: 'strength' })).toBe('moderate');
  });
  it('la intensidad propia gana a la de la categoría', () => {
    expect(rowIntensity({ intensity_level: 'Moderate-High', category_tag: 'yoga' })).toBe('high');
  });
  it('sin nada de nada → null (honesto)', () => {
    expect(rowIntensity({ intensity_level: null, category_tag: null })).toBeNull();
  });
});

describe('highestIntensity — gana el nivel más alto de lo MARCADO', () => {
  it('strength por defecto + yoga → moderate (antes: null)', () => {
    expect(highestIntensity([
      { intensity_level: null, category_tag: 'strength', checked: true },
      { intensity_level: 'Low', category_tag: 'yoga', checked: true },
    ])).toBe('moderate');
  });
  it('lo desmarcado no cuenta', () => {
    expect(highestIntensity([
      { intensity_level: 'High', category_tag: 'hiit', checked: false },
      { intensity_level: null, category_tag: 'yoga', checked: true },
    ])).toBe('low');
  });
  it('lista vacía → null', () => expect(highestIntensity([])).toBeNull());
});
