import React from 'react';
import Svg, { Rect, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

/**
 * R5-f19: the wireframe's missed-day streak marker — exact vector from
 * `Group 1171289068.svg` (blue radial pill with the sleepy Nutri face).
 */
export function StreakOffDot({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (24 / 25)} viewBox="0 0 25 24">
      <Defs>
        <RadialGradient id="streakOffG" cx="50%" cy="50%" r="50%">
          <Stop offset="0.5%" stopColor="#3D5EAD" />
          <Stop offset="92%" stopColor="#48B6FF" />
        </RadialGradient>
      </Defs>
      <Rect opacity={0.75} width={24.3299} height={24} rx={12} fill="url(#streakOffG)" />
      <Path d="M11.7425 11.689C11.7889 11.9442 11.6175 12.064 11.3675 12.1265C10.9621 12.2278 10.785 12.1116 10.3675 12.1265C10.0466 12.1379 9.74246 12.314 9.43 12.189C9.13193 12.0697 9.06062 11.6948 9.17998 11.3765C9.36746 10.8765 9.67996 10.564 10.2425 10.5015C10.5422 10.4682 11.6175 11.0015 11.7425 11.689Z" fill="black" stroke="black" />
      <Path d="M10.9658 11.381C10.7177 11.4204 10.4033 11.9435 10.5283 11.9435C10.6533 11.9435 11.125 11.9375 11.125 11.9375C11.125 11.9375 11.5086 11.8831 11.5283 11.6935C11.5481 11.5039 11.214 11.3415 10.9658 11.381Z" fill="#FF3F56" stroke="#FF3F56" strokeWidth={0.5} />
      <Path d="M8 9.02097C8 9.56167 7.55228 10 7 10C6.44772 10 6 9.56167 6 9.02097C6 8.48027 6.44772 8 7 8C7.55229 8 8 8.48027 8 9.02097Z" fill="black" />
      <Path d="M15 9.02097C15 9.56167 14.5523 10 14 10C13.4477 10 13 9.56167 13 9.02097C13 8.48027 13.4477 8 14 8C14.5523 8 15 8.48027 15 9.02097Z" fill="black" />
    </Svg>
  );
}
