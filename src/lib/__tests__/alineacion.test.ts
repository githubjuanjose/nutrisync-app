/**
 * r19 · Alineación por fase — la lógica pura, con la regla del tono dentro.
 */
import {
  parseAlineacion, tierDeItem, claveDeTier, fraseDeFasePermitida, faseDeSegmento,
} from '../alineacion';

const RESP = {
  activo: true, segment: 'Luteal - Mid', goal: 'Reduce PMS Symptoms',
  overall: { score: 7.5, tier: 'Excellent' },
  items: [
    { detected_name: 'Salmon', matched: true, tier: 'Excellent' },
    { detected_name: 'Ketchup', matched: true, tier: 'Fair' },
    { detected_name: 'Cosa rara', matched: false, tier: null },
  ],
};

describe('alineación · parsear la respuesta del RPC', () => {
  it('respuesta buena → activo con items y overall', () => {
    const a = parseAlineacion(RESP);
    expect(a.activo).toBe(true);
    expect(a.overall).toBe('Excellent');
    expect(a.items).toHaveLength(3);
  });

  it('apagado en la base → apagado aquí, sin ruido', () => {
    expect(parseAlineacion({ activo: false }).activo).toBe(false);
    expect(parseAlineacion({ activo: false }).items).toHaveLength(0);
  });

  // La regla del negro en la gráfica: forma rara → NADA, no basura.
  it('formas raras → apagado', () => {
    for (const raro of [null, undefined, 42, 'x', {}, { activo: 'yes' },
                        { activo: true, overall: { tier: 'Amazing' }, items: 'no' }]) {
      const a = parseAlineacion(raro);
      expect(a.activo === false || (a.overall === null && a.items.length === 0)).toBe(true);
    }
  });

  it('un tier inventado por el servidor no pasa el filtro', () => {
    const a = parseAlineacion({ activo: true, items: [
      { detected_name: 'X', matched: true, tier: 'Legendary' }] });
    expect(a.items[0].tier).toBeNull();
    expect(a.items[0].matched).toBe(false);
  });
});

describe('alineación · tier por item', () => {
  const a = parseAlineacion(RESP);
  it('encuentra por nombre, sin importar mayúsculas', () => {
    expect(tierDeItem(a, 'salmon')).toBe('Excellent');
    expect(tierDeItem(a, 'KETCHUP')).toBe('Fair');
  });
  it('sin casar o desconocido → null (sin chip, jamás uno equivocado)', () => {
    expect(tierDeItem(a, 'Cosa rara')).toBeNull();
    expect(tierDeItem(a, 'no existe')).toBeNull();
  });
  it('apagado → null siempre', () => {
    expect(tierDeItem(parseAlineacion({ activo: false }), 'Salmon')).toBeNull();
  });
});

describe('alineación · LA REGLA DEL TONO (propuesta a Pilar, hecha código)', () => {
  it('frase de fase SOLO en positivo', () => {
    expect(fraseDeFasePermitida('Excellent')).toBe(true);
    expect(fraseDeFasePermitida('Great')).toBe(true);
  });
  it('Good, Fair o nada → SILENCIO', () => {
    expect(fraseDeFasePermitida('Good')).toBe(false);
    expect(fraseDeFasePermitida('Fair')).toBe(false);
    expect(fraseDeFasePermitida(null)).toBe(false);
  });
});

describe('alineación · utilidades', () => {
  it('clave i18n del chip', () => {
    expect(claveDeTier('Excellent')).toBe('mob.foto.tier.excellent');
  });
  it('segmento de la hoja → fase corta', () => {
    expect(faseDeSegmento('Luteal - Mid')).toBe('luteal');
    expect(faseDeSegmento('Ovulatory - Peak')).toBe('ovulatory');
    expect(faseDeSegmento(null)).toBeNull();
    expect(faseDeSegmento('Cosa - Rara')).toBeNull();
  });
});
