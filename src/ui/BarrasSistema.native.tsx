/**
 * UST-15 A6 · Barras del sistema en Android (edge-to-edge, SDK 54).
 *
 * La barra de estado ya la estiliza expo-status-bar; la de NAVEGACIÓN de
 * Android (3 botones o gestos) iba con el estilo por defecto: iconos claros y
 * un scrim del sistema sobre nuestro melocotón. SystemBars la pone oscura
 * sobre fondo transparente. react-native-edge-to-edge viene con expo-status-bar
 * en TODOS los binarios SDK 54 (0.18 → 0.23.1): esto es JS puro, sale por OTA.
 * En iOS no hay barra de navegación del sistema: no se monta nada.
 * Pareja `.tsx` = no-op para web/jest (patrón crash.native.ts, r22).
 */
import React from 'react';
import { Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

export function BarrasSistema(): React.ReactElement | null {
  if (Platform.OS !== 'android') return null;
  return <SystemBars style="dark" />;
}
