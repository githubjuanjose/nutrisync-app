import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { colors, font } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { fetchScoreHistory, splitCycles, avg, ScoreRow } from '../../lib/progress';

/**
 * R2-J · CAS History (F24b) — Weekly / Monthly / Yearly with the dev-spec's
 * progressive unlock: Weekly after 1 completed cycle, Monthly after 2, Yearly
 * after ~3 months of data. Locked tabs stay visible with encouraging empty
 * states; everything shown is computed from real daily_scores — never fabricated.
 */

const PHASE_COL: Record<string, string> = { menstrual: '#E8837B', follicular: '#A8C3A0', ovulatory: '#E9C46A', luteal: '#B9A7D9', early_luteal: '#B9A7D9', late_luteal: '#B9A7D9' };

function MiniRing({ v, label }: { v: number | null; label: string }) {
  const r = 26, c = 2 * Math.PI * r, f = v != null ? v / 100 : 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={64} height={64}>
        <Circle cx={32} cy={32} r={r} stroke="#F3E7DC" strokeWidth={7} fill="none" />
        <Circle cx={32} cy={32} r={r} stroke={colors.coral} strokeWidth={7} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 32 32)" />
      </Svg>
      <Text style={s.mrVal}>{v == null ? '—' : Math.round(v)}</Text>
      <Text style={s.mrLbl}>{label}</Text>
    </View>
  );
}

