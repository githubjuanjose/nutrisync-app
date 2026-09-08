/**
 * UST-2026-09-08-16 · O3 — UNA sola puerta a la salud del teléfono (C4).
 *
 * Antes, sync.ts y las pantallas llamaban a HealthKit por su nombre y escribían
 * 'apple_health' a mano: en Android la ruta terminaba en NO_CORRIO. Aquí se
 * elige el adaptador de ESTA plataforma y todo lo de arriba deja de saber en
 * qué sistema corre.
 *
 * Es la REGLA DE PARIDAD hecha código (Juanjo, 8-sep: «un desarrollo, dos
 * superficies»): la diferencia vive en una función y en dos adaptadores, nunca
 * en pantallas duplicadas.
 */
import type { RawSample, SignalType } from './mapping';
import { ProveedorSalud, proveedorDePlataforma, nombreProveedor } from './proveedor';
import type { SO } from '../plataforma';
import {
  hkDisponible, hkPedirPermisos, hkLeer, hkPasosPorHora, hkEscribirFlujo, FUENTE_FUSIONADA,
} from './healthkit';
import {
  hcDisponible, hcPedirPermisos, hcLeer, hcPasosPorHora, hcEscribirFlujo, FUENTE_FUSIONADA_HC,
} from './healthconnect';

export type Lectura = { ok: boolean; muestras: RawSample[]; error?: string };
/** `tipos`/`escribir` = lo REALMENTE concedido cuando la plataforma lo dice
 *  (Android sí; Apple no lo revela por privacidad y devuelve lo pedido). */
export type Permisos = { ok: boolean; tipos: SignalType[]; escribir: boolean; error?: string };

export type Adaptador = {
  provider: ProveedorSalud;
  nombre: string;
  /** ¿Dice la plataforma qué permisos concedió? Android sí, Apple no. */
  informaConcesion: boolean;
  fuenteFusionada: string;
  disponible(): Promise<boolean>;
  pedirPermisos(tipos: SignalType[], escribirFlujo: boolean): Promise<Permisos>;
  leer(tipos: SignalType[], desdeISO: string, hastaISO: string): Promise<Lectura>;
  pasosPorHora(desdeISO: string, hastaISO: string): Promise<Lectura>;
  escribirFlujo(diaISO: string, level: number): Promise<{ ok: boolean; saltado?: boolean; error?: string }>;
};

const APPLE: Adaptador = {
  provider: 'apple_health',
  nombre: nombreProveedor('apple_health'),
  informaConcesion: false,
  fuenteFusionada: FUENTE_FUSIONADA,
  disponible: hkDisponible,
  // Apple no cuenta qué concedió (privacidad): se registra la intención y la
  // lectura trae solo lo permitido de verdad — comportamiento de UST-06, intacto.
  pedirPermisos: async (tipos, escribir) => {
    const r = await hkPedirPermisos(tipos, escribir);
    return { ok: r.ok, tipos, escribir, error: r.error };
  },
  leer: hkLeer,
  pasosPorHora: hkPasosPorHora,
  escribirFlujo: hkEscribirFlujo,
};

const ANDROID: Adaptador = {
  provider: 'health_connect',
  nombre: nombreProveedor('health_connect'),
  informaConcesion: true,
  fuenteFusionada: FUENTE_FUSIONADA_HC,
  disponible: hcDisponible,
  pedirPermisos: hcPedirPermisos,
  leer: hcLeer,
  pasosPorHora: hcPasosPorHora,
  escribirFlujo: hcEscribirFlujo,
};

/** El adaptador de esta plataforma (null en web/jest: no hay salud nativa). */
export function adaptadorDe(so: SO): Adaptador | null {
  const p = proveedorDePlataforma(so);
  if (p === 'apple_health') return APPLE;
  if (p === 'health_connect') return ANDROID;
  return null;
}

/** El adaptador de un proveedor concreto — para pantallas que reciben el
 *  proveedor por parámetro (Dispositivos conectados). */
export function adaptadorDeProveedor(provider: string | null | undefined): Adaptador | null {
  if (provider === 'apple_health') return APPLE;
  if (provider === 'health_connect') return ANDROID;
  return null;
}
