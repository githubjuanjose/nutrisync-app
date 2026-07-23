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

/**
 * R4-F1: swipeable goal picker for onboarding — big gradient bubble, arrows,
 * dots; the DISPLAYED orb IS the selection (auto-selects the first option so
 * the step is never ambiguous). Values stay canonical EN; labels translated.
 */
export function GoalCarousel({
  options, selected, onSelect, size = 210,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onSelect: (value: string) => void;
  size?: number;
}) {
  const idx = Math.max(0, options.findIndex((o) => selected.includes(o.value)));
  React.useEffect(() => {
    if (selected.length === 0 && options.length) onSelect(options[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const go = (dir: number) => {
    const next = (idx + dir + options.length) % options.length;
    onSelect(options[next].value);
  };
  const pan = React.useRef<{ current: any }>({ current: null });
  const goRef = React.useRef(go); goRef.current = go;
  if (!pan.current.current) {
    const { PanResponder } = require('react-native');
    pan.current.current = PanResponder.create({
      onMoveShouldSetPanResponder: (_e: any, g: any) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_e: any, g: any) => { if (Math.abs(g.dx) > 30) goRef.current(g.dx < 0 ? 1 : -1); },
    });
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Text onPress={() => go(-1)} style={styles.arrow}>‹</Text>
        <View {...pan.current.current.panHandlers}>
          <GoalOrb index={idx} label={options[idx]?.label ?? ''} size={size} />
        </View>
        <Text onPress={() => go(1)} style={styles.arrow}>›</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
        {options.map((_, i) => (
          <View key={i} style={[styles.dot, i === idx && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { alignItems: 'center', justifyContent: 'center', ...shadow.card },
  txt: { fontFamily: font.semibold, color: '#fff', textAlign: 'center', lineHeight: 22 },
  arrow: { fontSize: 34, color: '#C9B8AC', paddingHorizontal: 10, paddingVertical: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8DACD' },
  dotOn: { backgroundColor: '#F5641E' },
});
