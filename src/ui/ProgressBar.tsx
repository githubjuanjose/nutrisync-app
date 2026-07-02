import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.max(0, Math.min(1, step / total));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 6, backgroundColor: '#EFE2D7', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.coral },
});
