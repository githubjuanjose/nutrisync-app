import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, font, radius } from '../theme';

/** Multi/single select chip group (Edit Period symptom pills). */
export function ChipGroup({
  title, options, selected, onToggle, single = false,
}: {
  title?: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <View style={{ marginTop: title ? 14 : 0 }}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.wrap}>
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <Pressable key={o} onPress={() => onToggle(o)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.txt, on && styles.txtOn]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.semibold, fontSize: 16, color: colors.ink, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white,
    borderRadius: radius.pill, paddingHorizontal: 14, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  txt: { fontFamily: font.regular, fontSize: 13.5, color: colors.ink },
  txtOn: { color: colors.white, fontFamily: font.medium },
});
