import React from 'react';
import { Image } from 'react-native';

/**
 * "Nutri" mascot — the official orb, exported from Figma (NutriBubbleVector).
 * `withHalo` shows the blue-tinted glow variant (onboarding hero); otherwise the plain orb.
 * `withWings` is kept for backward-compat (the Welcome screen composites the wings PNG separately).
 */
const ORB = require('../../assets/nutri-orb.png');
const ORB_HALO = require('../../assets/nutri-orb-halo.png');

export function NutriOrb({
  size = 150,
  withHalo = false,
}: {
  size?: number;
  withHalo?: boolean;
  withWings?: boolean;
}) {
  return (
    <Image
      source={withHalo ? ORB_HALO : ORB}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
