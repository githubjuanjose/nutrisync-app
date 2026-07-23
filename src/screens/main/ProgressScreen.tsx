import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { colors, font, radius, shadow, screenGrad } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile, getCurrentCycle } from '../../lib/api';
import { cycleDay, cycleDayActual, phaseForDay, displayPhase } from '../../lib/cas';
import { fetchScoreHistory, splitCycles, avg, fetchMoodEnergy, stabilityScore, seriesStability, fetchPmsRate, ScoreRow } from '../../lib/progress';

/**
 * R3 Batch F · Progress (R3-29…37):
 *  29 — orange hero card ("Progress / Keep it up, {name}!") + PHASE·DAY badge
 *  30 — "↑x vs last cycle" when a completed cycle exists (honest note before)
 *  31 — 4th component ring relabelled "Recovery" (wireframe)
 *  32 — zero-value rings render the full track with an empty arc (no floating dot)
 *  33 — Cycle Stability = simple ring (volatile/stable/aligned) with the score
 *       in the centre + Current / Last cycle / Best beside (speedometer dropped)
 *  34 — Energy Stability / Mood / PMS Symptoms 3-col stat row (real values,
 *       honest "—" until enough logged days)
 *  35 — hormone chart: 4 hormones (Estrogen, LH, FSH, Progesterone) as filled
 *       mountain curves · 37 — Mon–Sun x-labels, today highlighted
 *  36 — W/M/Y segmented pill toggle
 */

