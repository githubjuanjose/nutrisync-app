import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { SettingsIcon } from '../../ui/SettingsIcons';
import { GoalOrb } from '../../ui/GoalOrb';
import { ChipGroup } from '../../ui/Chips';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';

/* NutriGoals — from the Figma "Health Profile" design. */
const NUTRIGOALS = [   // R3-55 (F4): three goals — 'Fewer PMS mood crashes' removed
  'Reduce physical PMS symptoms',
  'Feel more emotionally balanced',
  'More stable energy throughout my Cycle',
];
const ALLERGIES = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Peanuts', 'Tree nuts', 'Wheat', 'Soy'];
// PCOS was officially renamed PMOS (polyendocrine metabolic ovarian syndrome, May 2026).
// We display PMOS; norm() aliases the legacy 'pcos' token so previously saved logs still match.
const CONDITIONS = ['Adenomyosis', 'Irregular Cycles', 'Hypothyroidism', 'PMOS', 'Endometriosis', "Hashimoto's", 'Heavy menstrual bleeding', 'Hyperthyroidism'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').replace(/^pcos$/, 'pmos');
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
  // f56: swipe the goal card left/right (arrows still work)
  const swipe = React.useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_e, g) => { if (Math.abs(g.dx) > 30) cycleGoal(g.dx < 0 ? 1 : -1); },
  })).current;

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({
        nutrigoal: NUTRIGOALS[goalIdx],
      }).eq('id', userId);
      if (error) throw error;
      navigation.goBack();
    } catch (e) {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <LinearGradient colors={['#FCF1EC', '#FBE7DB', '#F6D6C2']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Text style={styles.x}>✕</Text></Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.date}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
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
            <View {...swipe.panHandlers}>
              {/* R4-F11: exact wireframe radial gradients per goal */}
              <GoalOrb index={goalIdx} label={NUTRIGOALS[goalIdx]} size={200} />
            </View>
            <Pressable onPress={() => cycleGoal(1)} hitSlop={12} style={styles.arrowBtn}>
              <Text style={[styles.arrow, goalLocked && styles.arrowOff]}>›</Text>
            </Pressable>
          </View>
          <View style={styles.dots}>
            {NUTRIGOALS.map((_, i) => <View key={i} style={[styles.dot, i === goalIdx && styles.dotOn]} />)}
          </View>
          {goalLocked && (
            <View style={styles.lockPill}><SettingsIcon name="lock" size={14} /><Text style={styles.lockTxt}> {t('mob.goalLock', 'Editable after 2 full cycles')} ({completedCycles}/2)</Text></View>
          )}

          {/* f56: allergies/conditions removed from this screen — they are
              edited in Settings → Cycle Health; this screen is the NutriGoal only. */}

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
  subtitle: { fontFamily: font.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  date: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
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
  lockPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1E7DF', borderRadius: radius.pill, paddingHorizontal: 14, height: 30, justifyContent: 'center', marginTop: 14 },
  lockTxt: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  section: { fontFamily: font.semibold, fontSize: 16, color: colors.ink, marginTop: 24, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 12, ...shadow.card },
  saveBtn: { backgroundColor: colors.coral, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
