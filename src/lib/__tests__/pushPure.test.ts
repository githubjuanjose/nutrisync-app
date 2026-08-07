import { mapPermission, buildPrefsUpsert } from '../pushPure';

describe('mapPermission (N1: cualquier cosa rara → volver a preguntar)', () => {
  it('estados claros', () => {
    expect(mapPermission('granted')).toBe('granted');
    expect(mapPermission('denied')).toBe('denied');
  });
  it('lo desconocido cae en ask — asumir concedido no es seguro', () => {
    expect(mapPermission('undetermined')).toBe('ask');
    expect(mapPermission(undefined)).toBe('ask');
    expect(mapPermission(null)).toBe('ask');
    expect(mapPermission('provisional')).toBe('ask');
  });
});

describe('buildPrefsUpsert (N1: upsert parcial, jamás pisa interruptores)', () => {
  it('payload canónico', () => {
    expect(buildPrefsUpsert('u1', 'ExponentPushToken[x]', 'ios', 'Europe/Madrid', 'es')).toEqual({
      user_id: 'u1', push_token: 'ExponentPushToken[x]', plataforma: 'ios', zona: 'Europe/Madrid', idioma: 'es',
    });
  });
  it('NO incluye interruptores ni horas: eso lo posee la pantalla (N2)', () => {
    const p = buildPrefsUpsert('u1', 't', 'android', 'Europe/Madrid') as Record<string, unknown>;
    for (const k of ['diario', 'fases', 'rachas', 'reenganche', 'hora_manana', 'hora_noche']) {
      expect(k in p).toBe(false);
    }
  });
  it('plataforma rara → other · zona no-IANA → respaldo (regla r12-b4)', () => {
    expect(buildPrefsUpsert('u', 't', 'windows', 'Europe/Madrid').plataforma).toBe('other');
    expect(buildPrefsUpsert('u', 't', 'ios', '').zona).toBe('Europe/Madrid');
    expect(buildPrefsUpsert('u', 't', 'ios', 'GMT').zona).toBe('Europe/Madrid');
    expect(buildPrefsUpsert('u', 't', 'ios', 'America/Bogota').zona).toBe('America/Bogota');
  });
});

describe('buildPrefsUpsert · idioma (N3: el despachador lee es→texto_es)', () => {
  it('idiomas del catálogo pasan; lo raro cae a en', () => {
    expect(buildPrefsUpsert('u', 't', 'ios', 'Europe/Madrid', 'es').idioma).toBe('es');
    expect(buildPrefsUpsert('u', 't', 'ios', 'Europe/Madrid', 'eu').idioma).toBe('eu');
    expect(buildPrefsUpsert('u', 't', 'ios', 'Europe/Madrid', 'xx').idioma).toBe('en');
    expect(buildPrefsUpsert('u', 't', 'ios', 'Europe/Madrid').idioma).toBe('en');
  });
});

describe('mapGrupoTab (N4: cada toque a su pestaña, jamás rompe)', () => {
  const { mapGrupoTab } = require('../pushPure');
  it('racha → Progress · ciclo → Calendar · diario/reenganche → Cycle', () => {
    expect(mapGrupoTab('streak_hit')).toBe('Progress');
    expect(mapGrupoTab('phase_luteal')).toBe('Calendar');
    expect(mapGrupoTab('new_cycle')).toBe('Calendar');
    expect(mapGrupoTab('end_period')).toBe('Calendar');
    expect(mapGrupoTab('morning_log')).toBe('Cycle');
    expect(mapGrupoTab('reengage')).toBe('Cycle');
  });
  it('desconocido o ausente → Cycle (la casa)', () => {
    expect(mapGrupoTab('loquesea')).toBe('Cycle');
    expect(mapGrupoTab(undefined)).toBe('Cycle');
    expect(mapGrupoTab(null)).toBe('Cycle');
  });
});

describe('shots (r16-F: adjunto del feedback)', () => {
  const { buildShotPath, extFromUri } = require('../shots');
  it('la ruta SIEMPRE cuelga de la carpeta de la usuaria (RLS)', () => {
    expect(buildShotPath('u-1', 1723000000000)).toBe('u-1/1723000000000.jpg');
    expect(buildShotPath('u-1', 5, 'PNG')).toBe('u-1/5.png');
    expect(buildShotPath('u-1', 5, '../evil')).toBe('u-1/5.evil');
  });
  it('extensión desde uri: heic→jpg, query fuera, rara→jpg', () => {
    expect(extFromUri('file:///a/IMG.HEIC')).toBe('jpg');
    expect(extFromUri('file:///a/shot.png?x=1')).toBe('png');
    expect(extFromUri(null)).toBe('jpg');
  });
});
