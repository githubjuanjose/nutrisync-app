import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, font, radius } from '../theme';

export type Option = { value: string; label: string; sub?: string };

type Props = {
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  multi?: boolean;
};

function Check() {
  return (
    <View style={styles.checkSel}>
      <Svg width={13} height={13} viewBox="0 0 24 24">
        <Path d="M5 12l4 4 10-10" stroke={colors.orange} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function SelectList({ options, selected, onToggle }: Props) {
  return (
    <View style={{ gap: 12 }}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        const inner = (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
              {o.sub ? <Text style={[styles.sub, on && styles.subOn]}>{o.sub}</Text> : null}
            </View>
            {on ? <Check /> : <View style={styles.circle} />}
          </View>
        );
        return (
          <Pressable key={o.value} onPress={() => onToggle(o.value)}>
            {on ? (
              <LinearGradient colors={['#F96A1B', '#EF4B12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
                {inner}
              </LinearGradient>
            ) : (
              <View style={[styles.pill, styles.pillOff]}>{inner}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radius.pill, paddingVertical: 16, paddingHorizontal: 22, minHeight: 58, justifyContent: 'center' },
  pillOff: { backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontFamily: font.medium, fontSize: 15.5, color: colors.ink },
  labelOn: { color: colors.white, fontFamily: font.semibold },
  sub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  subOn: { color: 'rgba(255,255,255,0.9)' },
  circle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#D9CFC6' },
  checkSel: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
