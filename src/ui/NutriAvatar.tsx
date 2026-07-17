import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

/**
 * Official Nutri avatars (approved assets, 17 Jul — Avatar_Selection set).
 * Canonical keys: red · pink · yellow · blue. Legacy stored values map across:
 * 'coral' (old default) → red; numeric indexes 0–3 → [red, pink, yellow, blue].
 */
export const NUTRI_VARIANTS = [
  { key: 'red', src: require('../../assets/nutris/red.png') },
  { key: 'pink', src: require('../../assets/nutris/pink.png') },
  { key: 'yellow', src: require('../../assets/nutris/yellow.png') },
  { key: 'blue', src: require('../../assets/nutris/blue.png') },
] as const;

export function pickVariantIndex(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!isNaN(n) && NUTRI_VARIANTS[n]) return n;
  const key = String(v) === 'coral' ? 'red' : String(v);
  const i = NUTRI_VARIANTS.findIndex((x) => x.key === key);
  return i >= 0 ? i : 0;
}

export function pickVariant(v: string | number | null | undefined) {
  return NUTRI_VARIANTS[pickVariantIndex(v)];
}

export function NutriAvatar({ variant, size = 44, style }: { variant?: string | number | null; size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={pickVariant(variant).src} style={[{ width: size, height: size * (146 / 148) }, style]} resizeMode="contain" />;
}
