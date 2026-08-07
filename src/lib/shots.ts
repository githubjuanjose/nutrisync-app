// NutriSync · shots (r16-F) — la parte PURA del adjunto de feedback.
// Regla r11c-2: lógica con unitarios; el IO (picker + upload) vive en la pantalla.

/** Ruta del screenshot en el bucket feedback-shots: SIEMPRE bajo la carpeta de
 *  la usuaria (la política RLS exige que el primer tramo sea su uid). */
export function buildShotPath(userId: string, ts: number, ext = 'jpg'): string {
  const limpio = (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return `${userId}/${ts}.${limpio}`;
}

/** El picker devuelve uris tipo file://…/IMG_0001.HEIC — extensión normalizada. */
export function extFromUri(uri: string | null | undefined): string {
  const m = String(uri ?? '').match(/\.([A-Za-z0-9]+)(?:\?.*)?$/);
  const e = (m?.[1] ?? 'jpg').toLowerCase();
  return e === 'heic' || e === 'heif' ? 'jpg' : e;   // el picker ya transcodifica a jpg
}
