import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { getCurrentCycle } from '../../lib/api';
import { cycleDay, phaseForDay } from '../../lib/cas';
import { saveMovementText } from '../../lib/recs';

/**
 * R2-D · screen 3 — Log Movement. Free-text session log with notes;
 * keyboard-safe (same F31 fix pattern as Meal Log). History icon → screen 4.
 */
export default function LogMovementScreen() {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const log = async () => {
    if (!userId || !text.trim()) return;
    setBusy(true);
    try {
      const cycle = await getCurrentCycle(userId);
      const len = cycle?.cycle_length ?? 28;
      const day = cycle ? cycleDay(cycle.last_period_start_date, new Date(), len) : undefined;
      const phase = day ? phaseForDay(day, len, cycle?.period_duration ?? 5) : undefined;
      await saveMovementText(userId, text.trim(), { day, phase });
      setDone(true); setText('');
      setTimeout(() => setDone(false), 1800);
    } catch {
      // movement_logs migration not applied yet — fail soft
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.movementLog', 'Movement Log')}</Text>
          <Pressable onPress={() => nav.navigate('MovementHistory')} hitSlop={12} style={styles.histBtn}>
            <Text style={styles.histTxt}>🕘</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill} keyboardVerticalOffset={8}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.section}>{t('mob.logYourMovement', 'Log your movement')}</Text>
            <Text style={styles.hint}>{t('mob.moveHint', "Write down what exercise you did and any notes you'd like to keep")}</Text>
            <TextInput
              value={text} onChangeText={setText} multiline
              placeholder={t('mob.movePlaceholder', 'e.g. 30-min brisk walk along the river, felt great…')}
              placeholderTextColor={colors.faint} style={styles.textArea}
            />
            <Pressable onPress={log} disabled={busy || !text.trim()}
              style={[styles.cta, (!text.trim() || busy) && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.ctaTxt}>{done ? '✓ ' + t('mob.logged', 'Logged') : t('mob.logMovementBtn', 'Log movement →')}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24, marginTop: -3 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  histBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  histTxt: { fontSize: 16 },
  section: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 8 },
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 4 },
  textArea: { backgroundColor: colors.white, borderRadius: radius.md, minHeight: 120, padding: 14, marginTop: 10, fontFamily: font.regular, fontSize: 14.5, color: colors.ink, textAlignVertical: 'top', ...shadow.card },
  cta: { marginTop: 18, backgroundColor: colors.coral, borderRadius: radius.pill, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
});