function Ring({ v, max, size = 54, label }: { v: number; max: number; size?: number; label: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, v / max));
  return (
    <View style={{ alignItems: 'center', width: 62 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EFDFD2" strokeWidth={6} fill="none" />
        {f > 0.005 ? (  /* R3-32: no arc at zero — full track only, no floating dot */
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.coral} strokeWidth={6} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
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

/** R3-33: simple stability ring — score centre, band colour, volatile/stable/aligned. */
function StabilityRing({ v, label }: { v: number | null; label: string }) {
  const size = 104, r = 44, c = 2 * Math.PI * r;
  const f = v == null ? 0 : Math.max(0.02, Math.min(1, v));
  const col = v == null ? '#EFDFD2' : v < 0.34 ? '#B9A7D9' : v < 0.67 ? '#E9C46A' : '#7FC08A';
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EFDFD2" strokeWidth={9} fill="none" />
        {v != null && (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={9} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontFamily: font.bold, fontSize: 24, color: colors.ink }}>{v == null ? '—' : Math.round(v * 100)}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 10.5, color: colors.muted }}>{label}</Text>
      </View>
    </View>
  );
}

export default function ProgressScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [hist, setHist] = useState<ScoreRow[]>([]);
  const [me, setMe] = useState<{ date: string; mood: number | null; energy: number | null }[]>([]);
  const [pms, setPms] = useState<number | null>(null);
  const [cyc, setCyc] = useState<{ day: number; phase: string } | null>(null);
  const [hTab, setHTab] = useState<'w' | 'm' | 'y'>('w');

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const [p, h, m, pr, c] = await Promise.all([
        getProfile(userId), fetchScoreHistory(userId), fetchMoodEnergy(userId),
        fetchPmsRate(userId).catch(() => null), getCurrentCycle(userId).catch(() => null),
      ]);
      setName(p?.first_name ?? ''); setHist(h); setMe(m); setPms(pr);
      if (c?.last_period_start_date) {
        const len = c.cycle_length ?? 28, dur = c.period_duration ?? 5;
        const d = cycleDayActual(c.last_period_start_date, new Date());
        setCyc({ day: d, phase: displayPhase(phaseForDay(d, len, dur)) });
      }
      setLoading(false);
    })();
  }, [userId]));

  if (loading) return <LoadingView />;

  const css = stabilityScore(me);
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayRow = hist.find((r) => r.date === todayISO) ?? null;
  const cycles = splitCycles(hist);
  const completed = cycles.slice(0, -1);
  const lastAvg = completed.length ? avg(completed[completed.length - 1].map((r) => r.cas_total)) : null;
  const bestAvg = completed.length ? Math.max(...completed.map((c) => avg(c.map((r) => r.cas_total)) ?? 0)) : null;
  const cas = todayRow?.cas_total ?? null;
  const delta = cas != null && lastAvg != null ? Math.round(cas - lastAvg) : null;

  // R3-34: per-metric stat row (last 14 logged days; honest null under 7)
  const eStab = seriesStability(me.filter((x) => x.energy != null).slice(-14).map((x) => x.energy!));
  const mStab = seriesStability(me.filter((x) => x.mood != null).slice(-14).map((x) => x.mood!));

  const comps = todayRow ? [
    { v: todayRow.c1, max: 15, l: t('mob.phaseConfidence', 'Phase\nConfidence') },
    { v: todayRow.c2, max: 25, l: t('mob.biomarkers', 'Biomarkers') },
    { v: todayRow.c3, max: 30, l: t('mob.nutrition', 'Nutrition') },
    { v: todayRow.c4, max: 20, l: t('mob.recovery', 'Recovery') },   // R3-31
    { v: todayRow.c5, max: 10, l: t('mob.logging', 'Logging') },
  ] : null;

  const cssLabel = css.score == null ? t('mob.keepSyncing', 'Keep syncing') : css.score < 0.34 ? t('mob.volatile', 'Volatile') : css.score < 0.67 ? t('mob.stable', 'Stable') : t('mob.aligned', 'Aligned');

  // R3-35: four predicted hormone curves as filled mountains (illustrative,
  // parameterised by cycle position — same shapes the wireframe uses)
  const len = 28;
  const dayNow = todayRow?.cycle_day ?? cyc?.day ?? 1;
  const W = 300, H = 96, X0 = 10, XW = 280, BASE = 88;
  const mountain = (fn: (d: number) => number, color: string, op: number) => {
    let d = '';
    for (let i = 0; i <= 28; i++) {
      const dd = dayNow - 3 + (i / 28) * 7;
      const x = X0 + (i / 28) * XW, y = BASE - fn(((dd % len) + len) % len) * 66;
      d += `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    d += `L ${X0 + XW} ${BASE} L ${X0} ${BASE} Z`;
    return <Path d={d} fill={color} opacity={op} stroke={color} strokeWidth={1.5} />;
  };
  const estro = (d: number) => Math.max(0.06, Math.exp(-Math.pow(d - (len - 14), 2) / 26) * 0.95 + Math.exp(-Math.pow(d - (len - 5), 2) / 40) * 0.35);
  const proge = (d: number) => Math.max(0.05, Math.exp(-Math.pow(d - (len - 7), 2) / 30));
  const lh    = (d: number) => Math.max(0.04, Math.exp(-Math.pow(d - (len - 14), 2) / 4) * 1.0);
  const fsh   = (d: number) => Math.max(0.05, Math.exp(-Math.pow(d - (len - 15), 2) / 12) * 0.6 + Math.exp(-Math.pow(d - 2, 2) / 18) * 0.3);
  const HORM: [string, (d: number) => number, string][] = [
    [t('mob.estrogen', 'Estrogen'), estro, '#E8837B'],
    [t('mob.lh', 'LH'), lh, '#E9C46A'],
    [t('mob.fsh', 'FSH'), fsh, '#7FA8C9'],
    [t('mob.progesterone', 'Progesterone'), proge, '#B9A7D9'],
  ];
  // f37: Mon–Sun labels for this week's window, today highlighted
  const dowIdx = (new Date().getDay() + 6) % 7; // 0 = Monday
  const DOWS = [t('dw.0', 'Mon'), t('dw.1', 'Tue'), t('dw.2', 'Wed'), t('dw.3', 'Thu'), t('dw.4', 'Fri'), t('dw.5', 'Sat'), t('dw.6', 'Sun')];

  const ring = (v: number | null) => {
    const size = 108, r = 46, c = 2 * Math.PI * r, f = v != null ? Math.max(0, Math.min(1, v / 100)) : 0;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={54} cy={54} r={r} stroke="rgba(255,255,255,0.35)" strokeWidth={10} fill="none" />
          {f > 0.005 ? (
            <Circle cx={54} cy={54} r={r} stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round"
              strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 54 54)" />
          ) : null}
        </Svg>
        <Text style={styles.bigScore}>{v == null ? '—' : Math.round(v)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.fill}>
      {/* R4-f2: coral-to-white screen gradient */}
      <LinearGradient colors={screenGrad.colors as any} locations={screenGrad.locations as any} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* R3-29: orange hero card with PHASE·DAY badge + CAS ring inside */}
          <LinearGradient colors={['#FB8A4E', '#F4633A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{t('ui.progress', 'Progress')}</Text>
                <Text style={styles.heroGreet}>{name ? `${t('mob.keepItUp', 'Keep it up')}, ${name}!` : ''}</Text>
              </View>
              {cyc ? (
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseBadgeTxt}>{t('phaseNames.' + cyc.phase, cyc.phase).toUpperCase()} · {t('mob.dayShort', 'DAY')} {cyc.day}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.casTitle}>{t('mob.cycleAlignmentScore', 'Cycle Alignment Score')}</Text>
                {delta != null
                  ? <Text style={styles.delta}>{delta >= 0 ? '↑' : '↓'}{Math.abs(delta)} {t('mob.vsLastCycle', 'vs last cycle')}</Text>
                  : <Text style={styles.deltaMuted}>{completed.length ? '' : t('mob.firstCycleNote', 'Comparisons unlock after your first full cycle')}</Text>}
                <Text style={styles.casHint}>{cas == null ? t('mob.logToBuild', "Log your day to build today's score") : t('mob.updatesLive', 'Updates live as you log')}</Text>
              </View>
              {ring(cas)}
            </View>
          </LinearGradient>

          {comps ? (
            <View style={styles.compRow}>{comps.map((c, i) => <Ring key={i} v={c.v} max={c.max} label={c.l} />)}</View>
          ) : null}

          {/* R3-33: stability ring + Current/Last/Best */}
          <View style={styles.cardRow}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cssTitle}>{t('mob.cycleStability', 'Cycle Stability')}</Text>
              <StabilityRing v={css.score} label={cssLabel} />
              {css.score == null ? <Text style={styles.cssNote}>{css.n}/7 {t('mob.daysLoggedShort', 'days logged')}</Text> : null}
              <View style={styles.bandRow}>
                <View style={styles.bandItem}><View style={[styles.bandDot, { backgroundColor: '#B9A7D9' }]} /><Text style={styles.bandTxt}>{t('mob.volatile', 'Volatile')}</Text></View>
                <View style={styles.bandItem}><View style={[styles.bandDot, { backgroundColor: '#E9C46A' }]} /><Text style={styles.bandTxt}>{t('mob.stable', 'Stable')}</Text></View>
                <View style={styles.bandItem}><View style={[styles.bandDot, { backgroundColor: '#7FC08A' }]} /><Text style={styles.bandTxt}>{t('mob.aligned', 'Aligned')}</Text></View>
              </View>
            </View>
            <View style={styles.statColBox}>
              <View style={styles.statLine}><Text style={styles.statLbl}>{t('mob.current', 'Current')}</Text><Text style={styles.statVal}>{cas == null ? '—' : Math.round(cas)}</Text></View>
              <View style={styles.statLine}><Text style={styles.statLbl}>{t('mob.lastCycle', 'Last cycle')}</Text><Text style={styles.statVal}>{lastAvg == null ? '—' : Math.round(lastAvg)}</Text></View>
              <View style={styles.statLine}><Text style={styles.statLbl}>{t('mob.bestScore', 'Best score')}</Text><Text style={styles.statVal}>{bestAvg == null ? '—' : Math.round(bestAvg)}</Text></View>
              <Pressable style={styles.histBtn} onPress={() => navigation.navigate('CASHistory')}>
                <Text style={styles.histBtnTxt}>{t('mob.viewHistory', 'View History')}</Text>
              </Pressable>
            </View>
          </View>

          {/* R3-34: Energy Stability / Mood / PMS Symptoms */}
          <View style={styles.triRow}>
            {[[t('mob.energyStability', 'Energy Stability'), eStab], [t('mob.mood', 'Mood'), mStab], [t('mob.pmsSymptoms', 'PMS Symptoms'), pms]].map(([l, v]: any, i) => (
              <View key={i} style={styles.triCol}>
                <Text style={styles.triVal}>{v == null ? '—' : `${v}%`}</Text>
                <Text style={styles.triLbl}>{l}</Text>
              </View>
            ))}
          </View>

          {/* hormones — R3-35/36/37 */}
          <View style={styles.card2}>
            <View style={styles.segTabs}>
              {([['w', t('mob.weekly', 'Weekly')], ['m', t('mob.monthly', 'Monthly')], ['y', t('mob.yearly', 'Yearly')]] as const).map(([k, l]) => (
                <Pressable key={k} onPress={() => setHTab(k)} style={[styles.segTab, hTab === k && styles.segTabOn]}>
                  <Text style={[styles.segTabTxt, hTab === k && styles.segTabTxtOn]}>{l}</Text>
                </Pressable>
              ))}
            </View>
            {hTab === 'w' ? (
              <>
                <Svg width="100%" height={110} viewBox="0 0 300 110">
                  {HORM.map(([, fn, col], i) => <React.Fragment key={i}>{mountain(fn, col, 0.32)}</React.Fragment>)}
                </Svg>
                <View style={styles.dowLblRow}>
                  {DOWS.map((d, i) => (
                    <Text key={i} style={[styles.dowLbl, i === dowIdx && styles.dowLblOn]}>{d}</Text>
                  ))}
                </View>
                <View style={styles.legendRow}>
                  {HORM.map(([l, , col], i) => (
                    <View key={i} style={styles.li}><View style={[styles.ld, { backgroundColor: col }]} /><Text style={styles.lt}>{l}</Text></View>
                  ))}
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
  hero: { borderRadius: 28, padding: 20 },
  heroTitle: { fontFamily: font.bold, fontSize: 26, color: '#fff' },
  heroGreet: { fontFamily: font.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  phaseBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  phaseBadgeTxt: { fontFamily: font.semibold, fontSize: 10.5, color: '#fff', letterSpacing: 0.5 },
  casTitle: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
  delta: { fontFamily: font.semibold, fontSize: 13, color: '#D9FFE9', marginTop: 4 },
  deltaMuted: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  casHint: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  bigScore: { position: 'absolute', fontFamily: font.bold, fontSize: 26, color: '#fff' },
  compRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 8, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  cardRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 24, padding: 18, marginTop: 12, alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  card2: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  cssTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, marginBottom: 8 },
  cssNote: { fontFamily: font.regular, fontSize: 11, color: colors.faint, marginTop: 4 },
  bandRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  bandItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bandDot: { width: 6, height: 6, borderRadius: 3 },
  bandTxt: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted },
  statColBox: { width: 126, gap: 6 },
  statLine: { flexDirection: 'row', justifyContent: 'space-between' },
  statLbl: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted },
  statVal: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  histBtn: { marginTop: 8, backgroundColor: colors.coral, borderRadius: 999, height: 38, alignItems: 'center', justifyContent: 'center' },
  histBtnTxt: { fontFamily: font.semibold, fontSize: 13, color: '#fff' },
  triRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  triCol: { flex: 1, alignItems: 'center' },
  triVal: { fontFamily: font.bold, fontSize: 19, color: colors.ink },
  triLbl: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 3, textAlign: 'center' },
  segTabs: { flexDirection: 'row', backgroundColor: '#F6EEE7', borderRadius: 999, padding: 4, gap: 4, marginBottom: 12 },
  segTab: { flex: 1, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segTabOn: { backgroundColor: '#fff', ...shadow.card },
  segTabTxt: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  segTabTxtOn: { color: colors.ink, fontFamily: font.semibold },
  dowLblRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 2 },
  dowLbl: { fontFamily: font.regular, fontSize: 10.5, color: colors.faint, width: 34, textAlign: 'center' },
  dowLblOn: { color: colors.coralDeep, fontFamily: font.semibold },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ld: { width: 8, height: 8, borderRadius: 4 },
  lt: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  lockBox: { alignItems: 'center', paddingVertical: 22 },
  lockIcon: { fontSize: 26, color: colors.faint },
  lockTxt: { fontFamily: font.medium, fontSize: 13.5, color: colors.muted, marginTop: 8, textAlign: 'center' },
  lockSub: { fontFamily: font.regular, fontSize: 11.5, color: colors.faint, marginTop: 4 },
});
