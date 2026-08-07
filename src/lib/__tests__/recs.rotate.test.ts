import { rotateDaily, orderedCategories } from '../recs';

describe('rotateDaily (NS-0007: cada día, platos nuevos arriba)', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];
  it('determinista: misma semilla, mismo orden (estable en re-renders)', () => {
    expect(rotateDaily(items, '2026-08-07·greens')).toEqual(rotateDaily(items, '2026-08-07·greens'));
  });
  it('rota sin perder ni duplicar nada', () => {
    const r = rotateDaily(items, '2026-08-07·greens');
    expect([...r].sort()).toEqual([...items].sort());
    expect(r.length).toBe(items.length);
  });
  it('días distintos producen órdenes distintos (en listas de 5, casi siempre)', () => {
    const dias = ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11'];
    const ordenes = new Set(dias.map((d) => rotateDaily(items, d + '·x').join(',')));
    expect(ordenes.size).toBeGreaterThan(1);
  });
  it('bordes: vacío y un solo elemento', () => {
    expect(rotateDaily([], 's')).toEqual([]);
    expect(rotateDaily(['solo'], 's')).toEqual(['solo']);
  });
});

describe('orderedCategories con rotación (semilla explícita para el test)', () => {
  it('mantiene el orden de categorías y rota dentro', () => {
    const map = { greens: [{ id: '1', name: 'kale', score: 1 }, { id: '2', name: 'chard', score: 1 }] } as any;
    const [[cat, items]] = orderedCategories(map, '2026-08-07');
    expect(cat).toBe('greens');
    expect(items.map((i: any) => i.id).sort()).toEqual(['1', '2']);
  });
});
