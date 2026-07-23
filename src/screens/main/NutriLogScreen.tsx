import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, font, radius, shadow, screenGrad } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile } from '../../lib/api';
import { pickVariantIndex } from '../../ui/NutriAvatar';
import { saveChecklist } from '../../lib/daily';
import {
  fetchDailyRecs, DailyRecs, orderedCategories, fetchCheckedToday,
  saveQuickLog, getQuickLog, countMealsToday,
} from '../../lib/recs';

/**
 * R2-C · NutriLog — 4-screen flow, screens 1+2 (Daily Tip / Body Insight tabs).
 * Content comes from the ns_daily_recs RPC (segment-aware, diet/condition/goal
 * filtered server-side). The checklist shows the top items per category so it
 * stays scannable; the full candidate list is intentionally larger.
 */

const PER_CATEGORY = 6;
// Official per-Nutri daily-tip characters (approved assets 17 Jul)
const TIP_CHARS = [
  require('../../../assets/nutrilog/tip-char-1.png'),
  require('../../../assets/nutrilog/tip-char-2.png'),
  require('../../../assets/nutrilog/tip-char-3.png'),
  require('../../../assets/nutrilog/tip-char-4.png'),
];
/* R3-40 (f43): little line icons above the FUEL / VITALITY stats — no emojis */
const MealIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={9} stroke="#E4572E" strokeWidth={1.8} fill="none" />
    <Circle cx={12} cy={12} r={4.5} stroke="#E4572E" strokeWidth={1.6} fill="none" />
    <Path d="M2.5 7v5M4.6 7v5M3.55 12v5" stroke="#E4572E" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
const DropIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M12 3 C12 3 5.5 11 5.5 15.5 a6.5 6.5 0 0 0 13 0 C18.5 11 12 3 12 3 Z" stroke="#E4572E" strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

const MOODS = ['Low', 'Meh', 'Okay', 'Good', 'Great'];
const ENERGY = ['Low', 'Low', 'Mid', 'High', 'High'];
const FLOWS = ['None', 'Light', 'Medium', 'Heavy'];
const SYMPTOMS = ['Cramps', 'Bloating', 'Fatigue', 'Headache'];

