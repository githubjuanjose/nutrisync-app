import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
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

/** R4-f24: thinner stroke, lighter labels · R4-F18: tappable → explainer modal */
function Ring({ v, max, size = 54, label, onPress }: { v: number; max: number; size?: number; label: string; onPress?: () => void }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, v / max));
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: 62 }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F3E7DC" strokeWidth={4.5} fill="none" />
        {f > 0.005 ? (  /* R3-32: no arc at zero — full track only, no floating dot */
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.coral} strokeWidth={4.5} fill="none" strokeLinecap="round"
            strokeDasharray={`${c * f} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      <Text style={rs.val}>{Math.round(v)}</Text>
      <Text style={rs.lbl} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}
const rs = StyleSheet.create({
  val: { fontFamily: font.medium, fontSize: 12, color: colors.ink, marginTop: -36, marginBottom: 22 },
  lbl: { fontFamily: font.regular, fontSize: 9.5, color: colors.faint, textAlign: 'center' },
});

/** R4-f22/f25: continuous red→orange→yellow gradient arc (also in low-data
 *  states), white knob at the score position, zone words around the ring —
 *  no discrete legend dots, no purple/green. */
const GAUGE_STOPS: [number, string][] = [[0, '#E0442A'], [0.5, '#F0813C'], [1, '#F3C64F']];
function gaugeColor(k: number): string {
  const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let i = 0; i < GAUGE_STOPS.length - 1; i++) {
    const [t0, c0] = GAUGE_STOPS[i], [t1, c1] = GAUGE_STOPS[i + 1];
    if (k >= t0 && k <= t1) {
      const f = (k - t0) / (t1 - t0), a = hx(c0), b = hx(c1);
      return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
    }
  }
  return GAUGE_STOPS[k <= 0 ? 0 : GAUGE_STOPS.length - 1][1];
}
function StabilityRing({ v, label }: { v: number | null; label: string }) {
  const size = 104, r = 44, C = size / 2, N = 40;
  const pt = (t: number) => {
    const a = (t * 360 - 90) * (Math.PI / 180);
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
  };
  const segs = Array.from({ length: N }, (_, i) => {
    const t0 = i / N, t1 = (i + 1) / N + 0.003;
    const p0 = pt(t0), p1 = pt(t1);
    return { d: `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y}`, c: gaugeColor(i / (N - 1)) };
  });
  const knob = v != null ? pt(Math.max(0.02, Math.min(1, v))) : null;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {segs.map((s, i) => <Path key={i} d={s.d} stroke={s.c} strokeWidth={9} fill="none" />)}
        {knob ? (<>
          <Circle cx={knob.x} cy={knob.y} r={8} fill="#fff" />
          <Circle cx={knob.x} cy={knob.y} r={8} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
        </>) : null}
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
  const [compInfo, setCompInfo] = useState<number | null>(null);   // R4-F18

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

  // R4-F18: each component carries the founders' explainer copy (what it
  // measures + the concrete action that raises it) for the tap-to-expand modal
  const comps = todayRow ? [
    { v: todayRow.c1, max: 15, l: t('mob.phaseConfidence', 'Phase\nConfidence'), title: t('mob.phaseConfidence1', 'Phase Confidence'),
      body: t('mob.c1Body', "How sure we are about your current phase. This gets stronger the more consistently you log your cycle dates. Keep your period start/end current in Calendar, and confidence builds automatically as you complete full cycles.") },
    { v: todayRow.c2, max: 25, l: t('mob.biomarkers', 'Biomarkers'), title: t('mob.biomarkers', 'Biomarkers'),
      body: t('mob.c2Body', "How well your logged signals match your expected phase patterns. Log Energy Stability, Mood, and PMS Symptoms daily — accuracy (and this score) improves as you complete more full cycles.") },
    { v: todayRow.c3, max: 30, l: t('mob.nutrition', 'Nutrition'), title: t('mob.nutrition', 'Nutrition'),
      body: t('mob.c3Body', "Based entirely on your Nutri Basics checklist. Keep checking off your daily items to hold it at full marks.") },
    /* R5-F24: renamed Recovery → Movement (founders) */
    { v: todayRow.c4, max: 20, l: t('mob.movementLbl', 'Movement'), title: t('mob.movementLbl', 'Movement'),
      body: t('mob.c4Body', "Movement is pass/fail: logging just one exercise in a day earns full credit. Log at least one Movement Log entry daily to close the gap. No need for more than one.") },
    { v: todayRow.c5, max: 10, l: t('mob.logging', 'Logging'), title: t('mob.logging', 'Logging'),
      body: t('mob.c5Body', "Tracks how consistently you're logging overall, separate from your checklists. Add more Meal Log and Movement Log notes. Consistency matters more than volume here.") },
  ] : null;

  const cssLabel = css.score == null ? t('mob.keepSyncing', 'Keep syncing') : css.score < 0.34 ? t('mob.volatile', 'Volatile') : css.score < 0.67 ? t('mob.stable', 'Stable') : t('mob.aligned', 'Aligned');

  // R3-35: four predicted hormone curves as filled mountains (illustrative,
  // parameterised by cycle position — same shapes the wireframe uses)
  const len = 28;
  const dayNow = todayRow?.cycle_day ?? cyc?.day ?? 1;
  const W = 300, H = 96, X0 = 10, XW = 280, BASE = 88;
  // R4-F19: smooth hill with a gradient fill (id = horm{idx}) + solid stroke
  const mountain = (fn: (d: number) => number, color: string, idx: number) => {
    let d = '';
    for (let i = 0; i <= 28; i++) {
      const dd = dayNow - 3 + (i / 28) * 7;
      const x = X0 + (i / 28) * XW, y = BASE - fn(((dd % len) + len) % len) * 66;
      d += `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    const line = d;
    d += `L ${X0 + XW} ${BASE} L ${X0} ${BASE} Z`;
    return (
      <>
        <Path d={d} fill={`url(#horm${idx})`} />
        <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </>
    );
  };
  const estro = (d: number) => Math.max(0.06, Math.exp(-Math.pow(d - (len - 14), 2) / 26) * 0.95 + Math.exp(-Math.pow(d - (len - 5), 2) / 40) * 0.35);
  const proge = (d: number) => Math.max(0.05, Math.exp(-Math.pow(d - (len - 7), 2) / 30));
  const lh    = (d: number) => Math.max(0.04, Math.exp(-Math.pow(d - (len - 14), 2) / 4) * 1.0);
  const fsh   = (d: number) => Math.max(0.05, Math.exp(-Math.pow(d - (len - 15), 2) / 12) * 0.6 + Math.exp(-Math.pow(d - 2, 2) / 18) * 0.3);
  // R5-F6: exact hex palette from the round-5 spec
  const HORM: [string, (d: number) => number, string][] = [
    [t('mob.estrogen', 'Estrogen'), estro, '#FF5343'],      // FF5343E5 (≈90%)
    [t('mob.lh', 'LH'), lh, '#FF5343'],
    [t('mob.fsh', 'FSH'), fsh, '#FF7926'],
    [t('mob.progesterone', 'Progesterone'), proge, '#FFC049'],
  ];
  // f37: Mon–Sun labels for this week's window, today highlighted
  const dowIdx = (new Date().getDay() + 6) % 7; // 0 = Monday
  const DOWS = [t('dw.0', 'Mon'), t('dw.1', 'Tue'), t('dw.2', 'Wed'), t('dw.3', 'Thu'), t('dw.4', 'Fri'), t('dw.5', 'Sat'), t('dw.6', 'Sun')];

  // R4-f23: coral arc on a light track, score in DARK text (lives in the white card now)
  const ring = (v: number | null) => {
    const size = 108, r = 46, c = 2 * Math.PI * r, f = v != null ? Math.max(0, Math.min(1, v / 100)) : 0;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={54} cy={54} r={r} stroke="#F3E3D8" strokeWidth={10} fill="none" />
          {f > 0.005 ? (
            <Circle cx={54} cy={54} r={r} stroke={colors.coral} strokeWidth={10} fill="none" strokeLinecap="round"
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
          {/* R4-f28: FLAT solid coral header — title + greet + PHASE·DAY only */}
          <View style={styles.hero}>
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
          </View>

          {/* R4-f23: the score lives in its OWN white/cream card below the header —
              coral arc, dark score, comparison text in green once data exists */}
          <View style={styles.scoreCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.casTitle}>{t('mob.cycleAlignmentScore', 'Cycle Alignment Score')}</Text>
              {delta != null
                ? <Text style={styles.delta}>{delta >= 0 ? '↑' : '↓'}{Math.abs(delta)} {t('mob.vsLastCycle', 'vs last cycle')}</Text>
                : <Text style={styles.deltaMuted}>{completed.length ? '' : t('mob.firstCycleNote', 'Comparisons unlock after your first full cycle')}</Text>}
              <Text style={styles.casHint}>{cas == null ? t('mob.logToBuild', "Log your day to build today's score") : t('mob.updatesLive', 'Updates live as you log')}</Text>
            </View>
            {ring(cas)}
          </View>

          {comps ? (
            <View style={styles.compRow}>{comps.map((c, i) => <Ring key={i} v={c.v} max={c.max} label={c.l} onPress={() => setCompInfo(i)} />)}</View>
          ) : null}


          {/* R3-33: stability ring + Current/Last/Best */}
          <View style={styles.cardRow}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cssTitle}>{t('mob.cycleStability', 'Cycle Stability')}</Text>
              <StabilityRing v={css.score} label={cssLabel} />
              {css.score == null ? <Text style={styles.cssNote}>{css.n}/7 {t('mob.daysLoggedShort', 'days logged')}</Text> : null}
              {/* R4-f22/f25: zone words only (wireframe order), no coloured dots */}
              <View style={styles.bandRow}>
                <Text style={styles.bandTxt}>{t('mob.volatile', 'volatile')}</Text>
                <Text style={styles.bandTxt}>·</Text>
                <Text style={styles.bandTxt}>{t('mob.aligned', 'aligned')}</Text>
                <Text style={styles.bandTxt}>·</Text>
                <Text style={styles.bandTxt}>{t('mob.stable', 'stable')}</Text>
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
                {/* R4-f21: populated values render in green */}
                <Text style={[styles.triVal, v != null && { color: '#2D9E63' }]}>{v == null ? '—' : `${v}%`}</Text>
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
                {/* R4-F19: legend ABOVE the chart */}
                <View style={[styles.legendRow, { marginTop: 0, marginBottom: 8 }]}>
                  {HORM.map(([l, , col], i) => (
                    <View key={i} style={styles.li}><View style={[styles.ld, { backgroundColor: col }]} /><Text style={styles.lt}>{l}</Text></View>
                  ))}
                </View>
                <Svg width="100%" height={110} viewBox="0 0 300 110">
                  {/* R4-F19: gradient hills — each fill fades to transparent underneath */}
                  <Defs>
                    {HORM.map(([, , col], i) => (
                      <SvgLinearGradient key={i} id={`horm${i}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={col} stopOpacity={0.55} />
                        <Stop offset="100%" stopColor={col} stopOpacity={0} />
                      </SvgLinearGradient>
                    ))}
                  </Defs>
                  {HORM.map(([, fn, col], i) => <React.Fragment key={i}>{mountain(fn, col, i)}</React.Fragment>)}
                </Svg>
                <View style={styles.dowLblRow}>
                  {DOWS.map((d, i) => (
                    <Text key={i} style={[styles.dowLbl, i === dowIdx && styles.dowLblOn]}>{d}</Text>
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

        {/* R4-F18: tap-to-expand component explainer (full-screen overlay) */}
        {compInfo != null && comps ? (
          <View style={styles.modalWrap}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCompInfo(null)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(28,23,21,.45)' }} />
            </Pressable>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{comps[compInfo].title}</Text>
              <Text style={styles.modalScore}>{Math.round(comps[compInfo].v)}/{comps[compInfo].max}</Text>
              <Text style={styles.modalBody}>{comps[compInfo].body}</Text>
              <Pressable onPress={() => setCompInfo(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseTxt}>{t('ui.gotIt', 'Got it')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  hero: { borderRadius: 28, padding: 20, backgroundColor: '#E4572E' },  // R4-f28: flat solid coral
  // R4-f23: separate score card
  scoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF8', borderRadius: 24, padding: 18, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  // R4-F18 modal
  modalWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  modalCard: { width: '84%', backgroundColor: '#fff', borderRadius: 24, padding: 24, ...shadow.card },
  modalTitle: { fontFamily: font.bold, fontSize: 19, color: colors.ink },
  modalScore: { fontFamily: font.bold, fontSize: 15, color: '#E4572E', marginTop: 4 },
  modalBody: { fontFamily: font.regular, fontSize: 14, color: colors.body, lineHeight: 21, marginTop: 12 },
  modalClose: { alignSelf: 'stretch', backgroundColor: colors.coral, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  modalCloseTxt: { fontFamily: font.semibold, fontSize: 14, color: '#fff' },
  heroTitle: { fontFamily: font.bold, fontSize: 26, color: '#fff' },
  heroGreet: { fontFamily: font.regular, fontSize: 13.5, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  phaseBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  phaseBadgeTxt: { fontFamily: font.semibold, fontSize: 10.5, color: '#fff', letterSpacing: 0.5 },
  // R4-f23: dark text on the white card; comparison green
  casTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  delta: { fontFamily: font.semibold, fontSize: 13, color: '#2D9E63', marginTop: 4 },
  deltaMuted: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  casHint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
  bigScore: { position: 'absolute', fontFamily: font.bold, fontSize: 26, color: colors.ink },
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
  statVal: { fontFamily: font.bold, fontSize: 13.5, color: '#E4572E' },  // R4-f20
  histBtn: { marginTop: 8, backgroundColor: colors.coral, borderRadius: 999, height: 38, alignItems: 'center', justifyContent: 'center' },
  histBtnTxt: { fontFamily: font.semibold, fontSize: 13, color: '#fff' },
  triRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  triCol: { flex: 1, alignItems: 'center' },
  triVal: { fontFamily: font.bold, fontSize: 19, color: colors.ink },
  triLbl: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 3, textAlign: 'center' },
  segTabs: { flexDirection: 'row', backgroundColor: '#F6EEE7', borderRadius: 999, padding: 4, gap: 4, marginBottom: 12 },
  segTab: { flex: 1, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segTabOn: {},  // R4-f27: no pill behind the active tab
  segTabTxt: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  segTabTxtOn: { color: colors.coral, fontFamily: font.bold },  // R4-f27: bold coral text
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
