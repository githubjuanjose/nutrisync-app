import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

/**
 * Design's soft radial-peach background, matching the web/prototype exactly:
 *   radial-gradient(circle at 28% 16%, #FDE2D6 0%, #FBEFE6 36%, #FFF8F1 62%, #F9D7BD 100%)
 * Light near-white centre, soft peach at the edges — the whole pre-auth journey
 * (Welcome / Login / Create / onboarding) shares this backdrop.
 */
export function PeachBg({ children, style }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  // PWA fix: explicit size — unsized svg defaults to 300×150 on the web.
  const [sz, setSz] = useState<{ w: number; h: number } | null>(null);
  return (
    <View style={[styles.fill, { backgroundColor: '#FBEFE6' }, style]} onLayout={(e) => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {sz ? <Svg width={sz.w} height={sz.h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="peachbg" cx="28%" cy="16%" r="118%">
            <Stop offset="0" stopColor="#FDE2D6" />
            <Stop offset="0.36" stopColor="#FBEFE6" />
            <Stop offset="0.62" stopColor="#FFF8F1" />
            <Stop offset="1" stopColor="#F9D7BD" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#peachbg)" />
      </Svg> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#FFF8F1' },
});
