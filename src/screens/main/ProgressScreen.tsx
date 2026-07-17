import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile } from '../../lib/api';
import { fetchScoreHistory, splitCycles, avg, fetchMoodEnergy, stabilityScore, ScoreRow } from '../../lib/progress';

/**
 * R2-J · Progress (dev-spec core).
 *  · CAS ring fill = exact score/100 (F21b) · 5 live component mini-rings
 *  · label "Movement" not "Fitness" (F20c) · "+X vs last cycle" only with a
 *    completed cycle (F19b) · CSS stability gauge ≠ CAS (F22b) · View History
 *    → dedicated screen (F24b) · hormone weekly graph, Monthly/Yearly honest
 *    empty states (F26b) · no Energy/Mood/PMS frame (F25b) · no bullet tips (F27b).
 */

function Ring({ v, max, size = 54, label }: { v: number; max: number; size?: number; label: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, v / max));
  return (
    <View style={{ alignItems: 'center', width: 62 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F3E7DC" strokeWidth={6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.coral} strokeWidth={6} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={rs.val}>{Math.round(v)}</Text>
      <Text style={rs.lbl} numberOfLines={2}>{label}</Text>
    </View>
  );
}
const rs = StyleSheet.create({
  val: { fontFamily: font.semibold, fontSize: 12, color: colors.ink, marginTop: -36, marginBottom: 22 },
  lbl: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, textAlign: 'center' },
});

/** semicircle gauge: 0..1 → needle across Volatile / Stable / Aligned */
function Gauge({ v }: { v: number | null }) {
  const a = Math.PI * (1 - (v ?? 0.08));
  const nx = 70 + 52 * Math.cos(a), ny = 70 - 52 * Math.sin(a);
  return (
    <Svg width={140} height={84}>
      <Path d="M 10 70 A 60 60 0 0 1 130 70" stroke="#F3E7DC" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Path d="M 10 70 A 60 60 0 0 1 47 17" stroke="#B9A7D9" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Path d="M 50 15 A 60 60 0 0 1 90 15" stroke="#E9C46A" strokeWidth={12} fill="none" strokeLinecap="round" />
      <Path d="M 93 17 A 60 60 0 0 1 130 70" stroke="#7FC08A" strokeWidth={12} fill="none" strokeLinecap="round" />
      {v != null && <Path d={`M 70 70 L ${nx} ${ny}`} stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />}
      <Circle cx={70} cy={70} r={5} fill={colors.ink} />
    </Svg>
  );
}

