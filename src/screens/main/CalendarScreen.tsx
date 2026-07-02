import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, phaseColor } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getCurrentCycle, CycleRow } from '../../lib/api';
import { cycleDay, phaseForDay, displayPhase } from '../../lib/cas';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEGEND = [
  { c: colors.menstrual, l: 'Menstruation' },
  { c: colors.follicular, l: 'Follicular' },
  { c: colors.ovulatory, l: 'Ovulation' },
  { c: colors.luteal, l: 'Luteal' },
];

export default function CalendarScreen() {
  const { userId } = useSession();
  const [cycle, setCycle] = useState<CycleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      setCycle(await getCurrentCycle(userId)); setLoading(false);
    })();
  }, [userId]);

  if (loading) return <LoadingView />;

  const today = new Date();
  const len = cycle?.cycle_length ?? 28;
  const dur = cycle?.period_duration ?? 5;
  const lps = cycle?.last_period_start_date;
  const todayDay = lps ? cycleDay(lps, today, len) : 1;
  const todayPhase = displayPhase(phaseForDay(todayDay, len, dur));

  const dphase = (d: Date) => (lps ? displayPhase(phaseForDay(cycleDay(lps, d, len), len, dur)) : null);

  // build grid
  const first = new Date(view.y, view.m, 1);
  const startDow = first.getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: days }, (_, i) => new Date(view.y, view.m, i + 1))];

  const shift = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Calendar</Text>

          {/* Today card */}
          <LinearGradient colors={[colors.orange, '#EF4B12']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.todayCard}>
            <Text style={styles.todayLabel}>Today · {today.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={styles.cycleDay}>Cycle Day {todayDay}</Text>
              <View style={styles.phasePill}><Text style={styles.phasePillTxt}>{todayPhase}</Text></View>
            </View>
            <View style={styles.miniStats}>
              <View><Text style={styles.miniStatN}>{len} days</Text><Text style={styles.miniStatL}>Avg cycle</Text></View>
              <View><Text style={styles.miniStatN}>{dur} days</Text><Text style={styles.miniStatL}>Avg period</Text></View>
            </View>
          </LinearGradient>

          {/* Legend */}
          <View style={styles.legend}>
            {LEGEND.map((x) => (
              <View key={x.l} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: x.c }]} />
                <Text style={styles.legendTxt}>{x.l}</Text>
              </View>
            ))}
          </View>

          {/* Month grid */}
          <View style={styles.card}>
            <View style={styles.monthHead}>
              <Pressable onPress={() => shift(-1)}><Text style={styles.arrow}>‹</Text></Pressable>
              <Text style={styles.monthTitle}>{MONTHS[view.m]} {view.y}</Text>
              <Pressable onPress={() => shift(1)}><Text style={styles.arrow}>›</Text></Pressable>
            </View>
            <View style={styles.dowRow}>
              {DOW.map((d, i) => <Text key={i} style={styles.dow}>{d}</Text>)}
            </View>
            <View style={styles.grid}>
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={styles.cell} />;
                const isToday = d.toDateString() === today.toDateString();
                const ph = dphase(d);
                return (
                  <View key={i} style={styles.cell}>
                    <View style={[styles.dayCircle, isToday && { backgroundColor: colors.coral }]}>
                      <Text style={[styles.dayNum, isToday && { color: '#fff', fontFamily: font.bold }]}>{d.getDate()}</Text>
                    </View>
                    {!isToday && ph ? <View style={[styles.phaseDot, { backgroundColor: phaseColor[ph] }]} /> : <View style={styles.phaseDotEmpty} />}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Selected-day insight (today) */}
          <View style={styles.card}>
            <Text style={styles.insightPhase}>{todayPhase} · Day {todayDay}</Text>
            <Text style={styles.insightTxt}>Your guidance adapts to this phase — check NutriLog and Movement for today's plan.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  fillC: { flex: 1, backgroundColor: colors.peachTop, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 24, color: colors.ink, textAlign: 'center', marginBottom: 12 },
  todayCard: { borderRadius: radius.lg, padding: 18 },
  todayLabel: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  cycleDay: { fontFamily: font.bold, fontSize: 24, color: '#fff' },
  phasePill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: radius.pill, paddingHorizontal: 12, height: 26, justifyContent: 'center' },
  phasePillTxt: { fontFamily: font.semibold, fontSize: 12, color: '#fff', textTransform: 'capitalize' },
  miniStats: { flexDirection: 'row', gap: 30, marginTop: 16 },
  miniStatN: { fontFamily: font.bold, fontSize: 15, color: '#fff' },
  miniStatL: { fontFamily: font.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendTxt: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 14, ...shadow.card },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  arrow: { fontSize: 24, color: colors.coral, paddingHorizontal: 12 },
  dowRow: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', fontFamily: font.medium, fontSize: 12, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 5 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontFamily: font.regular, fontSize: 13.5, color: colors.ink },
  phaseDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  phaseDotEmpty: { height: 8, marginTop: 2 },
  insightPhase: { fontFamily: font.semibold, fontSize: 14, color: colors.coral, textTransform: 'capitalize' },
  insightTxt: { fontFamily: font.regular, fontSize: 13, color: colors.body, marginTop: 4, lineHeight: 19 },
});
