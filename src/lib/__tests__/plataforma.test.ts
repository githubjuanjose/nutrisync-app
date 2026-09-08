/**
 * UST-2026-09-08-15 · Android en paridad con iOS — reglas puras.
 * Nacen de la revisión del 8-sep: barra bajo los botones del sistema (edge-to-edge
 * sin insets), Health Connect como callejón sin salida, «Face ID» en Android.
 */
import {
  insetInferior, bordesPantalla, estadoProveedor, proveedoresVisibles,
  consentimientoDisponible, tipoBiometria, BIO_EN, claveTituloBio, estadoCaptura,
} from '../plataforma';

describe('insetInferior — D1: solo Android sube por el inset', () => {
  it('Android: el inset del sistema, redondeado', () => {
    expect(insetInferior('android', 48)).toBe(48);
    expect(insetInferior('android', 23.6)).toBe(24);
  });
  it('iOS y web: cero (el iPhone no cambia)', () => {
    expect(insetInferior('ios', 34)).toBe(0);
    expect(insetInferior('web', 34)).toBe(0);
  });
  it('aguanta null, NaN y negativos (r12-b4)', () => {
    expect(insetInferior('android', null)).toBe(0);
    expect(insetInferior('android', NaN)).toBe(0);
    expect(insetInferior('android', -5)).toBe(0);
  });
});

describe('bordesPantalla — pantallas apiladas', () => {
  it('Android protege arriba y abajo; iOS solo arriba (paddingBottom 40 ya cubre el indicador)', () => {
    expect(bordesPantalla('android')).toEqual(['top', 'bottom']);
    expect(bordesPantalla('ios')).toEqual(['top']);
  });
});

const PROV = [
  { key: 'apple_health', platform: 'ios' as const, native: true },
  { key: 'health_connect', platform: 'android' as const, native: true },
  { key: 'samsung', platform: 'android' as const, native: true },
  { key: 'garmin', platform: 'both' as const, native: false },
];

describe('estadoProveedor / proveedoresVisibles — C2, D2 (actualizado por UST-16 C3)', () => {
  it('Android no ve Apple Health; Health Connect YA es conectable (O3) y Samsung sigue «Próximamente»', () => {
    expect(estadoProveedor('android', PROV[0])).toBe('oculto');
    expect(estadoProveedor('android', PROV[1])).toBe('conectable');
    expect(estadoProveedor('android', PROV[2])).toBe('proximamente');   // sin adaptador escrito
    expect(estadoProveedor('android', PROV[3])).toBe('conectable');
    expect(proveedoresVisibles('android', PROV).map((p) => p.key)).toEqual(['health_connect', 'samsung', 'garmin']);
  });
  it('iOS: Apple Health conectable, los nativos de Android ocultos, Garmin visible', () => {
    expect(estadoProveedor('ios', PROV[0])).toBe('conectable');
    expect(estadoProveedor('ios', PROV[1])).toBe('oculto');
    expect(proveedoresVisibles('ios', PROV).map((p) => p.key)).toEqual(['apple_health', 'garmin']);
  });
});

describe('consentimientoDisponible — la pantalla señal a señal', () => {
  it('el proveedor de SU sistema, y ninguno más (paridad: la misma pantalla en las dos)', () => {
    expect(consentimientoDisponible('ios', 'apple_health')).toBe(true);
    expect(consentimientoDisponible('android', 'health_connect')).toBe(true);   // UST-16 C3
    expect(consentimientoDisponible('android', 'apple_health')).toBe(false);
    expect(consentimientoDisponible('ios', 'health_connect')).toBe(false);
    expect(consentimientoDisponible('web', 'health_connect')).toBe(false);
    expect(consentimientoDisponible('ios', null)).toBe(false);
  });
});

describe('tipoBiometria — D5 alternativa: Face ID en iPhone, huella o cara en Android', () => {
  it('iOS', () => {
    expect(tipoBiometria([2], 'ios')).toBe('faceid');
    expect(tipoBiometria([1], 'ios')).toBe('touchid');
    expect(tipoBiometria([], 'ios')).toBe('faceOrTouch');
  });
  it('Android', () => {
    expect(tipoBiometria([1], 'android')).toBe('huella');
    expect(tipoBiometria([2], 'android')).toBe('cara');
    expect(tipoBiometria([1, 2], 'android')).toBe('huellaOCara');
    expect(tipoBiometria([3], 'android')).toBe('iris');
    expect(tipoBiometria(null, 'android')).toBe('huellaOCara');
  });
  it('todo identificador tiene respaldo en inglés', () => {
    for (const k of ['faceid', 'touchid', 'faceOrTouch', 'huella', 'cara', 'huellaOCara', 'iris'] as const) {
      expect(BIO_EN[k].length).toBeGreaterThan(0);
    }
  });
  it('clave del título por plataforma', () => {
    expect(claveTituloBio('ios')).toBe('mob.auth.bioTitle');
    expect(claveTituloBio('android')).toBe('mob.auth.bioTitleAndroid');
  });
});

describe('estadoCaptura — la UI nunca dice «adjuntada» si la subida falló', () => {
  it('sin captura → sin; con captura → adjunta; subida fallida → fallo', () => {
    expect(estadoCaptura(null, false)).toBe('sin');
    expect(estadoCaptura('file:///a.jpg', false)).toBe('adjunta');
    expect(estadoCaptura('file:///a.jpg', true)).toBe('fallo');
  });
});
