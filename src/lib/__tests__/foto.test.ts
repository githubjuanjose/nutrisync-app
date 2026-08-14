/**
 * Epic P · P1 — unitarios de la lógica de la foto.
 *
 * Cada bloque cubre una decisión que, si sale mal, se ve en producción:
 * una ruta sin la carpeta del uid = upload rechazado por RLS; un reescalado
 * al revés = fotos ampliadas que cuestan dinero; un tipo de comida inventado
 * = insert rechazado por el CHECK de meal_captures.
 */
import {
  rutaFoto, tipoPorHora, redimension, borradorUtil, nivelConfianza,
  gramosTotales, motivoFallo, pesoAceptable, tipoValido, bytesDesdeBase64,
  LADO_MAX, BYTES_MAX,
} from '../foto';

describe('Epic P · lógica de la foto de comida', () => {
  describe('rutaFoto — la carpeta del uid es obligatoria (RLS)', () => {
    const uid = '11111111-2222-3333-4444-555555555555';
    it('primer tramo = uid, siempre', () => {
      expect(rutaFoto(uid, 1700000000000).split('/')[0]).toBe(uid);
    });
    it('normaliza la extensión y cae en jpg si viene basura', () => {
      expect(rutaFoto(uid, 7, 'JPEG')).toBe(`${uid}/7.jpeg`);
      expect(rutaFoto(uid, 7, '.PNG')).toBe(`${uid}/7.png`);
      expect(rutaFoto(uid, 7, '///')).toBe(`${uid}/7.jpg`);
      expect(rutaFoto(uid, 7, '')).toBe(`${uid}/7.jpg`);
    });
  });

  describe('tipoPorHora — hora LOCAL, nunca UTC (NS-0010)', () => {
    it('reparte el día como lo vive una persona', () => {
      expect(tipoPorHora(8)).toBe('breakfast');
      expect(tipoPorHora(14)).toBe('lunch');
      expect(tipoPorHora(21)).toBe('dinner');
      expect(tipoPorHora(17)).toBe('snack');   // media tarde
      expect(tipoPorHora(3)).toBe('snack');    // madrugada
    });
    it('los bordes caen del lado correcto', () => {
      expect(tipoPorHora(5)).toBe('breakfast');
      expect(tipoPorHora(11)).toBe('lunch');
      expect(tipoPorHora(16)).toBe('snack');
      expect(tipoPorHora(19)).toBe('dinner');
      expect(tipoPorHora(23)).toBe('dinner');
    });
    it('una hora imposible no rompe nada', () => {
      for (const h of [-1, 24, 99, NaN, Infinity, 2.9]) {
        expect(['snack', 'lunch']).toContain(tipoPorHora(h as number));
      }
      expect(tipoPorHora(NaN)).toBe('snack');
      expect(tipoPorHora(-1)).toBe('snack');
    });
  });

  describe('redimension — encoger sí, ampliar JAMÁS', () => {
    it('lado largo horizontal', () => {
      expect(redimension(4032, 3024)).toEqual({ width: LADO_MAX });
    });
    it('lado largo vertical', () => {
      expect(redimension(3024, 4032)).toEqual({ height: LADO_MAX });
    });
    it('cuadrada: se toma el ancho', () => {
      expect(redimension(2000, 2000)).toEqual({ width: LADO_MAX });
    });
    it('la que ya cabe se deja en paz', () => {
      expect(redimension(800, 600)).toBeNull();
      expect(redimension(LADO_MAX, LADO_MAX)).toBeNull();
    });
    it('dimensiones absurdas → no tocar', () => {
      expect(redimension(0, 100)).toBeNull();
      expect(redimension(NaN, 100)).toBeNull();
      expect(redimension(-10, -10)).toBeNull();
    });
  });

  describe('borradorUtil — qué merece enseñarse', () => {
    it('comida con al menos un item con nombre', () => {
      expect(borradorUtil({ is_food: true, items: [{ display_name: 'Tortilla' }] })).toBe(true);
    });
    it('sin comida, sin items o con nombres vacíos: no vale', () => {
      expect(borradorUtil({ is_food: false, items: [{ display_name: 'Mesa' }] })).toBe(false);
      expect(borradorUtil({ is_food: true, items: [] })).toBe(false);
      expect(borradorUtil({ is_food: true, items: [{ display_name: '   ' }] })).toBe(false);
      expect(borradorUtil(null)).toBe(false);
      expect(borradorUtil(undefined)).toBe(false);
      expect(borradorUtil({} as any)).toBe(false);
    });
    it('la confianza baja NO descarta: se enseña y se avisa', () => {
      expect(borradorUtil({ is_food: true, overall_confidence: 0.1, items: [{ display_name: 'Sopa' }] }))
        .toBe(true);
    });
  });

  describe('nivelConfianza', () => {
    it('tres tramos y el «sin dato»', () => {
      expect(nivelConfianza(0.9)).toBe('alta');
      expect(nivelConfianza(0.6)).toBe('media');
      expect(nivelConfianza(0.2)).toBe('baja');
      expect(nivelConfianza(null)).toBe('sin');
      expect(nivelConfianza(1.5)).toBe('sin');
      expect(nivelConfianza('0.9' as any)).toBe('sin');
    });
  });

  describe('gramosTotales', () => {
    it('suma lo que es número y descarta el resto', () => {
      expect(gramosTotales([{ estimated_grams: 120 }, { estimated_grams: 80 }])).toBe(200);
      expect(gramosTotales([{ estimated_grams: 120 }, { estimated_grams: -5 },
                            { estimated_grams: NaN as any }, {}])).toBe(120);
      expect(gramosTotales(null)).toBe(0);
    });
  });

  describe('motivoFallo — ninguna pantalla muda (r12-b9)', () => {
    it('cada familia de fallo tiene su mensaje', () => {
      expect(motivoFallo('not_food').clave).toBe('mob.foto.errNoComida');
      expect(motivoFallo('BUDGET_EXCEEDED').clave).toBe('mob.foto.errCupo');
      expect(motivoFallo('fetch timeout').clave).toBe('mob.foto.errRed');
      expect(motivoFallo('image too_large').clave).toBe('mob.foto.errPeso');
    });
    it('lo desconocido tiene mensaje igual — nunca cadena vacía', () => {
      for (const r of [null, undefined, '', 'algo raro', '42']) {
        const m = motivoFallo(r as any);
        expect(m.clave.length).toBeGreaterThan(0);
        expect(m.texto.length).toBeGreaterThan(0);
      }
    });
  });

  describe('pesoAceptable', () => {
    it('corta antes de gastar red', () => {
      expect(pesoAceptable(500_000)).toBe(true);
      expect(pesoAceptable(BYTES_MAX)).toBe(true);
      expect(pesoAceptable(BYTES_MAX + 1)).toBe(false);
      expect(pesoAceptable(0)).toBe(false);
      expect(pesoAceptable(null)).toBe(false);
    });
  });

  describe('tipoValido — el CHECK de la tabla manda', () => {
    it('acepta los seis del enum y solo esos', () => {
      expect(tipoValido('dinner', 'snack')).toBe('dinner');
      expect(tipoValido('brunch', 'lunch')).toBe('lunch');   // inventado → respaldo
      expect(tipoValido(null, 'snack')).toBe('snack');
      expect(tipoValido(7, 'other')).toBe('other');
    });
  });

  it('NINGUNA entrada imaginable lanza excepción', () => {
    const bestiario = [null, undefined, 0, -1, 1e9, NaN, Infinity, '2', {}, [], true] as any[];
    for (const v of bestiario) {
      expect(() => tipoPorHora(v)).not.toThrow();
      expect(() => redimension(v, v)).not.toThrow();
      expect(() => borradorUtil(v)).not.toThrow();
      expect(() => nivelConfianza(v)).not.toThrow();
      expect(() => gramosTotales(v)).not.toThrow();
      expect(() => motivoFallo(v)).not.toThrow();
      expect(() => pesoAceptable(v)).not.toThrow();
      expect(() => tipoValido(v, 'snack')).not.toThrow();
      expect(() => rutaFoto(String(v), 1, v)).not.toThrow();
    }
  });
});

