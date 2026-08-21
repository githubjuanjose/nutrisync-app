/**
 * UST-04 «Escáner de verdad» (0.22.6, 21-ago) — la lógica nueva nace con sus
 * casos EN EL MISMO CAMBIO (r11c-2):
 *  · eligeTipo — F1: la elección manual manda; el guess solo rellena sin toque
 *    (el lunch de Pilar de las 11:17/11:56 durmiendo bajo Dinner).
 *  · resincronizaDescripcion — F6: History deja de divergir del escaneo.
 *  · decora — F7: glosario ES al lado del canónico, sin tocar lo que ya
 *    trae paréntesis.
 */
import { eligeTipo, resincronizaDescripcion } from '../foto';
import { decora } from '../glosario';

describe('eligeTipo — F1: su elección manda', () => {
  it('sin toque, el guess válido rellena (comodidad conservada)', () => {
    expect(eligeTipo(false, 'dinner', 'lunch')).toBe('dinner');
  });
  it('CON toque, el guess NO pisa — ni siquiera uno válido', () => {
    expect(eligeTipo(true, 'dinner', 'lunch')).toBe('lunch');
  });
  it('guess basura → se queda lo que había, tocado o no', () => {
    expect(eligeTipo(false, 'brunch', 'lunch')).toBe('lunch');
    expect(eligeTipo(true, undefined, 'breakfast')).toBe('breakfast');
  });
});

describe('resincronizaDescripcion — F6: una sola verdad', () => {
  it('conserva el «Nombre — » del plato si ya lo llevaba', () => {
    expect(resincronizaDescripcion('Ensalada mixta — Roast beef, Red wine, Tomato', ['Roast beef', 'Coca-Cola', 'Tomato']))
      .toBe('Ensalada mixta — Roast beef, Coca-Cola, Tomato');
  });
  it('sin prefijo, la lista limpia sustituye todo', () => {
    expect(resincronizaDescripcion('Salmon, Couscous', ['Salmon'])).toBe('Salmon');
  });
  it('vacíos y nulos no ensucian la lista', () => {
    expect(resincronizaDescripcion(null, ['A', '', 'B'])).toBe('A, B');
    expect(resincronizaDescripcion(undefined, [])).toBe('');
  });
});

describe('decora — F7: glosario honesto', () => {
  const G = { avocado: 'Aguacate', carrot: 'Zanahoria', couscous: 'Cuscús', chorizo: 'Chorizo' };
  it('añade el español entre paréntesis', () => {
    expect(decora(G, 'Avocado')).toBe('Avocado (Aguacate)');
  });
  it('tolera plural/singular en ambos sentidos', () => {
    expect(decora(G, 'Carrots')).toBe('Carrots (Zanahoria)');
    expect(decora({ carrots: 'Zanahorias' }, 'Carrot')).toBe('Carrot (Zanahorias)');
  });
  it('lo que ya trae paréntesis NO se toca (History ya venía bien)', () => {
    expect(decora(G, 'Avocado (Aguacate)')).toBe('Avocado (Aguacate)');
  });
  it('si el español es idéntico al inglés, no ensucia (Chorizo)', () => {
    expect(decora(G, 'Chorizo')).toBe('Chorizo');
  });
  it('desconocidos y vacíos salen tal cual', () => {
    expect(decora(G, 'Polenta')).toBe('Polenta');
    expect(decora(G, '')).toBe('');
    expect(decora(G, null)).toBe('');
  });
});
