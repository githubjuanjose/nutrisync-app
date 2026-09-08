/**
 * UST-2026-09-08-16 · C10 — el GUARDARRAÍL de la regla de paridad.
 *
 * Juanjo, 8-sep: «las decisiones que se tomaron para iPhone valen para Android
 * […] las aplicaciones tienen que ir parejas en funcionalidades y diseño,
 * siempre a la vez, es React Native, un desarrollo dos superficies».
 *
 * Una convención sin test es una intención (r17-c). Esto es el test:
 *
 *   1. La diferencia de plataforma vive en funciones PURAS (lib/plataforma.ts,
 *      lib/health/proveedor.ts) o en ficheros `.native`. Una pantalla puede
 *      preguntar `Platform.OS` SOLO para pasárselo a una de esas funciones.
 *   2. Cualquier otra condición de plataforma dentro de `src/screens` o
 *      `src/ui` es una EXCEPCIÓN y tiene que estar declarada aquí abajo con
 *      motivo, tipo y —si es temporal— fecha de caducidad.
 *   3. Una excepción TEMPORAL caducada pone el test en rojo. Cuando la razón
 *      desaparece (p. ej. O3 dio a Android su fuente de salud), la entrada
 *      muere o alguien tiene que renovarla a conciencia.
 *   4. Ninguna pantalla puede existir en un solo sistema: nada de
 *      `Pantalla.ios.tsx` sin su gemela.
 *
 * Aquí solo vive la LÓGICA (pura, con unitarios); el recorrido de ficheros lo
 * hace `__tests__/paridad.test.ts`, que es quien lee el disco.
 */

export type TipoExcepcion = 'permanente' | 'temporal';

export type Excepcion = {
  /** Ruta desde `src/`, tal cual. */
  fichero: string;
  /** Trozos de línea que esta excepción ampara (se buscan como subcadena). */
  patrones: string[];
  motivo: string;
  tipo: TipoExcepcion;
  /** Obligatoria si tipo = 'temporal'. ISO YYYY-MM-DD. */
  caduca?: string;
};

/** Llamadas que SÍ son la forma correcta: la plataforma entra en una función
 *  pura y la decisión vive allí, con sus unitarios. No cuentan como excepción. */
export const FORMAS_PERMITIDAS: string[] = [
  'bordesPantalla(Platform.OS',
  'insetInferior(Platform.OS',
  'estadoProveedor(Platform.OS',
  'proveedoresVisibles(Platform.OS',
  'consentimientoDisponible(Platform.OS',
  'tipoBiometria(',                       // recibe Platform.OS como 2º argumento
  'claveTituloBio(Platform.OS',
  'adaptadorDe(Platform.OS',
  'proveedorDePlataforma(Platform.OS',
  'platform: Platform.OS',                // dato que se envía (feedback), no una rama de UI
  // La frontera con la WEB no rompe la paridad: la PWA es otra superficie (sin
  // módulos nativos) y separar «nativo» de «navegador» no separa iPhone de Android.
  "Platform.OS !== 'web'",
  "Platform.OS === 'web'",
];

/** El REGISTRO. Todo lo que no esté aquí y no sea una forma permitida, rojo. */
export const EXCEPCIONES: Excepcion[] = [
  {
    fichero: 'screens/settings/FeedbackScreen.tsx',
    patrones: ["behavior={Platform.OS === 'ios'"],
    motivo: 'KeyboardAvoidingView: en Android el teclado lo resuelve adjustResize del sistema y «padding» lo rompe (UST-15 A7). Es una diferencia REAL del sistema operativo, no de diseño.',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/main/MealLogScreen.tsx',
    patrones: ["behavior={Platform.OS === 'ios'"],
    motivo: 'Mismo caso del teclado (UST-15 A7).',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/main/EditPeriodScreen.tsx',
    patrones: ["behavior={Platform.OS === 'ios'"],
    motivo: 'Mismo caso del teclado (UST-15 A7).',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/main/LogMovementScreen.tsx',
    patrones: ["behavior={Platform.OS === 'ios'"],
    motivo: 'Mismo caso del teclado (UST-15 A7).',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/onboarding/AuthScreen.tsx',
    patrones: ["behavior={Platform.OS === 'ios'", "{Platform.OS === 'ios' ? ("],
    motivo: 'Teclado (A7) y «Sign in with Apple»: Apple EXIGE su botón en iOS y no existe en Android, donde el mismo sitio ofrece correo y Google.',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/settings/CycleHealthScreen.tsx',
    patrones: ["display={Platform.OS === 'ios'", "if (Platform.OS !== 'ios')", "{showStart && Platform.OS === 'ios' ?"],
    motivo: 'El selector de fecha nativo: iOS lo pinta en línea y se queda abierto; Android abre un diálogo modal que se cierra solo. Es la API del sistema, no una decisión de producto.',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/settings/PersonalInfoScreen.tsx',
    patrones: ["display={Platform.OS === 'ios'", "if (Platform.OS !== 'ios')", "{showDob && Platform.OS === 'ios' ?"],
    motivo: 'Mismo selector de fecha nativo.',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/onboarding/OnboardingWizard.tsx',
    patrones: ["display={Platform.OS === 'ios'", "if (Platform.OS !== 'ios')"],
    motivo: 'Mismo selector de fecha nativo: en Android el diálogo se cierra solo y hay que bajar el estado a mano.',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/settings/SecurityScreen.tsx',
    patrones: ["Platform.OS === 'ios' ? nombreBio"],
    motivo: 'D5 (alternativa, firmada en UST-15): en iPhone se conservan las marcas de Apple («Face ID») y en Android se habla de huella o cara. El NOMBRE ya sale de tipoBiometria (pura); esto es solo la frase que lo envuelve.',
    tipo: 'permanente',
  },
  {
    fichero: 'ui/BioLock.tsx',
    patrones: ["if (Platform.OS !== 'android' || state !== 'locked')"],
    motivo: 'El botón ATRÁS del sistema solo existe en Android: con la app bloqueada hay que absorberlo o se sale del bloqueo (UST-15 C5). En iPhone no hay nada que absorber.',
    tipo: 'permanente',
  },
  {
    fichero: 'ui/BarrasSistema.native.tsx',
    patrones: ["if (Platform.OS !== 'android') return null;"],
    motivo: 'Las barras del sistema en modo edge-to-edge son un asunto de Android (SDK 54 lo fuerza); iOS no tiene equivalente y no debe tocarse (D1 de UST-15: «el iPhone no cambia»).',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/settings/HealthConsentScreen.tsx',
    patrones: ["Platform.OS !== 'android'"],
    motivo: 'El estado del SDK (instalar / actualizar / listo) solo existe en Health Connect: en iPhone no hay nada que consultar. La decisión de QUÉ enseñar es de estadoSdk (pura).',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/settings/HealthRationaleScreen.tsx',
    patrones: ["esHC && Platform.OS === 'android'"],
    motivo: 'El botón «gestionar permisos» abre los ajustes de Health Connect, que solo existen en Android; en iPhone la gestión vive en la app Salud y ya se explica en el texto.',
    tipo: 'permanente',
  },
  {
    fichero: 'screens/settings/ConnectedDevicesScreen.tsx',
    patrones: ["{Platform.OS === 'android'"],
    motivo: 'TEMPORAL: la nota al pie explica que en Android es el sistema quien concede señal a señal. Se unifica en un texto único cuando Lucía revise los textos de la 0.24.0.',
    tipo: 'temporal',
    caduca: '2026-10-15',
  },
];

