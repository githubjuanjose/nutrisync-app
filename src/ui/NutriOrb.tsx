import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, Ellipse } from 'react-native-svg';

/**
 * "Nutri" mascot — orange orb with dot eyes.
 * Gradients are the EXACT values exported from Figma:
 *   orb  : #FF9269 → #FF5509
 *   halo : #FF7002 → #8CA3FE → #FFFAF6  (the signature blue-tinted glow)
 */
export function NutriOrb({
  size = 150,
  withWings = false,
  withHalo = false,
}: {
  size?: number;
  withWings?: boolean;
  withHalo?: boolean;
}) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          {/* exact orb gradient, focal offset up-left for the sheen */}
          <RadialGradient id="orb" cx="38%" cy="33%" r="72%">
            <Stop offset="0.22" stopColor="#FF9269" />
            <Stop offset="0.77" stopColor="#FF5509" />
          </RadialGradient>
          {/* exact halo gradient */}
          <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0.42" stopColor="#FF7002" stopOpacity="0.9" />
            <Stop offset="0.72" stopColor="#8CA3FE" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#FFFAF6" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {withHalo && <Circle cx={100} cy={102} r={96} fill="url(#halo)" />}

        {withWings && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Path
                key={i}
                d={`M ${118 - i * 4} ${100 - i * 2}
                    C ${70 - i * 8} ${82 - i * 6}, ${40 - i * 6} ${68 - i * 10}, ${14 + i * 2} ${46 - i * 6}
                    C ${48 - i * 4} ${74 - i * 4}, ${86 - i * 6} ${90 - i * 3}, ${120 - i * 3} ${104 - i * 2} Z`}
                fill="#0E0C0B"
              />
            ))}
          </>
        )}

        {/* orb */}
        <Circle cx={100} cy={102} r={64} fill="url(#orb)" />
        {/* dot eyes */}
        <Ellipse cx={90} cy={94} rx={4.2} ry={6} fill="#2A1206" />
        <Ellipse cx={110} cy={94} rx={4.2} ry={6} fill="#2A1206" />
        {/* subtle smile */}
        <Path d="M92 108 Q100 115 108 108" stroke="#2A1206" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
