import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, radius } from '../theme';

/** UST-15 C8: respuesta táctil en Android (ripple suave); en iOS se ignora. */
const RIPPLE = { color: 'rgba(0,0,0,0.08)', borderless: false } as const;

type Props = {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} android_ripple={RIPPLE} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, style]}>
      <LinearGradient
        colors={[colors.orange, colors.orangeLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primary}
      >
        <Text style={styles.primaryTxt}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={RIPPLE}
      style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.9 : 1 }, style]}
    >
      <Text style={styles.secondaryTxt}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 58,
    borderRadius: 999, // fully rounded / semicircular ends (pill)
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTxt: { color: colors.white, fontFamily: font.semibold, fontSize: 16 },
  secondary: {
    height: 58,
    borderRadius: 999, // pill
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryTxt: { color: colors.ink, fontFamily: font.semibold, fontSize: 16 },
});