/* ── Lógica pura ─────────────────────────────────────────────────────────── */

/** ¿Esta línea es una de las formas correctas (plataforma → función pura)? */
export function esFormaPermitida(linea: string, formas: readonly string[] = FORMAS_PERMITIDAS): boolean {
  return formas.some((f) => linea.includes(f));
}

export type Hallazgo = { fichero: string; linea: number; texto: string };

/** Condiciones de plataforma de un fichero que NO son forma permitida. */
export function condicionesCrudas(fichero: string, fuente: string): Hallazgo[] {
  const out: Hallazgo[] = [];
  fuente.split('\n').forEach((l, i) => {
    if (!l.includes('Platform.OS')) return;
    const limpia = l.trim();
    if (limpia.startsWith('*') || limpia.startsWith('//')) return;   // comentarios explican, no ejecutan (r17-g)
    if (esFormaPermitida(l)) return;
    out.push({ fichero, linea: i + 1, texto: limpia });
  });
  return out;
}

/** Hallazgos sin entrada en el registro: eso es lo que rompe la paridad. */
export function sinDeclarar(hallazgos: readonly Hallazgo[], registro: readonly Excepcion[] = EXCEPCIONES): Hallazgo[] {
  return hallazgos.filter((h) => {
    const e = registro.filter((x) => x.fichero === h.fichero);
    return !e.some((x) => x.patrones.some((p) => h.texto.includes(p)));
  });
}

/** Entradas del registro que ya no amparan nada: deuda muerta que hay que borrar. */
export function excepcionesHuerfanas(hallazgos: readonly Hallazgo[], registro: readonly Excepcion[] = EXCEPCIONES): Excepcion[] {
  return registro.filter((x) =>
    !hallazgos.some((h) => h.fichero === x.fichero && x.patrones.some((p) => h.texto.includes(p))));
}

/** Temporales caducadas (o mal declaradas, sin fecha). Rojo a propósito: es lo
 *  que obliga a que una diferencia «provisional» tenga fecha de muerte. */
export function excepcionesCaducadas(hoyISO: string, registro: readonly Excepcion[] = EXCEPCIONES): Excepcion[] {
  return registro.filter((x) => {
    if (x.tipo !== 'temporal') return false;
    if (!x.caduca) return true;                 // temporal sin caducidad = no declarada
    return x.caduca < hoyISO;
  });
}

/** Ficheros que existen en una sola plataforma. `.native` es la frontera web
 *  (r22) y siempre lleva su pareja plana; `.ios`/`.android` no se admiten en
 *  pantallas: una pantalla que solo existe en un sistema es la deriva que esta
 *  regla persigue. */
export function pantallasDeUnaSolaPlataforma(ficheros: readonly string[]): string[] {
  const malas = ficheros.filter((f) => /\.(ios|android)\.(tsx|ts)$/.test(f));
  const sinPareja = ficheros
    .filter((f) => /\.native\.(tsx|ts)$/.test(f))
    .filter((f) => !ficheros.includes(f.replace(/\.native\./, '.')));
  return [...malas, ...sinPareja];
}
