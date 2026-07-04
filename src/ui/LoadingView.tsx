import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, font } from '../theme';
import { useT } from '../i18n';

// The mascot "looks around" while loading (exact eye variants from Figma).
const FRAMES = [
  require('../../assets/nutri-orb-front.png'),
  require('../../assets/nutri-orb-left.png'),
  require('../../assets/nutri-orb-front.png'),
  require('../../assets/nutri-orb-right.png'),
];

/** Branded full-screen loader — pulsing Nutri orb that glances around. */
export function LoadingView({ text }: { text?: string }) {
  const t = useT();
  const label = text ?? t('ui.rail1', 'Sync your cycle…');
  const scale = useRef(new Animated.Value(0.94)).current;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.94, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 850);
    return () => clearInterval(id);
  }, [scale]);

  return (
    <View style={styles.fill}>
      <Animated.Image
        source={FRAMES[frame]}
        style={[styles.orb, { transform: [{ scale }] }]}
        resizeMode="contain"
      />
      <Text style={styles.txt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop, alignItems: 'center', justifyContent: 'center' },
  orb: { width: 130, height: 130 },
  txt: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 20 },
});
