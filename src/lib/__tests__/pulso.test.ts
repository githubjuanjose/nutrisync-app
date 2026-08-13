import { pulsoEnIdioma, opcionValida, toca, PulsoRaw } from '../pulso';

const RAW: PulsoRaw = {
  code: 'foto-p1',
  pregunta_es: '¿Qué tal ha ido con la foto?',
  pregunta_en: 'How did the photo go?',
  opciones_es: ['Lo ha acertado', 'Casi, corregí algo', 'No se parecía'],
  opciones_en: ['It got it right', 'Close, I fixed it', 'Not really'],
  gracias_es: 'Gracias.',
  gracias_en: 'Thank you.',
};

describe('pulso · elegir idioma', () => {
  it('en español devuelve los textos en español', () => {
    const p = pulsoEnIdioma(RAW, 'es-ES');
    expect(p?.pregunta).toBe('¿Qué tal ha ido con la foto?');
    expect(p?.opciones[0]).toBe('Lo ha acertado');
    expect(p?.gracias).toBe('Gracias.');
  });

  it('en cualquier otro idioma devuelve inglés', () => {
    expect(pulsoEnIdioma(RAW, 'de-DE')?.pregunta).toBe('How did the photo go?');
    expect(pulsoEnIdioma(RAW, 'ja')?.opciones[2]).toBe('Not really');
  });

  it('sin pulso pendiente devuelve null, no un objeto vacío', () => {
    expect(pulsoEnIdioma(null, 'es')).toBeNull();
  });

  // Un dato a medias NO se pinta a medias: se calla. Es la lección del negro
  // en la gráfica — un valor inesperado debe producir NADA, no algo raro.
  it('si llega incompleto no se pinta', () => {
    expect(pulsoEnIdioma({ ...RAW, code: '' } as PulsoRaw, 'es')).toBeNull();
    expect(pulsoEnIdioma({ ...RAW, opciones_es: [], opciones_en: [] } as PulsoRaw, 'es')).toBeNull();
    expect(pulsoEnIdioma({ ...RAW, opciones_es: ['solo una'], opciones_en: ['just one'] } as PulsoRaw, 'es')).toBeNull();
    expect(pulsoEnIdioma({ ...RAW, opciones_es: ['bien', '  '], opciones_en: ['ok', '  '] } as PulsoRaw, 'es')).toBeNull();
  });

  it('un idioma raro o vacío no revienta', () => {
    expect(pulsoEnIdioma(RAW, '')?.pregunta).toBe('How did the photo go?');
    expect(pulsoEnIdioma(RAW, undefined as unknown as string)?.pregunta).toBe('How did the photo go?');
  });

  it('sin mensaje de vuelta, gracias es null (no la cadena "null")', () => {
    const p = pulsoEnIdioma({ ...RAW, gracias_es: null, gracias_en: null } as PulsoRaw, 'es');
    expect(p?.gracias).toBeNull();
  });
});

describe('pulso · validar la opción', () => {
  const p = pulsoEnIdioma(RAW, 'es');

  it('acepta de 1 a N, como en la base', () => {
    expect(opcionValida(p, 1)).toBe(true);
    expect(opcionValida(p, 3)).toBe(true);
  });

  it('rechaza fuera de rango, el 0 y lo que no sea entero', () => {
    expect(opcionValida(p, 0)).toBe(false);
    expect(opcionValida(p, 4)).toBe(false);
    expect(opcionValida(p, -1)).toBe(false);
    expect(opcionValida(p, 1.5)).toBe(false);
    expect(opcionValida(p, '2' as unknown as number)).toBe(false);
    expect(opcionValida(p, null as unknown as number)).toBe(false);
  });

  it('sin pulso, ninguna opción vale', () => {
    expect(opcionValida(null, 1)).toBe(false);
  });
});

describe('pulso · cuándo se enseña', () => {
  // Preguntar a quien está a mitad de una tarea es la forma más rápida de que
  // cierre sin leer — y solo hay UNA oportunidad con cada persona.
  it('solo después de que algo le haya salido bien', () => {
    expect(toca(true, 'exito')).toBe(true);
    expect(toca(true, 'entrando')).toBe(false);
    expect(toca(true, 'error')).toBe(false);
  });

  it('si no hay pulso pendiente, nunca', () => {
    expect(toca(false, 'exito')).toBe(false);
  });
});
