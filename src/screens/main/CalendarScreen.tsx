import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getCurrentCycle, CycleRow } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase } from '../../lib/cas';
import { fetchSexDays } from '../../lib/progress';

/**
 * R2-I · Calendar rebuild.
 * F3  — every rendered day uses the SAME lib/cas math as the rest of the app.
 * F22 — grid always renders full 7-column weeks (Saturday included).
 * F20b— header stats are the user's real cycle values, not static copy.
 * F21 — soft wellness palette (coral/sage/golden/lavender), floating white card,
 *       segmented cycle progress bar, small muted dots, dashed predicted days.
 * F4  — Month/Year toggle, phase filter chips, ★ on intimacy-logged days.
 */

type P4 = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
const PAL: Record<P4, string> = { menstrual: '#E8837B', follicular: '#A8C3A0', ovulatory: '#E9C46A', luteal: '#B9A7D9' };
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function CalendarScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'year'>('month');
  const [filter, setFilter] = useState<P4 | null>(null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [stars, setStars] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const c = await getCurrentCycle(userId);
      setCycle(c); setLoading(false);
      const from = new Date(); from.setMonth(0, 1);
      fetchSexDays(userId, iso(from)).then(setStars).catch(() => {});
    })();
  }, [userId]);

  const today = new Date();
  const len = cycle?.cycle_length ?? 28;
  const dur = cycle?.period_duration ?? 5;
  const lps = cycle?.last_period_start_date ?? null;
  const dayOf = (d: Date) => (lps ? cycleDay(lps, d, len) : null);
  const phaseOf = (d: Date): P4 | null => { const n = dayOf(d); return n ? displayPhase(phaseForDay(n, len, dur)) : null; };
  const todayDay = dayOf(today) ?? 1;
  const todayPhase = phaseOf(today) ?? 'follicular';

  // segmented progress bar geometry (approximate phase spans for this cycle)
  const ovStart = len - 14, ovEnd = ovStart + 2;
  const spans: [P4, number][] = [
    ['menstrual', dur], ['follicular', Math.max(1, ovStart - dur - 1)],
    ['ovulatory', 3], ['luteal', Math.max(1, len - ovEnd)],
  ];
  // "next phase" message
  const nextInfo = useMemo(() => {
    if (!lps) return null;
    for (let i = 1; i <= len; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const p = phaseOf(d);
      if (p && p !== todayPhase) {
        const name = t('phaseNames.' + p, p[0].toUpperCase() + p.slice(1));
        return i === 1 ? `${name} ${t('mob.beginsTomorrow', 'begins tomorrow')}` : `${name} ${t('mob.beginsIn', 'begins in')} ${i} ${t('mob.days', 'days')}`;
      }
    }
    return null;
  }, [lps, todayPhase, len]);

  if (loading) return <LoadingView />;

  const monthCells = (y: number, m: number) => {
    const first = new Date(y, m, 1);
    const off = (first.getDay() + 6) % 7;                     // Monday-first
    const dim = new Date(y, m + 1, 0).getDate();
    const rows = Math.ceil((off + dim) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => {       // F22: always full weeks
      const n = i - off + 1;
      return n >= 1 && n <= dim ? new Date(y, m, n, 12) : null;
    });
  };
  const monthName = (m: number) => new Date(2026, m, 1).toLocaleDateString(undefined, { month: 'long' });
  const dows = [t('dows7.0', 'Mo'), t('dows7.1', 'Tu'), t('dows7.2', 'We'), t('dows7.3', 'Th'), t('dows7.4', 'Fr'), t('dows7.5', 'Sa'), t('dows7.6', 'Su')];

  const DayCell = ({ d, mini }: { d: Date | null; mini?: boolean }) => {
    if (!d) return <View style={[styles.cell, mini && styles.cellMini]} />;
    const p = phaseOf(d);
    const isToday = d.toDateString() === today.toDateString();
    const future = d > today;
    const faded = filter && p !== filter;
    const col = p ? PAL[p] : '#E7DCD3';
    if (mini) {
      return (
        <View style={[styles.cellMini, { opacity: faded ? 0.15 : 1 }]}>
          <View style={[styles.miniDot, { backgroundColor: col }, future && { backgroundColor: 'transparent', borderWidth: 1, borderColor: col }]} />
          {stars.has(iso(d)) ? <Text style={styles.miniStar}>★</Text> : null}
        </View>
      );
    }
    return (
      <View style={[styles.cell, { opacity: faded ? 0.25 : 1 }]}>
        {isToday ? (
          <LinearGradient colors={['#FF7600', '#FD400C']} style={styles.todayC}>
            <Text style={styles.todayTxt}>{d.getDate()}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.cellTxt}>{d.getDate()}</Text>
        )}
        <View style={styles.dotRow}>
          {p ? (
            future
              ? <View style={[styles.dotPred, { borderColor: col }]} />
              : <View style={[styles.dot, { backgroundColor: col }]} />
          ) : <View style={{ height: 6 }} />}
          {stars.has(iso(d)) ? <Text style={styles.star}>★</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* header card — F20b real values, F21 soft gradient + progress bar */}
          <LinearGradient colors={['#FB8A4E', '#F4633A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={styles.heroSmall}>{t('mob.today', 'Today')} · {today.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Text>
                <Text style={styles.heroTitle}>{t('ui.cycleDay', 'Cycle Day')} {todayDay}</Text>
              </View>
              <View style={styles.phasePill}><Text style={styles.phasePillTxt}>{t('phaseNames.' + todayPhase, todayPhase)}</Text></View>
            </View>
            {/* segmented progress bar with day indicator */}
            <View style={styles.segBar}>
              {(() => { let acc = 0; return spans.map(([p, n], i) => {
                const w = (n / len) * 100; const has = todayDay > acc && todayDay <= acc + n;
                const frac = has ? (todayDay - acc) / n : 0; acc += n;
                return (
                  <View key={i} style={[styles.seg, { width: `${w}%`, backgroundColor: PAL[p] + (p === todayPhase ? '' : '88') }]}>
                    {has ? (
                      <View style={[styles.segKnob, { left: `${Math.min(92, Math.max(2, frac * 100 - 6))}%` }]}>
                        <Text style={styles.segKnobTxt}>{todayDay}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              }); })()}
            </View>
            {nextInfo ? <Text style={styles.heroNote}>{nextInfo}</Text> : null}
            <View style={styles.heroStats}>
              <View style={styles.heroStat}><Text style={styles.heroStatLbl}>{t('mob.avgCycle', 'Avg cycle')}</Text><Text style={styles.heroStatVal}>{len} {t('mob.days', 'days')}</Text></View>
              <View style={styles.heroStat}><Text style={styles.heroStatLbl}>{t('mob.avgPeriod', 'Avg period')}</Text><Text style={styles.heroStatVal}>{dur} {t('mob.days', 'days')}</Text></View>
            </View>
          </LinearGradient>

          {/* view toggle + phase filter (F4) */}
          <View style={styles.toggleRow}>
            {(['month', 'year'] as const).map((v) => (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.toggle, view === v && styles.toggleOn]}>
                <Text style={[styles.toggleTxt, view === v && styles.toggleTxtOn]}>{v === 'month' ? t('mob.month', 'Month') : t('mob.year', 'Year')}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.legend}>
            {(Object.keys(PAL) as P4[]).map((p) => {
              const on = filter === p;
              return (
                <Pressable key={p} onPress={() => setFilter(on ? null : p)} style={[styles.legendItem, on && styles.legendOn]}>
                  <View style={[styles.legendDot, { backgroundColor: PAL[p] }]} />
                  <Text style={[styles.legendTxt, on && { color: colors.ink, fontFamily: font.semibold }]}>{t('phaseNames.' + p, p)}</Text>
                </Pressable>
              );
            })}
          </View>

          {view === 'month' ? (
            <View style={styles.card}>
              <View style={styles.monthHead}>
                <Pressable hitSlop={10} onPress={() => setCursor(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}><Text style={styles.nav}>‹</Text></Pressable>
                <Text style={styles.monthTitle}>{monthName(cursor.m)} {cursor.y}</Text>
                <Pressable hitSlop={10} onPress={() => setCursor(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}><Text style={styles.nav}>›</Text></Pressable>
              </View>
              <View style={styles.dowRow}>{dows.map((d, i) => <Text key={i} style={styles.dow}>{d}</Text>)}</View>
              <View style={styles.grid}>{monthCells(cursor.y, cursor.m).map((d, i) => <DayCell key={i} d={d} />)}</View>
            </View>
          ) : (
            <View style={styles.yearWrap}>
              {Array.from({ length: 12 }, (_, m) => (
                <Pressable key={m} style={styles.miniCard} onPress={() => { setCursor({ y: cursor.y, m }); setView('month'); }}>
                  <Text style={styles.miniTitle}>{new Date(2026, m, 1).toLocaleDateString(undefined, { month: 'short' })}</Text>
                  <View style={styles.miniGrid}>{monthCells(cursor.y, m).map((d, i) => <DayCell key={i} d={d} mini />)}</View>
                </Pressable>
              ))}
            </View>
          )}

          {/* guidance card */}
          <View style={styles.guide}>
            <Text style={styles.guideTitle}>{t('phaseNames.' + todayPhase, todayPhase)}</Text>
            <Text style={styles.guideTxt}>{t('phase.' + todayPhase + '.copy', '')}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  hero: { borderRadius: 30, padding: 22 },
  heroSmall: { fontFamily: font.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontFamily: font.semibold, fontSize: 30, color: '#fff', marginTop: 4 },
  phasePill: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  phasePillTxt: { fontFamily: font.medium, fontSize: 12, color: '#fff' },
  segBar: { flexDirection: 'row', height: 12, borderRadius: 8, overflow: 'hidden', marginTop: 18, gap: 2 },
  seg: { height: 12, borderRadius: 6, position: 'relative' },
  segKnob: { position: 'absolute', top: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  segKnobTxt: { fontFamily: font.bold, fontSize: 10.5, color: '#F4633A' },
  heroNote: { fontFamily: font.regular, fontSize: 12.5, color: 'rgba(255,255,255,0.92)', marginTop: 12 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 16, padding: 12 },
  heroStatLbl: { fontFamily: font.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  heroStatVal: { fontFamily: font.semibold, fontSize: 17, color: '#fff', marginTop: 2 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F6EEE7', borderRadius: 999, padding: 4, gap: 4, marginTop: 16 },
  toggle: { flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: '#fff', ...shadow.card },
  toggleTxt: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  toggleTxtOn: { color: colors.ink, fontFamily: font.semibold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EFE3D7' },
  legendOn: { borderColor: colors.coral },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendTxt: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  card: { backgroundColor: '#fff', borderRadius: 26, padding: 18, marginTop: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthTitle: { fontFamily: font.semibold, fontSize: 16.5, color: colors.ink },
  nav: { fontFamily: font.semibold, fontSize: 22, color: colors.ink, paddingHorizontal: 10 },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dow: { flex: 1, textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.faint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 7 },
  cellTxt: { fontFamily: font.medium, fontSize: 14, color: '#4A4340', height: 26, textAlignVertical: 'center' },
  todayC: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayTxt: { fontFamily: font.semibold, fontSize: 13.5, color: '#fff' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 10, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotPred: { width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', backgroundColor: 'transparent' },
  star: { fontSize: 8, color: '#E9C46A' },
  yearWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  miniCard: { width: '31%', backgroundColor: '#fff', borderRadius: 16, padding: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  miniTitle: { fontFamily: font.semibold, fontSize: 11.5, color: colors.ink, marginBottom: 4, textAlign: 'center' },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellMini: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 1.5 },
  miniDot: { width: 4.5, height: 4.5, borderRadius: 3 },
  miniStar: { fontSize: 5, color: '#E9C46A', position: 'absolute', right: 0, top: -1 },
  guide: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginTop: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  guideTitle: { fontFamily: font.semibold, fontSize: 15.5, color: colors.ink },
  guideTxt: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 6 },
});
