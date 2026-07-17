import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { saveMoodEnergy } from '../../lib/daily';
import { useT } from '../../i18n';

const VALUES = [5, 4, 3, 2, 1];

function Scale({ value, onSelect, tint }: { value: number | null; onSelect: (v: number) => void; tint: 'mood' | 'energy' }) {
  // F25 — slide to log: drag up raises the value, drag down lowers it (taps still work).
  const start = React.useRef({ y: 0, v: 3 });
  const pan = React.useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
    onPanResponderGrant: (e) => { start.current = { y: e.nativeEvent.pageY, v: value ?? 3 }; },
    onPanResponderMove: (e) => {
      const delta = Math.round((start.current.y - e.nativeEvent.pageY) / 26);
      const v = Math.max(1, Math.min(5, start.current.v + delta));
      if (v !== value) onSelect(v);
    },
  })).current;
  const base = tint === 'mood' ? '#4E7B4E' : colors.coral;
  return (
    <View style={{ alignItems: 'center', gap: 10 }} {...pan.panHandlers}>
      {VALUES.map((v) => {
        const on = value != null && v <= value;
        // graduated shade: lower values slightly lighter
        const opacity = on ? 0.55 + (v / 5) * 0.45 : 1;
        return (
          <Pressable key={v} onPress={() => onSelect(v)} style={styles.pillWrap}>
            <View style={[styles.pill, on ? { backgroundColor: base, opacity } : styles.pillOff]} />
            {v === 5 && <Text style={styles.mark5}>5</Text>}
            {v === 1 && <Text style={styles.mark1}>1</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MoodEnergyGate({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [stepEnergy, setStepEnergy] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const onNext = async () => {
    if (!stepEnergy) { setStepEnergy(true); return; }
    if (!userId || mood == null || energy == null) return;
    setBusy(true);
    try {
      await saveMoodEnergy(userId, mood, energy);
      navigation.goBack();
    } catch {
      navigation.goBack();
    }
  };

  const value = stepEnergy ? energy : mood;
  const disabled = value == null || busy;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <View style={styles.brandLockup}>
              <Image source={require('../../../assets/nutri-wings.png')} style={styles.brandMark} resizeMode="contain" />
              <Text style={styles.brand}>NUTRISYNC</Text>
            </View>
            <Text style={styles.title}>{t('mob.beforeSync', "Before we Sync...")}</Text>
          </View>
          <Image source={{ uri: 'https://i.pravatar.cc/100?img=47' }} style={styles.avatar} />
        </View>

        <View style={styles.track}>
          <View style={[styles.seg, { backgroundColor: colors.ink }]} />
          <View style={[styles.seg, { backgroundColor: stepEnergy ? colors.ink : '#E4DAD0' }]} />
        </View>

        <View style={styles.qWrap}>
          <Text style={styles.q}>{stepEnergy ? t('ui.gateTitleEnergy', "how's your energy today?") : t('ui.gateTitleMood', "how's your mood today?")}</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Scale
            value={value}
            tint={stepEnergy ? 'energy' : 'mood'}
            onSelect={(v) => (stepEnergy ? setEnergy(v) : setMood(v))}
          />
        </View>

        <View style={styles.footer}>
          {busy ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Pressable onPress={onNext} disabled={disabled} style={[styles.next, disabled && { opacity: 0.4 }]}>
              <Text style={styles.nextTxt}>{t('ui.next', 'next')}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 22, paddingTop: 8 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  brandMark: { width: 30, height: 30 },
  brand: { fontFamily: font.bold, fontSize: 17, letterSpacing: 1.3, color: colors.ink },
  title: { fontFamily: font.regular, fontSize: 30, color: colors.ink, marginTop: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  track: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, marginTop: 18 },
  seg: { flex: 1, height: 6, borderRadius: 6 },
  qWrap: { alignItems: 'center', marginTop: 22 },
  q: { fontFamily: font.medium, fontSize: 16, color: colors.ink, backgroundColor: '#FBEFE9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  pillWrap: { width: 210, justifyContent: 'center' },
  pill: { height: 62, borderRadius: radius.pill, width: '100%' },
  pillOff: { backgroundColor: colors.white },
  mark5: { position: 'absolute', left: -18, top: 4, fontFamily: font.medium, fontSize: 13, color: colors.muted },
  mark1: { position: 'absolute', left: -18, bottom: 4, fontFamily: font.medium, fontSize: 13, color: colors.muted },
  footer: { alignItems: 'center', paddingBottom: 20, height: 70, justifyContent: 'center' },
  next: { backgroundColor: colors.ink, paddingHorizontal: 40, height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  nextTxt: { fontFamily: font.medium, fontSize: 16, color: colors.white },
});
