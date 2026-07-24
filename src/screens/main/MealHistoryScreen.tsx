import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { StreakOffDot, StreakOnDot } from '../../ui/StreakOffDot';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { fetchMealHistory, MealRow } from '../../lib/recs';

/**
 * R2-C · screen 4 — Meal History. Summary cards (days streak + weekly dots),
 * reverse-chronological log grouped by date with phase label and per-meal-type
 * sections ("No entry" state when a slot is empty).
 */

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const SLOT_LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' };

export default function MealHistoryScreen() {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<MealRow[]>([]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchMealHistory(userId, 30).then((r) => { setRows(r); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingView />;

  // group by date (already desc)
  const byDate = new Map<string, MealRow[]>();
  rows.forEach((r) => { byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]); });
  const dates = [...byDate.keys()];

  // streaks: consecutive days ending today; weekly dots = last 7 days logged?
  const logged = new Set(dates);
  let streak = 0; const d = new Date();
  while (logged.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  const week = [...Array(7)].map((_, i) => {
    const x = new Date(); x.setDate(x.getDate() - (6 - i));
    return logged.has(x.toISOString().slice(0, 10));
  });

  const fmtDate = (iso: string) => {
    const x = new Date(iso + 'T12:00:00');
    const today = new Date().toISOString().slice(0, 10);
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    if (iso === today) return t('mob.today', 'Today');
    if (iso === yd.toISOString().slice(0, 10)) return t('mob.yesterday', 'Yesterday');
    return x.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const phaseLabel = (p: string | null) => p ? p.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.mealHistory', 'Meal History')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{streak}</Text>
              <Text style={styles.statLbl}>{t('mob.daysStreak', 'Days Streak')}</Text>
            </View>
            <View style={styles.stat}>
              <View style={styles.dotRow}>
                {week.map((on, i) => (
                  /* R5-f19: missed day = exact wireframe SVG (Group 1171289068) */
                  on
                    ? <View key={i} style={styles.dot}><StreakOnDot size={16} /></View>  /* R6-f7: crisp vector */
                    : <View key={i} style={styles.dot}><StreakOffDot size={16} /></View>
                ))}
              </View>
              <Text style={styles.statLbl}>{t('mob.weeklyStreak', 'Weekly Streak')}</Text>
            </View>
          </View>

          {dates.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTxt}>{t('mob.noMealsYet', 'No meals logged yet — your history builds here as you log.')}</Text>
            </View>
          )}

          {dates.map((date) => {
            const dayRows = byDate.get(date)!;
            const phase = dayRows.find((r) => r.phase)?.phase ?? null;
            return (
              <View key={date} style={styles.dayCard}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayTitle}>{fmtDate(date)}</Text>
                  {phase ? <Text style={styles.phasePill}>{phaseLabel(phase)}</Text> : null}
                </View>
                {SLOTS.map((slot) => {
                  const items = dayRows.filter((r) => (r.meal_type ?? 'snack') === slot || (!r.meal_type && slot === 'snack'));
                  return (
                    <View key={slot} style={styles.slotRow}>
                      <Text style={styles.slotLbl}>{SLOT_LABEL[slot]}</Text>
                      {items.length ? items.map((r) => (
                        <View key={r.id} style={styles.mealRow}>
                          <Image source={require('../../../assets/nutrilog/synced.png')} style={styles.synced} />
                          <Text style={styles.mealTxt} numberOfLines={2}>{r.description}</Text>
                        </View>
                      )) : (
                        <Text style={styles.noEntry}>{t('mob.noEntry', 'No entry')}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        <Pressable style={styles.cta} onPress={() => nav.navigate('MealLog')}>
          <Text style={styles.ctaTxt}>+ {t('mob.logNewMeal', 'Log New Meal')}</Text>
        </Pressable>
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
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  dayTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  phasePill: { fontFamily: font.semibold, fontSize: 10.5, color: colors.coral, backgroundColor: '#FDF0E7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  slotRow: { borderTopWidth: 1, borderTopColor: '#F7F0E9', paddingVertical: 8 },
  slotLbl: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.6, color: colors.muted, marginBottom: 3 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  synced: { width: 14, height: 14 },
  mealTxt: { flex: 1, fontFamily: font.regular, fontSize: 13.5, color: colors.ink },
  noEntry: { fontFamily: font.regular, fontSize: 12.5, color: colors.faint, fontStyle: 'italic' },
  cta: { position: 'absolute', left: 20, right: 20, bottom: 18, backgroundColor: colors.coral, borderRadius: radius.pill, height: 52, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  ctaTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
});
