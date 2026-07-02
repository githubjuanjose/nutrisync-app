import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle, Defs, LinearGradient, Stop, Path, ClipPath, G, Text as SvgText,
} from 'react-native-svg';
import { colors, font, PhaseKey, phaseColor } from '../theme';

type Props = {
  size?: number;
  phase: PhaseKey;
  phaseLabel: string;
  day: number;
  /** fraction of the cycle completed 0..1 → how much of the ring is filled */
  progress?: number;
  /** small day badge value shown on the ring (e.g. cycle length landmark) */
  badge?: number;
};

/** Signature cycle ring: gradient arc + organic "hills" wave fill. */
export function PhaseRing({
  size = 320, phase, phaseLabel, day, progress = 0.82, badge,
}: Props) {
  const cx = 150, cy = 150, r = 128, sw = 22;
  const inner = r - sw / 2 - 4;
  const circ = 2 * Math.PI * r;
  const dash = circ * progress;
  const gap = circ - dash;
  const base = phaseColor[phase];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 300 300">
        <Defs>
          <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.orangeLight} />
            <Stop offset="55%" stopColor={colors.coral} />
            <Stop offset="100%" stopColor={colors.coralDeep} />
          </LinearGradient>
          <LinearGradient id="dishBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FBF3EC" />
            <Stop offset="100%" stopColor="#F6E7DC" />
          </LinearGradient>
          <ClipPath id="dish">
            <Circle cx={cx} cy={cy} r={inner} />
          </ClipPath>
        </Defs>

        {/* track */}
        <Circle cx={cx} cy={cy} r={r} stroke="#F0E5DC" strokeWidth={sw} fill="none" />
        {/* inner dish */}
        <Circle cx={cx} cy={cy} r={inner} fill="url(#dishBg)" />

        {/* organic hill waves, clipped to the dish */}
        <G clipPath="url(#dish)">
          <Path d="M20 210 Q70 150 120 200 T230 195 Q270 180 300 210 V300 H20 Z" fill="#F6A98E" opacity={0.9} />
          <Path d="M20 235 Q80 185 140 225 T260 215 Q285 205 300 230 V300 H20 Z" fill="#EF7C63" opacity={0.9} />
          <Path d="M20 250 Q90 215 150 245 T300 245 V300 H20 Z" fill={colors.coral} opacity={0.92} />
          <Path d="M60 205 Q110 175 150 205 Q190 235 240 205 Q225 250 150 250 Q90 250 60 205 Z" fill="#F19AA8" opacity={0.75} />
        </G>

        {/* progress arc */}
        <Circle
          cx={cx} cy={cy} r={r}
          stroke="url(#arc)" strokeWidth={sw} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={circ * 0.25}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {badge != null && (
          <G>
            <Circle cx={26} cy={cy} r={16} fill={colors.white} />
            <SvgText x={26} y={cy + 4} fontSize={13} fontWeight="700" fill={colors.ovulatory} textAnchor="middle">
              {String(badge)}
            </SvgText>
          </G>
        )}
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.phase}>{phaseLabel}</Text>
        <Text style={styles.day}>DAY {day}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  phase: { fontFamily: font.regular, fontSize: 56, color: colors.ink, lineHeight: 60 },
  day: { fontFamily: font.bold, fontSize: 16, letterSpacing: 3, color: colors.ink, marginTop: 2 },
});