export default function NutriLogScreen() {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'tip' | 'insight'>('tip');
  const [recs, setRecs] = useState<DailyRecs | null>(null);
  const [charIdx, setCharIdx] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [meals, setMeals] = useState(0);
  const [quick, setQuick] = useState<{ mood: number | null; energy: number | null; flow_level: number | null; pain_symptoms: string[] }>({ mood: null, energy: null, flow_level: null, pain_symptoms: [] });

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    getProfile(userId).then((p: any) => setCharIdx(pickVariantIndex(p?.nutri_avatar))).catch(() => {});
    const [r, ck, q, m] = await Promise.all([
      fetchDailyRecs(), fetchCheckedToday(userId, 'nutrition_checklist'), getQuickLog(userId), countMealsToday(userId),
    ]);
    setRecs(r); setChecked(ck); setQuick(q); setMeals(m); setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => {
    if (userId && !loading) countMealsToday(userId).then(setMeals).catch(() => {});
  }, [userId, loading]));

  if (loading) return <LoadingView />;

  const cats = orderedCategories(recs?.nutri_basics).map(([c, items]) => [c, items.slice(0, PER_CATEGORY)] as const);
  const badge = recs ? `${(recs.phase || '').toUpperCase()} PHASE, DAY ${recs.cycle_day}` : '';
  const tip = recs?.nutrition_tip; const ins = recs?.nutrition_insight;

  const toggle = async (name: string) => {
    const next = new Set(checked);
    next.has(name) ? next.delete(name) : next.add(name);
    setChecked(next);
    if (!userId) return;
    const rows = cats.flatMap(([c, items]) => items
      .filter((i) => next.has(i.name))
      .map((i) => ({ item_name: i.name, nutrient_tag: c.toLowerCase(), phase: recs?.phase ?? null, checked: true })));
    try { await saveChecklist(userId, 'nutrition_checklist', rows); } catch {}
  };

  const cycleMood = async () => {
    const val = quick.mood == null ? 1 : (quick.mood % 5) + 1;
    setQuick({ ...quick, mood: val });
    if (userId) try { await saveQuickLog(userId, { mood: val }); } catch {}
  };
  const cycleEnergy = async () => {
    const val = quick.energy == null ? 1 : (quick.energy % 5) + 1;
    setQuick({ ...quick, energy: val });
    if (userId) try { await saveQuickLog(userId, { energy: val }); } catch {}
  };
  const cycleFlow = async () => {
    const val = quick.flow_level == null ? 0 : (quick.flow_level + 1) % FLOWS.length;
    setQuick({ ...quick, flow_level: val });
    if (userId) try { await saveQuickLog(userId, { flow_level: val }); } catch {}
  };
  const toggleSymptom = async (s: string) => {
    const list = quick.pain_symptoms.includes(s)
      ? quick.pain_symptoms.filter((x) => x !== s) : [...quick.pain_symptoms, s];
    setQuick({ ...quick, pain_symptoms: list });
    if (userId) try { await saveQuickLog(userId, { pain_symptoms: list }); } catch {}
  };

  return (
    <View style={styles.fill}>
      {/* R4-f2: coral-to-white screen gradient */}
      <LinearGradient colors={screenGrad.colors as any} locations={screenGrad.locations as any} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* R3-39: Meal History surfaced from the tab */}
        <View style={styles.header}>
          <View style={{ width: 86 }} />
          <Text style={styles.headerTitle}>{t('mob.today', 'Today')}</Text>
          <Pressable onPress={() => nav.navigate('MealHistory')} hitSlop={8} style={styles.histLink}>
            <Text style={styles.histLinkTxt}>{t('mob.history', 'History')} ›</Text>
          </Pressable>
        </View>
        <View style={styles.tabs}>
          {(['tip', 'insight'] as const).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
              <Text style={[styles.tabTxt, tab === k && styles.tabTxtOn]}>
                {k === 'tip' ? t('mob.dailyTip', 'Daily Tip') : t('mob.bodyInsight', 'Body Insight')}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.badge}>{badge}</Text>
              <Text style={styles.headline}>
                {tab === 'tip' ? (tip?.headline ?? t('mob.tipFallback', 'Eat with your phase today')) : (ins?.headline ?? '')}
              </Text>
              <Text style={styles.body}>{tab === 'tip' ? (tip?.body ?? '') : (ins?.body ?? '')}</Text>
              {tab === 'tip' && tip?.why ? <Text style={styles.why}>{tip.why}</Text> : null}
            </View>
            <Image
              source={tab === 'tip' ? TIP_CHARS[charIdx] : require('../../../assets/nutrilog/insight-character.png')}
              style={styles.character} resizeMode="contain"
            />
          </View>

          {tab === 'tip' ? (
            <View style={styles.statRow}>
              <View style={styles.stat}>
                <View style={styles.statHead}><MealIcon /><Text style={styles.statTag}>FUEL</Text></View>
                <Text style={styles.statVal}>{meals} / 3</Text>
                <Text style={styles.statLbl}>{t('mob.mealsLogged', 'Meals Logged')}</Text>
              </View>
              <View style={styles.stat}>
                <View style={styles.statHead}><DropIcon /><Text style={styles.statTag}>VITALITY</Text></View>
                <Text style={styles.statVal}>1.8 L</Text>
                <Text style={styles.statLbl}>{t('mob.hydrationRec', 'Hydration Rec')}</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.statRow}>
                <Pressable style={styles.pillStat} onPress={cycleMood}>
                  <Image source={require('../../../assets/nutrilog/mood.png')} style={styles.pillIcon} />
                  <Text style={styles.pillLbl}>{t('mob.mood', 'Mood')}</Text>
                  <Text style={styles.pillVal}>{quick.mood ? MOODS[quick.mood - 1] : '—'}</Text>
                </Pressable>
                <Pressable style={styles.pillStat} onPress={cycleEnergy}>
                  <Image source={require('../../../assets/nutrilog/energy.png')} style={styles.pillIcon} />
                  <Text style={styles.pillLbl}>{t('mob.energy', 'Energy')}</Text>
                  <Text style={styles.pillVal}>{quick.energy ? ENERGY[quick.energy - 1] : '—'}</Text>
                </Pressable>
                <Pressable style={styles.pillStat} onPress={cycleFlow}>
                  <Image source={require('../../../assets/nutrilog/flow.png')} style={styles.pillIcon} />
                  <Text style={styles.pillLbl}>{t('mob.flow', 'Flow')}</Text>
                  <Text style={styles.pillVal}>{quick.flow_level != null ? FLOWS[quick.flow_level] : '—'}</Text>
                </Pressable>
              </View>
              <Text style={styles.section}>{t('mob.todaysSymptoms', "Today's Symptoms")}</Text>
              <View style={styles.tagRow}>
                {SYMPTOMS.map((s) => {
                  const on = quick.pain_symptoms.includes(s);
                  return (
                    <Pressable key={s} onPress={() => toggleSymptom(s)} style={[styles.tag, on && styles.tagOn]}>
                      <Text style={[styles.tagTxt, on && styles.tagTxtOn]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {ins?.quote ? (
                <View style={styles.quote}><Text style={styles.quoteTxt}>“{ins.quote}”</Text></View>
              ) : null}
            </>
          )}

          <Text style={styles.section}>{t('mob.checkOffEat', 'Check off what you eat today')}</Text>
          {cats.map(([c, items]) => (
            <View key={c} style={styles.group}>
              <Text style={styles.groupTitle}>{c}</Text>
              {items.map((i) => {
                const on = checked.has(i.name);
                return (
                  <Pressable key={i.id} onPress={() => toggle(i.name)} style={styles.row}>
                    <Image source={on ? require('../../../assets/nutrilog/checked.png') : require('../../../assets/nutrilog/unchecked.png')} style={styles.box} />
                    <Text style={[styles.rowTxt, on && styles.rowTxtOn]}>{i.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <Pressable style={styles.cta} onPress={() => nav.navigate('MealLog')}>
          <Text style={styles.ctaTxt}>+ {t('mob.logTodaysMeal', "Log Today's Meal")}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingHorizontal: 18 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  histLink: { width: 86, alignItems: 'flex-end' },
  histLinkTxt: { fontFamily: font.semibold, fontSize: 13, color: colors.coralDeep },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabs: { flexDirection: 'row', marginHorizontal: 18, marginTop: 12, backgroundColor: '#F6EEE7', borderRadius: radius.pill, padding: 4, gap: 4 },
  tab: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.white, ...shadow.card },
  tabTxt: { fontFamily: font.medium, fontSize: 13.5, color: colors.muted },
  tabTxtOn: { color: colors.ink, fontFamily: font.semibold },
  card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, ...shadow.card, alignItems: 'center', marginTop: 4 },
  badge: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 1, color: colors.coral },
  headline: { fontFamily: font.semibold, fontSize: 17, color: colors.ink, marginTop: 6, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  why: { fontFamily: font.regular, fontSize: 11.5, color: '#3E7357', marginTop: 8, lineHeight: 16 },
  character: { width: 74, height: 92 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, ...shadow.card },
  statTag: { fontFamily: font.semibold, fontSize: 9.5, letterSpacing: 1.2, color: colors.coral },
  statVal: { fontFamily: font.bold, fontSize: 22, color: colors.ink, marginTop: 4 },
  statLbl: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  pillStat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, alignItems: 'center', ...shadow.card },
  pillIcon: { width: 22, height: 22, marginBottom: 4 },
  pillLbl: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  pillVal: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink, marginTop: 1 },
  section: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 20, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: '#EADFD5' },
  tagOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  tagTxt: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  tagTxtOn: { color: '#fff' },
  quote: { backgroundColor: '#FDF0E7', borderRadius: radius.lg, padding: 14, marginTop: 14 },
  quoteTxt: { fontFamily: font.medium, fontSize: 13, color: '#8A5A3B', fontStyle: 'italic', lineHeight: 19, textAlign: 'center' },
  group: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10, ...shadow.card },
  groupTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.coral, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10, borderTopWidth: 1, borderTopColor: '#F7F0E9' },
  box: { width: 20, height: 20 },
  rowTxt: { fontFamily: font.regular, fontSize: 14, color: colors.ink },
  rowTxtOn: { color: colors.muted, textDecorationLine: 'line-through' },
  // R3-38: bottom 84 — the floating tab bar sits at bottom 10–72 and was HIDING this CTA
  cta: { position: 'absolute', left: 20, right: 20, bottom: 84, backgroundColor: colors.coral, borderRadius: radius.pill, height: 52, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  ctaTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
});