export default function ProgressScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [hist, setHist] = useState<ScoreRow[]>([]);
  const [css, setCss] = useState<{ score: number | null; n: number }>({ score: null, n: 0 });
  const [hTab, setHTab] = useState<'w' | 'm' | 'y'>('w');

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const [p, h, me] = await Promise.all([getProfile(userId), fetchScoreHistory(userId), fetchMoodEnergy(userId)]);
      setName(p?.first_name ?? ''); setHist(h); setCss(stabilityScore(me)); setLoading(false);
    })();
  }, [userId]));

  if (loading) return <LoadingView />;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayRow = hist.find((r) => r.date === todayISO) ?? null;
  const cycles = splitCycles(hist);
  const completed = cycles.slice(0, -1);                        // last = current
  const lastAvg = completed.length ? avg(completed[completed.length - 1].map((r) => r.cas_total)) : null;
  const bestAvg = completed.length ? Math.max(...completed.map((c) => avg(c.map((r) => r.cas_total)) ?? 0)) : null;
  const cas = todayRow?.cas_total ?? null;
  const delta = cas != null && lastAvg != null ? Math.round(cas - lastAvg) : null;   // F19b

  const comps = todayRow ? [
    { v: todayRow.c1, max: 15, l: t('mob.phaseConfidence', 'Phase\nConfidence') },
    { v: todayRow.c2, max: 25, l: t('mob.biomarkers', 'Biomarkers') },
    { v: todayRow.c3, max: 30, l: t('mob.nutrition', 'Nutrition') },
    { v: todayRow.c4, max: 20, l: t('mob.movement', 'Movement') },   // F20c
    { v: todayRow.c5, max: 10, l: t('mob.logging', 'Logging') },
  ] : null;

  const cssLabel = css.score == null ? t('mob.keepSyncing', 'Keep syncing') : css.score < 0.34 ? t('mob.volatile', 'Volatile') : css.score < 0.67 ? t('mob.stable', 'Stable') : t('mob.aligned', 'Aligned');

  // weekly predicted hormone curves (illustrative, parameterized by cycle position)
  const len = 28;
  const dayNow = todayRow?.cycle_day ?? 1;
  const curve = (fn: (d: number) => number, color: string) => {
    const pts = Array.from({ length: 29 }, (_, i) => {
      const d = dayNow - 3 + (i / 28) * 7;                       // this week window
      const x = 10 + (i / 28) * 280, y = 84 - fn(((d % len) + len) % len) * 64;
      return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return <Path d={pts} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />;
  };
  const estro = (d: number) => Math.max(0.06, Math.exp(-Math.pow(d - (len - 14), 2) / 26) * 0.95 + Math.exp(-Math.pow(d - (len - 5), 2) / 40) * 0.35);
  const proge = (d: number) => Math.max(0.05, Math.exp(-Math.pow(d - (len - 7), 2) / 30));

  const ring = (v: number | null) => {
    const size = 108, r = 46, c = 2 * Math.PI * r, f = v != null ? Math.max(0, Math.min(1, v / 100)) : 0;  // F21b exact
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={54} cy={54} r={r} stroke="#F3E7DC" strokeWidth={10} fill="none" />
          <Circle cx={54} cy={54} r={r} stroke={colors.coral} strokeWidth={10} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 54 54)" />
        </Svg>
        <Text style={styles.bigScore}>{v == null ? '—' : Math.round(v)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.h1}>{t('ui.progress', 'Progress')}</Text>
          <Text style={styles.greet}>{name ? `${t('mob.keepItUp', 'Keep it up')}, ${name}!` : ''}</Text>

          {/* CAS summary */}
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.casTitle}>{t('mob.cycleAlignmentScore', 'Cycle Alignment Score')}</Text>
              {delta != null
                ? <Text style={styles.delta}>{delta >= 0 ? '+' : ''}{delta} {t('mob.vsLastCycle', 'vs last cycle')}</Text>
                : <Text style={styles.deltaMuted}>{completed.length ? '' : t('mob.firstCycleNote', 'Comparisons unlock after your first full cycle')}</Text>}
              <Text style={styles.casHint}>{cas == null ? t('mob.logToBuild', "Log your day to build today's score") : t('mob.updatesLive', 'Updates live as you log')}</Text>
            </View>
            {ring(cas)}
          </View>
          {comps ? (
            <View style={styles.compRow}>{comps.map((c, i) => <Ring key={i} v={c.v} max={c.max} label={c.l} />)}</View>
          ) : null}

          {/* CSS gauge + stats (F22b — distinct from CAS) */}
          <View style={[styles.card, { alignItems: 'center' }]}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={styles.cssTitle}>{t('mob.cycleStability', 'Cycle Stability')}</Text>
              <Gauge v={css.score} />
              <Text style={styles.cssState}>{cssLabel}</Text>
              {css.score == null ? <Text style={styles.cssNote}>{css.n}/7 {t('mob.daysLoggedShort', 'days logged')}</Text> : null}
            </View>
            <View style={styles.statCol}>
              <View style={styles.statLine}><Text style={styles.statLbl}>{t('mob.current', 'Current')}</Text><Text style={styles.statVal}>{cas == null ? '—' : Math.round(cas)}</Text></View>
              <View style={styles.statLine}><Text style={styles.statLbl}>{t('mob.lastCycle', 'Last cycle')}</Text><Text style={styles.statVal}>{lastAvg == null ? '—' : Math.round(lastAvg)}</Text></View>
              <View style={styles.statLine}><Text style={styles.statLbl}>{t('mob.bestScore', 'Best score')}</Text><Text style={styles.statVal}>{bestAvg == null ? '—' : Math.round(bestAvg)}</Text></View>
              <Pressable style={styles.histBtn} onPress={() => navigation.navigate('CASHistory')}>
                <Text style={styles.histBtnTxt}>{t('mob.viewHistory', 'View History')}</Text>
              </Pressable>
            </View>
          </View>

          {/* hormone rhythm — weekly live, monthly/yearly honest empty (F26b) */}
          <View style={styles.card2}>
            <View style={styles.hTabs}>
              {([['w', t('mob.weekly', 'Weekly')], ['m', t('mob.monthly', 'Monthly')], ['y', t('mob.yearly', 'Yearly')]] as const).map(([k, l]) => (
                <Pressable key={k} onPress={() => setHTab(k)}><Text style={[styles.hTab, hTab === k && styles.hTabOn]}>{l}</Text></Pressable>
              ))}
            </View>
            {hTab === 'w' ? (
              <>
                <Svg width="100%" height={96} viewBox="0 0 300 96">
                  {curve(estro, '#E8837B')}
                  {curve(proge, '#B9A7D9')}
                </Svg>
                <View style={styles.legendRow}>
                  <View style={styles.li}><View style={[styles.ld, { backgroundColor: '#E8837B' }]} /><Text style={styles.lt}>{t('mob.estrogen', 'Estrogen')}</Text></View>
                  <View style={styles.li}><View style={[styles.ld, { backgroundColor: '#B9A7D9' }]} /><Text style={styles.lt}>{t('mob.progesterone', 'Progesterone')}</Text></View>
                </View>
              </>
            ) : (
              <View style={styles.lockBox}>
                <Text style={styles.lockIcon}>◔</Text>
                <Text style={styles.lockTxt}>
                  {hTab === 'm'
                    ? t('mob.unlockMonthly', 'Keep syncing to see your monthly trends')
                    : t('mob.unlockYearly', 'Keep syncing to unlock yearly insights')}
                </Text>
                <Text style={styles.lockSub}>{completed.length}/{hTab === 'm' ? 2 : 3} {t('mob.cyclesCompleted', 'cycles completed')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  h1: { fontFamily: font.semibold, fontSize: 28, color: colors.ink },
  greet: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 24, padding: 18, marginTop: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  card2: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  casTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.coral },
  delta: { fontFamily: font.semibold, fontSize: 13, color: '#3E8B63', marginTop: 4 },
  deltaMuted: { fontFamily: font.regular, fontSize: 12, color: colors.faint, marginTop: 4 },
  casHint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
  bigScore: { position: 'absolute', fontFamily: font.bold, fontSize: 26, color: colors.ink },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cssTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  cssState: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginTop: -6 },
  cssNote: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 2 },
  statCol: { width: 128, gap: 6 },
  statLine: { flexDirection: 'row', justifyContent: 'space-between' },
  statLbl: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted },
  statVal: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  histBtn: { marginTop: 8, backgroundColor: colors.coral, borderRadius: 999, height: 38, alignItems: 'center', justifyContent: 'center' },
  histBtnTxt: { fontFamily: font.semibold, fontSize: 13, color: '#fff' },
  hTabs: { flexDirection: 'row', gap: 18, marginBottom: 10 },
  hTab: { fontFamily: font.medium, fontSize: 13, color: colors.faint, paddingVertical: 2 },
  hTabOn: { color: colors.coral, fontFamily: font.semibold, borderBottomWidth: 2, borderBottomColor: colors.coral },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ld: { width: 8, height: 8, borderRadius: 4 },
  lt: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  lockBox: { alignItems: 'center', paddingVertical: 22 },
  lockIcon: { fontSize: 26, color: colors.faint },
  lockTxt: { fontFamily: font.medium, fontSize: 13.5, color: colors.muted, marginTop: 8, textAlign: 'center' },
  lockSub: { fontFamily: font.regular, fontSize: 11.5, color: colors.faint, marginTop: 4 },
});
