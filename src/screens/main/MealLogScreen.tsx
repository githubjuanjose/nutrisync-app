import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { getCurrentCycle } from '../../lib/api';
import { cycleDay, phaseForDay } from '../../lib/cas';
import { saveMealTyped, searchFoods } from '../../lib/recs';

/**
 * R2-C · screen 3 — Log Meal. Meal-type tabs, food search over the content DB,
 * free-text notes. KeyboardAvoidingView keeps the input visible while typing
 * (fixes the keyboard-covers-field bug F31 carried from the old screen).
 * Barcode scanning is a future feature (feasibility with the POs) — search only.
 */

const TYPES = [
  { k: 'breakfast', label: 'Breakfast' },
  { k: 'lunch', label: 'Lunch' },
  { k: 'dinner', label: 'Dinner' },
  { k: 'snack', label: 'Snacks' },
] as const;

export default function MealLogScreen() {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const [mealType, setMealType] = useState<typeof TYPES[number]['k']>('breakfast');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; category: string }[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => { searchFoods(q).then(setResults).catch(() => setResults([])); }, 250);
    return () => clearTimeout(h);
  }, [q]);

  const log = async () => {
    if (!userId || !text.trim()) return;
    setBusy(true);
    try {
      const cycle = await getCurrentCycle(userId);
      const len = cycle?.cycle_length ?? 28;
      const day = cycle ? cycleDay(cycle.last_period_start_date, new Date(), len) : undefined;
      const phase = day ? phaseForDay(day, len, cycle?.period_duration ?? 5) : undefined;
      await saveMealTyped(userId, text.trim(), mealType, { day, phase });
      setDone(true); setText('');
      setTimeout(() => setDone(false), 1800);
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.mealLog', 'Meal Log')}</Text>
          <Pressable onPress={() => nav.navigate('MealHistory')} hitSlop={12} style={styles.histBtn}>
            <Text style={styles.histTxt}>🕘</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill} keyboardVerticalOffset={8}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            {/* meal-type tabs */}
            <View style={styles.tabs}>
              {TYPES.map((m) => (
                <Pressable key={m.k} onPress={() => setMealType(m.k)} style={[styles.tab, mealType === m.k && styles.tabOn]}>
                  <Text style={[styles.tabTxt, mealType === m.k && styles.tabTxtOn]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* search */}
            <View style={styles.search}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={q} onChangeText={setQ}
                placeholder={t('mob.searchFood', 'Search food')}
                placeholderTextColor={colors.faint} style={styles.searchInput}
              />
            </View>
            {results.map((r) => (
              <Pressable key={r.id} style={styles.result}
                onPress={() => { setText((p) => (p ? p + ', ' : '') + r.name); setQ(''); }}>
                <Text style={styles.resultName}>{r.name}</Text>
                <Text style={styles.resultCat}>{r.category}</Text>
              </Pressable>
            ))}

            {/* free text */}
            <Text style={styles.section}>{t('mob.logYourMeal', 'Log your meal')}</Text>
            <Text style={styles.hint}>{t('mob.mealHint', "Write down what you ate and any notes you'd like to keep")}</Text>
            <TextInput
              value={text} onChangeText={setText} multiline
              placeholder={t('mob.mealPlaceholder', 'e.g. Lentil salad with spinach and walnuts…')}
              placeholderTextColor={colors.faint} style={styles.textArea}
            />

            <Pressable onPress={log} disabled={busy || !text.trim()}
              style={[styles.cta, (!text.trim() || busy) && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color="#fff" /> :
                <Text style={styles.ctaTxt}>{done ? '✓ ' + t('mob.logged', 'Logged') : t('mob.logMealBtn', 'Log meal →')}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24, marginTop: -3 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  histBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  histTxt: { fontSize: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#F6EEE7', borderRadius: radius.pill, padding: 4, gap: 4 },
  tab: { flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.white, ...shadow.card },
  tabTxt: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  tabTxtOn: { color: colors.ink, fontFamily: font.semibold },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, height: 48, paddingHorizontal: 14, marginTop: 16, ...shadow.card },
  searchIcon: { fontSize: 18, color: colors.muted, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 14.5, color: colors.ink },
  result: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, marginTop: 6 },
  resultName: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  resultCat: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  section: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 22 },
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 4 },
  textArea: { backgroundColor: colors.white, borderRadius: radius.md, minHeight: 110, padding: 14, marginTop: 10, fontFamily: font.regular, fontSize: 14.5, color: colors.ink, textAlignVertical: 'top', ...shadow.card },
  cta: { marginTop: 18, backgroundColor: colors.coral, borderRadius: radius.pill, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
});