export default function CASHistoryScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [hist, setHist] = useState<ScoreRow[]>([]);
  const [tab, setTab] = useState<'w' | 'm' | 'y'>('w');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchScoreHistory(userId).then((h) => { setHist(h); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingView />;

  const cycles = splitCycles(hist);
  const completed = cycles.slice(0, -1);
  const spanDays = hist.length ? Math.round((+new Date(hist[hist.length - 1].date) - +new Date(hist[0].date)) / 86400000) + 1 : 0;
  const unlocked = { w: completed.length >= 1, m: completed.length >= 2, y: spanDays >= 90 };

  // aggregate points for the active tab
  const points: { label: string; v: number }[] = (() => {
    if (tab === 'w') {
      const byWeek = new Map<string, number[]>();
      hist.forEach((r) => {
        const d = new Date(r.date); const wk = new Date(d); wk.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const k = wk.toISOString().slice(0, 10);
        byWeek.set(k, [...(byWeek.get(k) ?? []), r.cas_total]);
      });
      return [...byWeek.entries()].slice(-8).map(([k, v]) => ({ label: k.slice(5), v: avg(v)! }));
    }
    if (tab === 'm') {
      const byM = new Map<string, number[]>();
      hist.forEach((r) => { const k = r.date.slice(0, 7); byM.set(k, [...(byM.get(k) ?? []), r.cas_total]); });
      return [...byM.entries()].slice(-6).map(([k, v]) => ({ label: k.slice(5), v: avg(v)! }));
    }
    const byM = new Map<string, number[]>();
    hist.forEach((r) => { const k = r.date.slice(0, 7); byM.set(k, [...(byM.get(k) ?? []), r.cas_total]); });
    return [...byM.entries()].slice(-12).map(([k, v]) => ({ label: k.slice(5), v: avg(v)! }));
  })();

  const cur = hist.length ? hist[hist.length - 1].cas_total : null;
  const allAvg = avg(hist.map((r) => r.cas_total));
  const best = hist.length ? Math.max(...hist.map((r) => r.cas_total)) : null;
  const worst = hist.length ? Math.min(...hist.map((r) => r.cas_total)) : null;
  const improvement = points.length >= 2 && points[0].v > 0 ? Math.round(((points[points.length - 1].v - points[0].v) / points[0].v) * 100) : null;

  // avg by phase
  const byPhase = new Map<string, number[]>();
  hist.forEach((r) => { const p = (r.phase ?? '').replace('early_', '').replace('late_', ''); if (p) byPhase.set(p, [...(byPhase.get(p) ?? []), r.cas_total]); });
  const phaseRows = [...byPhase.entries()].map(([p, v]) => ({ p, v: avg(v)! })).sort((a, b) => b.v - a.v);
  const insight = phaseRows.length >= 2
    ? `${t('mob.insightPhase', 'Your alignment is strongest in your')} ${t('phaseNames.' + phaseRows[0].p, phaseRows[0].p)} ${t('mob.insightPhase2', 'phase and dips most in')} ${t('phaseNames.' + phaseRows[phaseRows.length - 1].p, phaseRows[phaseRows.length - 1].p)}.`
    : null;

  const chart = (() => {
    if (points.length < 2) return null;
    const W = 300, H = 110, min = Math.min(...points.map((p) => p.v)) - 5, max = Math.max(...points.map((p) => p.v)) + 5;
    const xy = points.map((p, i) => [10 + (i / (points.length - 1)) * (W - 20), H - 14 - ((p.v - min) / (max - min)) * (H - 28)] as const);
    const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `M ${xy[0][0]} ${H - 6} ` + xy.map(([x, y]) => `L ${x} ${y}`).join(' ') + ` L ${xy[xy.length - 1][0]} ${H - 6} Z`;
    return (
      <Svg width="100%" height={H + 18} viewBox={`0 0 ${W} ${H + 18}`}>
        <Path d={area} fill={colors.coral} opacity={0.12} />
        <Polyline points={line} stroke={colors.coral} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {xy.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3.4} fill={colors.coral} />)}
      </Svg>
    );
  })();

  const locked = !unlocked[tab];

  return (
    <View style={s.fill}>
      <SafeAreaView style={s.fill} edges={['top']}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}><Text style={s.back}>‹</Text></Pressable>
          <Text style={s.title}>{t('mob.casHistory', 'CAS History')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={s.tabs}>
          {([['w', t('mob.weekly', 'Weekly')], ['m', t('mob.monthly', 'Monthly')], ['y', t('mob.yearly', 'Yearly')]] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]}>
              <Text style={[s.tabTxt, tab === k && s.tabTxtOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {locked ? (
            <View style={s.lock}>
              <Text style={s.lockIcon}>◔</Text>
              <Text style={s.lockTxt}>{tab === 'w' ? t('mob.unlockWeekly', 'Weekly trends unlock after your first full cycle') : tab === 'm' ? t('mob.unlockMonthly', 'Keep syncing to see your monthly trends') : t('mob.unlockYearly', 'Keep syncing to unlock yearly insights')}</Text>
              <Text style={s.lockSub}>
                {tab === 'y' ? `${spanDays}/90 ${t('mob.daysTracked', 'days tracked')}` : `${completed.length}/${tab === 'w' ? 1 : 2} ${t('mob.cyclesCompleted', 'cycles completed')}`}
              </Text>
            </View>
          ) : (
            <>
              <View style={s.ringsRow}>
                <MiniRing v={cur} label={t('mob.current', 'Current')} />
                <MiniRing v={allAvg} label={t('mob.average', 'Average')} />
                <MiniRing v={best} label={t('mob.best', 'Best')} />
              </View>
              <View style={s.card}>{chart ?? <Text style={s.lockSub}>{t('mob.moreDataSoon', 'More data points coming as you log')}</Text>}</View>
              <View style={s.statsRow}>
                {[[t('mob.avgScore', 'Avg'), allAvg], [t('mob.highest', 'High'), best], [t('mob.lowest', 'Low'), worst], [t('mob.improvement', 'Improve'), improvement != null ? `${improvement > 0 ? '+' : ''}${improvement}%` : null]].map(([l, v], i) => (
                  <View key={i} style={s.statBox}>
                    <Text style={s.statVal}>{v == null ? '—' : typeof v === 'number' ? Math.round(v as number) : v}</Text>
                    <Text style={s.statLbl}>{l as string}</Text>
                  </View>
                ))}
              </View>
              <View style={s.phaseCard}>
                <Text style={s.phaseTitle}>{t('mob.avgByPhase', 'Average score by phase')}</Text>
                {phaseRows.map(({ p, v }) => (
                  <View key={p} style={s.phaseRow}>
                    <Text style={s.phaseLbl}>{t('phaseNames.' + p, p)}</Text>
                    <View style={s.barTrack}><View style={[s.bar, { width: `${v}%`, backgroundColor: PHASE_COL[p] ?? colors.coral }]} /></View>
                    <Text style={s.phaseVal}>{Math.round(v)}</Text>
                  </View>
                ))}
                {insight ? <Text style={s.insight}>{insight}</Text> : null}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24, marginTop: -3 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  tabs: { flexDirection: 'row', marginHorizontal: 18, marginTop: 12, backgroundColor: '#F6EEE7', borderRadius: 999, padding: 4, gap: 4 },
  tab: { flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.coral },
  tabTxt: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  tabTxtOn: { color: '#fff', fontFamily: font.semibold },
  lock: { alignItems: 'center', paddingVertical: 60 },
  lockIcon: { fontSize: 30, color: colors.faint },
  lockTxt: { fontFamily: font.medium, fontSize: 14, color: colors.muted, marginTop: 10, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
  lockSub: { fontFamily: font.regular, fontSize: 12, color: colors.faint, marginTop: 6 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  mrVal: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, marginTop: -42, marginBottom: 26 },
  mrLbl: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  statVal: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  statLbl: { fontFamily: font.regular, fontSize: 10.5, color: colors.muted, marginTop: 2 },
  phaseCard: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9A7D9', borderRadius: 20, padding: 16, marginTop: 12, backgroundColor: '#fff' },
  phaseTitle: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, marginBottom: 10 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  phaseLbl: { width: 84, fontFamily: font.regular, fontSize: 12, color: colors.muted },
  barTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: '#F6EEE7', overflow: 'hidden' },
  bar: { height: 10, borderRadius: 6 },
  phaseVal: { width: 28, textAlign: 'right', fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  insight: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 12, lineHeight: 18 },
});
