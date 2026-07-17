import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, font, radius } from '../../theme';
import { useT } from '../../i18n';

function Chevron() {
  // Bold double-chevron "«" — clearly visible back affordance.
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M15 6l-6 6 6 6" stroke={colors.ink} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function Arrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Props = {
  progress: number;            // 0..1
  stepLabel?: string;          // e.g. "2/8"
  showBack?: boolean;
  onBack?: () => void;
  onRestart?: () => void;      // when set, shows a "Start over" control
  nextLabel?: string;
  onNext?: () => void;
  nextFull?: boolean;          // full-width primary button vs small pill
  nextDisabled?: boolean;
  children: React.ReactNode;
};

export function OnboardingLayout({
  progress, stepLabel, showBack = true, onBack, onRestart, nextLabel, onNext,
  nextFull = false, nextDisabled = false, children,
}: Props) {
  const t = useT();
  const rawNextLabel = nextLabel ?? t('ui.next', 'Next');
  // F14: locales ship 'Next →' — we render our own SVG arrow, so strip trailing arrows.
  const resolvedNextLabel = rawNextLabel.replace(/\s*[→›»]+\s*$/, '');
  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.head}>
          {showBack ? (
            <Pressable onPress={onBack} hitSlop={10} style={styles.back}><Chevron /></Pressable>
          ) : <View style={{ width: 42 }} />}
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${Math.max(4, progress * 100)}%` }]} />
          </View>
          <View style={styles.headRight}>
            {stepLabel ? <Text style={styles.step}>{stepLabel}</Text> : null}
            {/* F15: Start over removed from onboarding per PO feedback */}
            {!stepLabel ? <View style={{ width: 30 }} /> : null}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <View style={styles.footer}>
          {nextFull ? (
            <Pressable onPress={onNext} disabled={nextDisabled} style={{ opacity: nextDisabled ? 0.5 : 1 }}>
              <LinearGradient colors={[colors.orange, '#EF4B12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.full}>
                <Text style={styles.fullTxt}>{resolvedNextLabel}</Text><View style={{ width: 8 }} /><Arrow />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable onPress={onNext} disabled={nextDisabled} style={[styles.nextWrap, { opacity: nextDisabled ? 0.5 : 1 }]}>
              <LinearGradient colors={[colors.orange, '#EF4B12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.next}>
                <Text style={styles.nextTxt}>{resolvedNextLabel}</Text><View style={{ width: 7 }} /><Arrow />
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  back: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.6)', overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 8, backgroundColor: colors.orange },
  step: { fontFamily: font.medium, fontSize: 14, color: colors.muted, textAlign: 'right' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end', minWidth: 30 },
  restart: { paddingVertical: 2 },
  restartTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.coral },
  body: { paddingHorizontal: 26, paddingTop: 26, paddingBottom: 20 },
  footer: { paddingHorizontal: 24, paddingBottom: 8, paddingTop: 6 },
  nextWrap: { alignSelf: 'flex-end' },
  next: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 26, height: 52, borderRadius: radius.pill },
  nextTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
  full: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: radius.md },
  fullTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
