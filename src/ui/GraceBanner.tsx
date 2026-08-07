import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, font } from '../theme';
import { useT } from '../i18n';
import { dayState } from '../lib/cycleStats';

/**
 * M-0 → M-1 (Epic M · Cycle Intelligence): banner de estado del ciclo.
 * Tramos (D9 + R10): grace (>avg, tono amable) → awaiting (+3, lo marca el
 * anillo) → drift (+8, aviso de deriva) → care (+14, tono de cuidado con
 * puerta al disclaimer de salud). El ciclo NUNCA se cierra solo — siempre
 * ofrecemos la puerta "registrar período".
 */
export function GraceBanner({ day, len, onLog, onCare, style }: {
  day: number; len: number; onLog: () => void; onCare?: () => void; style?: ViewStyle;
}) {
  const t = useT();
  const st = dayState(day, len);
  if (st === 'normal') return null;

  const care = st === 'care';
  const drift = st === 'drift';
  return (
    <View style={[s.wrap, care && s.wrapCare, style]}>
      <Text style={s.txt}>
        <Text style={s.bold}>{care ? '🫶' : drift ? '🧭' : '⏳'} {t('mob.dayWord', 'Day')} {day} · {t('mob.graceAvg', 'your average is')} {len}. </Text>
        {care
          ? t('mob.careCopy', 'This cycle is running well past your pattern. One long cycle is common — but if this repeats or worries you, checking in with a professional is a good idea.')
          : drift
            ? t('mob.driftCopy', 'This one is drifting past your usual range. Bodies do this — if it becomes your new rhythm, your baseline will adjust automatically.')
            : `${t('mob.graceQ', 'Has your period arrived?')} ${t('mob.graceNorm', 'Cycles vary — that’s normal.')}`}
      </Text>
      <View style={s.row}>
        <Pressable onPress={onLog} style={s.cta}>
          <Text style={s.ctaTxt}>{t('mob.graceCta', 'Log my period')}</Text>
        </Pressable>
        {care && onCare ? (
          <Pressable onPress={onCare} style={s.ghost}>
            <Text style={s.ghostTxt}>{t('mob.careLink', 'Health note')} ›</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#FFF8EF', borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E8B072', padding: 12 },
  wrapCare: { backgroundColor: '#FDF2F4', borderColor: '#E4708A', borderStyle: 'solid' },
  txt: { fontFamily: font.regular, fontSize: 13.5, color: '#7A5A33', lineHeight: 19 },
  bold: { fontFamily: font.semibold, color: '#6A4A26' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  cta: { backgroundColor: colors.coral, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  ctaTxt: { fontFamily: font.semibold, fontSize: 12.5, color: '#fff' },
  ghost: { paddingHorizontal: 6, paddingVertical: 7 },
  ghostTxt: { fontFamily: font.semibold, fontSize: 12.5, color: '#C2566E' },
});
