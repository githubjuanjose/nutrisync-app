import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { fetchMovementHistory, MovementLogRow } from '../../lib/recs';

/**
 * R2-D · screen 4 — Movement History. Days Logged + Weekly Streak cards,
 * reverse-chron days with phase label; merges checked activities (color-coded
 * by category) and free-text session logs.
 */

const CAT_COLOR: Record<string, string> = {
  strength: '#C0492B', cardio: '#E8842A', 'flexibility & recovery': '#3E8B63',
  'daily movement': '#4A7AB5', other: '#8A7F76', session: '#8A7F76',
};

type DayEntry = { kind: 'check' | 'log'; label: string; cat: string | null; detail?: string };

export default function MovementHistoryScreen() {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [byDate, setByDate] = useState<Map<string, { phase: string | null; entries: DayEntry[] }>>(new Map());

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchMovementHistory(userId, 30).then(({ logs, checks }) => {
      const m = new Map<string, { phase: string | null; entries: DayEntry[] }>();
      const ensure = (d: string, phase: string | null) => {
        if (!m.has(d)) m.set(d, { phase, entries: [] });
        const e = m.get(d)!; if (!e.phase && phase) e.phase = phase;
        return e;
      };
      checks.forEach((c) => ensure(c.date, (c as any).phase ?? null).entries.push({ kind: 'check', label: c.item_name, cat: c.category_tag }));
      logs.forEach((l: MovementLogRow) => ensure(l.date, l.phase).entries.push({ kind: 'log', label: t('mob.sessionNotes', 'Session notes'), cat: null, detail: l.description }));
      setByDate(new Map([...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingView />;

  const dates = [...byDate.keys()];
  const logged = new Set(dates);
  let streak = 0; const d = new Date();
  while (logged.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  const week = [...Array(7)].map((_, i) => {
    const x = new Date(); x.setDate(x.getDate() - (6 - i));
    return logged.has(x.toISOString().slice(0, 10));
  });

  const fmtDate = (iso: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    if (iso === today) return t('mob.today', 'Today');
    if (iso === yd.toISOString().slice(0, 10)) return t('mob.yesterday', 'Yesterday');
    return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const phaseLabel = (p: string | null) => p ? p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.movementHistory', 'Movement History')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{dates.length}</Text>
              <Text style={styles.statLbl}>{t('mob.daysLogged', 'Days Logged')}</Text>
            </View>
            <View style={styles.stat}>
              <View style={styles.dotRow}>
                {week.map((on, i) => (
                  <Image key={i}
                    source={on ? require('../../../assets/nutrilog/streak-on.png') : require('../../../assets/nutris/blue.png')  /* R3-39: blue Nutri marks a missed day */}
                    style={styles.dot} />
                ))}
              </View>
              <Text style={styles.statLbl}>{t('mob.weeklyStreak', 'Weekly Streak')}</Text>
            </View>
          </View>

          {dates.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>{t('mob.noMovesYet', 'No movement logged yet — check off activities or log a session.')}</Text>
            </View>
          )}

          {dates.map((date) => {
            const e = byDate.get(date)!;
            return (
              <View key={date} style={styles.dayCard}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayTitle}>{fmtDate(date)}</Text>
                  {e.phase ? <Text style={styles.phasePill}>{phaseLabel(e.phase)}</Text> : null}
                </View>
                {e.entries.map((it, i) => (
                  <View key={i} style={styles.entryRow}>
                    {it.cat ? (
                      <Text style={[styles.catTag, { backgroundColor: (CAT_COLOR[it.cat] ?? '#8A7F76') + '22', color: CAT_COLOR[it.cat] ?? '#8A7F76' }]}>
                        {it.cat.replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                    ) : <Image source={require('../../../assets/nutrilog/synced.png')} style={styles.synced} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle}>{it.label}</Text>
                      {it.detail ? <Text style={styles.entryDetail} numberOfLines={2}>{it.detail}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24, marginTop: -3 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, alignItems: 'center', ...shadow.card },
  statVal: { fontFamily: font.bold, fontSize: 24, color: colors.ink },
  statLbl: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  dotRow: { flexDirection: 'row', gap: 5, height: 30, alignItems: 'center' },
  dot: { width: 16, height: 16 },
  empty: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 22, marginTop: 16, ...shadow.card },
  emptyTxt: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  dayCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginTop: 12, ...shadow.card },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  dayTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  phasePill: { fontFamily: font.semibold, fontSize: 10.5, color: colors.coral, backgroundColor: '#FDF0E7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#F7F0E9', paddingVertical: 8 },
  catTag: { fontFamily: font.semibold, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  synced: { width: 14, height: 14 },
  entryTitle: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink },
  entryDetail: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
});
