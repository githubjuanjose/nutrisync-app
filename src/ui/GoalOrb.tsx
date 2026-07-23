import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { font, shadow } from '../theme';

/**
 * R4-F11/F1: NutriGoal bubble with the EXACT radial gradients from the
 * wireframes. Index order matches the canonical NUTRIGOALS list:
 *   0 · Reduce physical PMS symptoms   — FD410C 0% → FF820B 42% → FFA51E 78%
 *   1 · Feel more emotionally balanced — FE7FD4 centre → FF5509 outside
 *   2 · More stable energy …           — FF5813 centre → FF0086 outside
 * Shared by Edit Health (Home → NutriGoals) and the onboarding goal step.
 */
export const GOAL_RADIAL: [string, string][][] = [
  [['0%', '#FD410C'], ['42%', '#FF820B'], ['78%', '#FFA51E'], ['100%', '#FFA51E']],
  [['0%', '#FE7FD4'], ['100%', '#FF5509']],
  [['0%', '#FF5813'], ['100%', '#FF0086']],
];

export function GoalOrb({ index, label, size = 200 }: { index: number; label: string; size?: number }) {
  const stops = GOAL_RADIAL[((index % 3) + 3) % 3];
  const id = `goalGrad${index % 3}`;
  return (
    <View style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {stops.map(([off, c], i) => <Stop key={i} offset={off} stopColor={c} />)}
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
      <Text style={[styles.txt, { paddingHorizontal: size * 0.13, fontSize: size * 0.09 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { alignItems: 'center', justifyContent: 'center', ...shadow.card },
  txt: { fontFamily: font.semibold, color: '#fff', textAlign: 'center', lineHeight: 22 },
});