describe('r18 · base64 → bytes (el bug del estreno: la foto llegaba VACÍA)', () => {
  // El vector clásico: 'hi' = aGk=. Si esto falla, nada de lo demás importa.
  it('decodifica un vector conocido, con y sin padding', () => {
    expect(Array.from(bytesDesdeBase64('aGk='))).toEqual([104, 105]);
    expect(Array.from(bytesDesdeBase64('aGk'))).toEqual([104, 105]);
    expect(Array.from(bytesDesdeBase64('aW1nIGJ5dGVzIGhlcmU='))).toEqual(
      Array.from('img bytes here').map((c) => c.charCodeAt(0)));
  });

  it('respeta saltos de línea (los emisores de base64 los meten cada 76 col)', () => {
    expect(Array.from(bytesDesdeBase64('aG\nVsbG8='))).toEqual([104, 101, 108, 108, 111]);
  });

  // La regla del negro en la gráfica: entrada rara → NADA, jamás basura que
  // viaje al bucket como si fuera un JPEG.
  it('vacío, null, undefined o caracteres inválidos → 0 bytes, no basura', () => {
    expect(bytesDesdeBase64('').byteLength).toBe(0);
    expect(bytesDesdeBase64(null).byteLength).toBe(0);
    expect(bytesDesdeBase64(undefined).byteLength).toBe(0);
    expect(bytesDesdeBase64('¡esto no es base64!').byteLength).toBe(0);
  });

  it('un JPEG de verdad empieza por FF D8 tras decodificar su cabecera', () => {
    // '/9j/' es como empieza todo JPEG en base64
    const b = bytesDesdeBase64('/9j/4AAQSkZJRg==');
    expect(b[0]).toBe(0xff);
    expect(b[1]).toBe(0xd8);
  });

  it('ida y vuelta con el tamaño exacto (sin bytes fantasma del padding)', () => {
    for (const [b64, esperado] of [['QQ==', 1], ['QUI=', 2], ['QUJD', 3], ['QUJDRA==', 4]] as const) {
      expect(bytesDesdeBase64(b64).byteLength).toBe(esperado);
    }
  });
});
