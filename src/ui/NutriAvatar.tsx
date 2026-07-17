import React from 'react';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse, Path } from 'react-native-svg';

/** The four Nutri orb variants (shared by Settings picker + Home header — F5). */
export const NUTRI_VARIANTS = [
  { key: 'coral', a: '#FFC27A', b: '#FF5509' },
  { key: 'red', a: '#FF7A4D', b: '#E23A0E' },
  { key: 'pink', a: '#FF8FB0', b: '#E33B7A' },
  { key: 'blue', a: '#FFA84D', b: '#F5641E', halo: '#8CA3FE' },
] as const;

/** Accepts the stored value as a variant key ('coral') or a numeric index ('0'). */
export function pickVariant(v: string | number | null | undefined) {
  if (v == null) return NUTRI_VARIANTS[0];
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!isNaN(n) && NUTRI_VARIANTS[n]) return NUTRI_VARIANTS[n];
  return NUTRI_VARIANTS.find((x) => x.key === String(v)) ?? NUTRI_VARIANTS[0];
}

export function NutriAvatar({ variant, size = 44 }: { variant?: string | number | null; size?: number }) {
  const { a, b, halo } = pickVariant(variant) as any;
  const id = a + b;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={id} cx="38%" cy="33%" r="72%">
          <Stop offset="0.22" stopColor={a} /><Stop offset="0.8" stopColor={b} />
        </RadialGradient>
        {halo && (
          <RadialGradient id={id + 'h'} cx="50%" cy="50%" r="50%">
            <Stop offset="0.5" stopColor={halo} stopOpacity="0.5" /><Stop offset="1" stopColor={halo} stopOpacity="0" />
          </RadialGradient>
        )}
      </Defs>
      {halo && <Circle cx={100} cy={100} r={96} fill={`url(#${id}h)`} />}
      <Circle cx={100} cy={100} r={78} fill={`url(#${id})`} />
      <Ellipse cx={88} cy={90} rx={5.2} ry={7.4} fill="#2A1206" />
      <Ellipse cx={112} cy={90} rx={5.2} ry={7.4} fill="#2A1206" />
      <Path d="M90 108 Q100 117 110 108" stroke="#2A1206" strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
