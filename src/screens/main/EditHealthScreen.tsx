import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { ChipGroup } from '../../ui/Chips';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';

/* NutriGoals — from the Figma "Health Profile" design. */
const NUTRIGOALS = [
  'Reduce physical PMS symptoms',
  'Feel more emotionally balanced',
  'More stable energy throughout my Cycle',
  'Fewer PMS mood crashes',
];
const ALLERGIES = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Peanuts', 'Tree nuts', 'Wheat', 'Soy'];
const CONDITIONS = ['Adenomyosis', 'Irregular Cycles', 'Hypothyroidism', 'PCOS', 'Endometriosis', "Hashimoto's", 'Heavy menstrual bleeding', 'Hyperthyroidism'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
/** A chip is "on" if its normalized token is in the stored array. */
const has = (arr: string[], label: string) => arr.map(norm).includes(norm(label));
const toggleTok = (arr: string[], label: string) => {
  const t = norm(label);
  return arr.map(norm).includes(t) ? arr.filter((x) => norm(x) !== t) : [...arr, t];
};

export default function EditHealthScreen({ navigation }: any) {
  const { userId } = useSession();
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goalIdx, setGoalIdx] = useState(0);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [completedCycles, setCompletedCycles] = useState(0);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase
        .from('users')
        .select('nutrigoal, allergies, health_conditions, completed_cycles')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        const idx = NUTRIGOALS.findIndex((g) => norm(g) === norm(d.nutrigoal ?? ''));
        setGoalIdx(idx >= 0 ? idx : 0);
        setAllergies(d.allergies ?? []);
        setConditions(d.health_conditions ?? []);
        setCompletedCycles(d.completed_cycles ?? 0);
      }
      setLoading(false);
    })();
  }, [userId]);

  const goalLocked = completedCycles < 2;
  const cycleGoal = (dir: number) => {
    if (goalLocked) return;
    setGoalIdx((i) => (i + dir + NUTRIGOALS.length) % NUTRIGOALS.length);
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from('users').update({
        nutrigoal: NUTRIGOALS[goalIdx],
        allergies,
        health_conditions: conditions,
      }).eq('id', userId);
      navigation.goBack();
    } catch {
      navigation.goBack();
    }
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Text style={styles.x}>✕</Text></Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>{t('mob.healthProfile', "Health Profile")}</Text>
            <Text style={styles.subtitle}>{t('mob.nutriGoals', "NutriGoals")}</Text>
          </View>
          <Pressable onPress={save} style={styles.iconBtn}>
            {saving ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.tick}>✓</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.reminder}>Your NutriGoal shapes your whole plan — you can change it after two full cycles.</Text>

          {/* NutriGoal orb + arrows */}
          <Text style={styles.currentLabel}>{t('mob.currentNutriGoal', "Your current NutriGoal")}</Text>
          <View style={styles.orbRow}>
            <Pressable onPress={() => cycleGoal(-1)} hitSlop={12} style={styles.arrowBtn}>
              <Text style={[styles.arrow, goalLocked && styles.arrowOff]}>‹</Text>
            </Pressable>
            <LinearGradient
              colors={['#FFB27A', '#F5641E', '#9E6BB0']}
              start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={styles.orb}
            >
              <Text style={styles.goalText}>{NUTRIGOALS[goalIdx]}</Text>
            </LinearGradient>
            <Pressable onPress={() => cycleGoal(1)} hitSlop={12} style={styles.arrowBtn}>
              <Text style={[styles.arrow, goalLocked && styles.arrowOff]}>›</Text>
            </Pressable>
          </View>
          <View style={styles.dots}>
            {NUTRIGOALS.map((_, i) => <View key={i} style={[styles.dot, i === goalIdx && styles.dotOn]} />)}
          </View>
          {goalLocked && (
            <View style={styles.lockPill}><Text style={styles.lockTxt}>🔒 Editable after 2 full cycles ({completedCycles}/2)</Text></View>
          )}

          {/* Allergies */}
          <Text style={styles.section}>{t('mob.allergiesH', "Allergies")}</Text>
          <View style={styles.card}>
            <ChipGroup options={ALLERGIES} selected={ALLERGIES.filter((a) => has(allergies, a))}
              onToggle={(v) => setAllergies((p) => toggleTok(p, v))} />
          </View>

          {/* Health Conditions */}
          <Text style={styles.section}>{t('mob.healthConditions', "Health Conditions")}</Text>
          <View style={styles.card}>
            <ChipGroup options={CONDITIONS} selected={CONDITIONS.filter((c) => has(conditions, c))}
              onToggle={(v) => setConditions((p) => toggleTok(p, v))} />
          </View>

          <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveTxt}>{saving ? 'Saving…' : t('ui.saveChanges', 'Save')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  x: { fontSize: 20, color: colors.ink },
  tick: { fontSize: 20, color: colors.coral, fontFamily: font.bold },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: font.medium, fontSize: 13, color: colors.coral, marginTop: 2 },
  reminder: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  currentLabel: { fontFamily: font.medium, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 22 },
  orbRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  arrowBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 34, color: colors.coral },
  arrowOff: { color: colors.faint },
  orb: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, ...shadow.card },
  goalText: { fontFamily: font.bold, fontSize: 18, color: colors.ink, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.faint },
  dotOn: { backgroundColor: colors.coral, width: 18 },
  lockPill: { alignSelf: 'center', backgroundColor: '#F1E7DF', borderRadius: radius.pill, paddingHorizontal: 14, height: 30, justifyContent: 'center', marginTop: 14 },
  lockTxt: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  section: { fontFamily: font.semibold, fontSize: 16, color: colors.ink, marginTop: 24, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 12, ...shadow.card },
  saveBtn: { backgroundColor: colors.coral, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
