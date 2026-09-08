/**
 * UST-2026-09-08-16 · C10 — el guardarraíl de PARIDAD, ejecutándose.
 *
 * Recorre el código REAL de `src/screens` y `src/ui` (r11c-3: se verifica el
 * artefacto, no la intención) y exige:
 *   · toda condición de plataforma o pasa por una función pura, o está en el
 *     registro de lib/paridad.ts con motivo, tipo y caducidad;
 *   · ninguna entrada del registro sobra (una excepción que ya no ampara nada
 *     es deuda muerta: se borra);
 *   · ninguna excepción temporal está caducada;
 *   · ninguna pantalla existe en un solo sistema.
 *
 * Probado en ROJO y en VERDE antes de creerle (r17-h): con una condición cruda
 * inventada, con una excepción huérfana, con una caducada y con una pantalla
 * `.ios.tsx` — los cuatro casos los caza (ver los tests de la lógica al final).
 */
import fs from 'fs';
import path from 'path';
import {
  EXCEPCIONES, condicionesCrudas, sinDeclarar, excepcionesHuerfanas,
  excepcionesCaducadas, pantallasDeUnaSolaPlataforma, esFormaPermitida, Hallazgo,
} from '../paridad';

const SRC = path.join(__dirname, '..', '..');           // src/
const CARPETAS = ['screens', 'ui'];

function ficherosDe(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(SRC, dir), { withFileTypes: true })) {
    const rel = `${base}/${e.name}`;
    if (e.isDirectory()) out.push(...ficherosDe(`${dir}/${e.name}`, rel));
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(rel);
  }
  return out;
}

const FICHEROS = CARPETAS.flatMap((c) => ficherosDe(c, c));
const HALLAZGOS: Hallazgo[] = FICHEROS.flatMap((f) =>
  condicionesCrudas(f, fs.readFileSync(path.join(SRC, f), 'utf8')));

describe('C10 · paridad: un desarrollo, dos superficies', () => {
  it('el recorrido encuentra pantallas de verdad (si esto falla, el detector mira donde no debe — r26-k)', () => {
    expect(FICHEROS.length).toBeGreaterThan(30);
    expect(FICHEROS).toContain('screens/main/MovementLogScreen.tsx');
  });

  it('ninguna condición de plataforma sin declarar', () => {
    const malas = sinDeclarar(HALLAZGOS);
    const detalle = malas.map((m) => `  ${m.fichero}:${m.linea} → ${m.texto}`).join('\n');
    expect(detalle === '' ? '' : `condiciones de plataforma SIN declarar en lib/paridad.ts:\n${detalle}`).toBe('');
  });

  it('ninguna excepción huérfana (lo que ya no ampara nada, se borra)', () => {
    const viejas = excepcionesHuerfanas(HALLAZGOS).map((e) => `  ${e.fichero} · ${e.patrones.join(' | ')}`).join('\n');
    expect(viejas === '' ? '' : `excepciones que ya no corresponden a ningún código:\n${viejas}`).toBe('');
  });

  it('ninguna excepción temporal caducada (una diferencia provisional tiene fecha de muerte)', () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const caducadas = excepcionesCaducadas(hoy)
      .map((e) => `  ${e.fichero} · caducó ${e.caduca ?? '(sin fecha declarada)'} · ${e.motivo}`).join('\n');
    expect(caducadas === '' ? '' : `excepciones temporales caducadas — quítalas o renuévalas con motivo:\n${caducadas}`).toBe('');
  });

  it('toda excepción temporal declara su caducidad y toda excepción su motivo', () => {
    for (const e of EXCEPCIONES) {
      expect(e.motivo.length).toBeGreaterThan(20);
      if (e.tipo === 'temporal') expect(e.caduca).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('ninguna pantalla existe en un solo sistema', () => {
    const solas = pantallasDeUnaSolaPlataforma(FICHEROS);
    expect(solas).toEqual([]);
  });
});

/* ── La lógica del detector, probada en rojo (r17-h) ─────────────────────── */
describe('C10 · el detector se prueba antes de creerle', () => {
  const REG = [{ fichero: 'a.tsx', patrones: ["Platform.OS === 'ios' ? 1 : 2"], motivo: 'x'.repeat(25), tipo: 'permanente' as const }];

  it('una condición cruda nueva se caza', () => {
    const h = condicionesCrudas('a.tsx', "const x = Platform.OS === 'android' ? 3 : 4;");
    expect(h).toHaveLength(1);
    expect(sinDeclarar(h, REG)).toHaveLength(1);
  });
  it('una declarada, no', () => {
    const h = condicionesCrudas('a.tsx', "const x = Platform.OS === 'ios' ? 1 : 2;");
    expect(sinDeclarar(h, REG)).toHaveLength(0);
  });
  it('la forma correcta (función pura) no cuenta como condición', () => {
    expect(esFormaPermitida('edges={bordesPantalla(Platform.OS)}')).toBe(true);
    expect(condicionesCrudas('a.tsx', 'edges={bordesPantalla(Platform.OS)}')).toHaveLength(0);
  });
  it('un comentario que menciona Platform.OS no es código', () => {
    expect(condicionesCrudas('a.tsx', "  // antes: Platform.OS === 'ios'\n  * y Platform.OS === 'android'")).toHaveLength(0);
  });
  it('una excepción que ya no ampara nada sale como huérfana', () => {
    expect(excepcionesHuerfanas([], REG)).toHaveLength(1);
  });
  it('una temporal caducada o sin fecha sale en rojo', () => {
    const temp = [
      { fichero: 'b.tsx', patrones: ['p'], motivo: 'x'.repeat(25), tipo: 'temporal' as const, caduca: '2026-01-01' },
      { fichero: 'c.tsx', patrones: ['p'], motivo: 'x'.repeat(25), tipo: 'temporal' as const },
    ];
    expect(excepcionesCaducadas('2026-09-08', temp)).toHaveLength(2);
    expect(excepcionesCaducadas('2025-12-31', [temp[0]])).toHaveLength(0);
  });
  it('una pantalla de un solo sistema —o un .native sin pareja— se caza', () => {
    expect(pantallasDeUnaSolaPlataforma(['ui/X.ios.tsx', 'ui/X.tsx'])).toEqual(['ui/X.ios.tsx']);
    expect(pantallasDeUnaSolaPlataforma(['ui/Y.native.tsx'])).toEqual(['ui/Y.native.tsx']);
    expect(pantallasDeUnaSolaPlataforma(['ui/Y.native.tsx', 'ui/Y.tsx'])).toEqual([]);
  });
});
