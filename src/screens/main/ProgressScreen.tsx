import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile } from '../../lib/api';
import { getScoreDetail, ScoreDetail } from '../../lib/daily';
import { ScoreRing } from '../../ui/ScoreRing';
import { useT } from '../../i18n';

const COMPONENTS = [
  { key: 'c1', label: 'Phase', max: 15 },
  { key: 'c2', label: 'Biomarkers', max: 25 },
  { key: 'c3', label: 'Nutrition', max: 30 },
  { key: 'c4', label: 'Fitness', max: 20 },
  { key: 'c5', label: 'Logging', max: 10 },
] as const;

const INSIGHTS = [
  'Recovery improved post-ovulation',
  'Ovulation occured on Day 14',
  'Energy peaked mid-cycle, dipped late luteal',
  'Cycle average 26.4 days',
];

export default function ProgressScreen({ navigation }: any) {
  const { userId } = useSession();
  const t = useT();
  const [name, setName] = useState('there');
  const [score, setScore] = useState<ScoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  useEffect(() => {
    const load = async () => {
      if (!userId) { setLoading(false); return; }
      const [p, s] = await Promise.all([getProfile(userId), getScoreDetail(userId)]);
      setName(p?.first_name ?? 'there'); setScore(s); setLoading(false);
    };
    load();
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [userId, navigation]);

  if (loading) return <LoadingView />;

  const total = score?.cas_total ?? 0;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('ui.progress', 'Progress')}</Text>
          <Text style={styles.sub}>Keep it up, {name}!</Text>

          {/* CAS card */}
          <View style={styles.casCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.casTitle}>Cycle Alignment{'\n'}Score</Text>
                <Text style={styles.casSub}>{score ? 'today' : 'log your day to score'}</Text>
              </View>
              <ScoreRing value={total} max={100} size={92} stroke={11} />
            </View>
            <View style={styles.miniRow}>
              {COMPONENTS.map((c) => (
                <View key={c.key} style={{ alignItems: 'center' }}>
                  <ScoreRing value={score ? (score as any)[c.key] : 0} max={c.max} size={46} stroke={5} small />
                  <Text style={styles.miniLbl}>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* current / last / best */}
          <View style={styles.card}>
            <View style={styles.statCols}>
              <Stat n={Math.round(total)} l="current" />
              <Stat n={'—'} l="last cycle" />
              <Stat n={'—'} l="best score" />
            </View>
          </View>

          {/* stability stats */}
          <View style={[styles.card, styles.statRow]}>
            <Stat3 n="35%" l="Energy stability" />
            <Stat3 n="22%" l="Mood" />
            <Stat3 n="8%" l="PMS symptoms" />
          </View>

          {/* trend toggle + placeholder chart */}
          <View style={styles.card}>
            <View style={styles.toggle}>
              {(['weekly', 'monthly', 'yearly'] as const).map((t) => (
                <Text key={t} onPress={() => setTab(t)} style={[styles.tog, tab === t && styles.togOn]}>{t}</Text>
              ))}
            </View>
            <View style={styles.chart}>
              <Text style={styles.chartHint}>Keep syncing to see your {tab} trend</Text>
            </View>
          </View>

          {/* insights */}
          <View style={styles.card}>
            {INSIGHTS.map((i) => (
              <View key={i} style={styles.insightRow}>
                <View style={styles.dot} />
                <Text style={styles.insightTxt}>{i}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const Stat = ({ n, l }: { n: number | string; l: string }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={styles.statN}>{n}</Text><Text style={styles.statL}>{l}</Text>
  </View>
);
const Stat3 = ({ n, l }: { n: string; l: string }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={styles.stat3N}>{n}</Text><Text style={styles.statL}>{l}</Text>
  </View>
);

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  fillC: { flex: 1, backgroundColor: colors.peachTop, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 26, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  casCard: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: '#F3C9BC', borderRadius: radius.lg, padding: 18, marginTop: 16, ...shadow.card },
  casTitle: { fontFamily: font.semibold, fontSize: 20, color: colors.coral, lineHeight: 24 },
  casSub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  miniLbl: { fontFamily: font.regular, fontSize: 9, color: colors.muted, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, marginTop: 14, ...shadow.card },
  statCols: { flexDirection: 'row' },
  statN: { fontFamily: font.bold, fontSize: 22, color: colors.ink },
  statL: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 2 },
  statRow: { flexDirection: 'row' },
  stat3N: { fontFamily: font.bold, fontSize: 20, color: colors.good },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tog: { fontFamily: font.medium, fontSize: 13, color: colors.muted, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#FBEEE7', overflow: 'hidden' },
  togOn: { backgroundColor: colors.coral, color: '#fff' },
  chart: { height: 120, alignItems: 'center', justifyContent: 'center' },
  chartHint: { fontFamily: font.regular, fontSize: 13, color: colors.faint },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coral },
  insightTxt: { fontFamily: font.regular, fontSize: 13.5, color: colors.body, flex: 1 },
});
