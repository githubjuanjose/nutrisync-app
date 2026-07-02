import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font } from '../theme';

/**
 * Temporary stub used for screens not yet implemented from Figma.
 * Each one is navigable so the full flow can be walked in Expo Go.
 */
export function makePlaceholder(title: string, nextLabel?: string, next?: string) {
  return function PlaceholderScreen({ navigation }: any) {
    return (
      <SafeAreaView style={styles.fill}>
        <View style={styles.center}>
          <Text style={styles.badge}>SCREEN</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.note}>Pixel-accurate build from Figma in progress.</Text>
          {next && (
            <Pressable style={styles.btn} onPress={() => navigation.navigate(next)}>
              <Text style={styles.btnTxt}>{nextLabel ?? 'Continue'}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  };
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  badge: { fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: colors.coral },
  title: { fontFamily: font.display, fontSize: 26, color: colors.ink, marginTop: 10, textAlign: 'center' },
  note: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 8, textAlign: 'center' },
  btn: {
    marginTop: 26,
    backgroundColor: colors.coral,
    paddingHorizontal: 28,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { color: colors.white, fontFamily: font.semibold, fontSize: 15 },
});
