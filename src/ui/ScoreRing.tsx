import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, font } from '../theme';

/** Circular score ring filled to `value/max`, with the value centered. */
export function ScoreRing({
  value, max = 100, size = 120, stroke = 12, label, small = false,
}: {
  value: number; max?: number; size?: number; stroke?: number; label?: string; small?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const cx = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="sr" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors.orangeLight} />
            <Stop offset="100%" stopColor={colors.coral} />
          </LinearGradient>
        </Defs>
        <Circle cx={cx} cy={cx} r={r} stroke="#F1E4DA" strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx} cy={cx} r={r} stroke="url(#sr)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.val, small && { fontSize: 13 }]}>{Math.round(value)}</Text>
        {label ? <Text style={styles.lbl}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  val: { fontFamily: font.bold, fontSize: 26, color: colors.coral },
  lbl: { fontFamily: font.regular, fontSize: 9, color: colors.muted, marginTop: 1 },
});
