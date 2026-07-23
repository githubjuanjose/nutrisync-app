import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, TextInput } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow, screenGrad } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile } from '../../lib/api';
import { pickVariantIndex } from '../../ui/NutriAvatar';
import { saveChecklist } from '../../lib/daily';
import { fetchDailyRecs, DailyRecs, fetchCheckedToday, RecItem } from '../../lib/recs';

/**
 * R2-D · Movement Log — screens 1+2 (Daily Tip / Body Insight, movement context).
 * Activities are selected INDIVIDUALLY per category (closes W2 fully on mobile:
 * no select-all, plus a "+ Other" custom input). The highest checked intensity
 * feeds workout_logged/CAS via saveChecklist — checking more items never
 * inflates the score (POs' Scoring Rule 1).
 */

/* R3-41 (f47): line icons above Workouts / Steps — no emojis */
const DumbbellIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" stroke="#E4572E" strokeWidth={1.9} strokeLinecap="round" />
  </Svg>
);
const StepsIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M7 3c2 0 3 1.6 3 3.4 0 1.8-.8 3-2.4 3S5 8.2 5 6.4C5 4.6 5.6 3 7 3Z" stroke="#E4572E" strokeWidth={1.6} fill="none" />
    <Path d="M6 11.5h3.4c.3 1.8-.2 3.5-1.7 3.5s-2-1.7-1.7-3.5Z" stroke="#E4572E" strokeWidth={1.5} fill="none" />
    <Path d="M17 9c2 0 3 1.6 3 3.4 0 1.8-.8 3-2.4 3S15 14.2 15 12.4c0-1.8.6-3.4 2-3.4Z" stroke="#E4572E" strokeWidth={1.6} fill="none" />
    <Path d="M16 17.5h3.4c.3 1.8-.2 3.5-1.7 3.5s-2-1.7-1.7-3.5Z" stroke="#E4572E" strokeWidth={1.5} fill="none" />
  </Svg>
);

const CAT_ORDER = ['Strength', 'Cardio', 'Flexibility & Recovery', 'Daily Movement'];
const PER_CATEGORY = 6;
// Official per-Nutri daily-tip characters (approved assets 17 Jul)
const TIP_CHARS = [
  require('../../../assets/movementlog/tip-char-1.png'),
  require('../../../assets/movementlog/tip-char-2.png'),
  require('../../../assets/movementlog/tip-char-3.png'),
  require('../../../assets/movementlog/tip-char-4.png'),
];

export default function MovementLogScreen() {
  const t = useT();
  const nav = useNavigation<any>();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'tip' | 'insight'>('tip');
  const [recs, setRecs] = useState<DailyRecs | null>(null);
  const [charIdx, setCharIdx] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [others, setOthers] = useState<string[]>([]);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherTxt, setOtherTxt] = useState('');

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    getProfile(userId).then((p: any) => setCharIdx(pickVariantIndex(p?.nutri_avatar))).catch(() => {});
    const [r, ck] = await Promise.all([fetchDailyRecs(), fetchCheckedToday(userId, 'movement_checklist')]);
    setRecs(r); setChecked(ck);
    const known = new Set(Object.values(r?.movement_basics ?? {}).flat().map((i) => i.name));
    setOthers([...ck].filter((n) => !known.has(n)));
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingView />;

  const map = recs?.movement_basics ?? {};
  const cats: [string, RecItem[]][] = Object.entries(map)
    .sort((a, b) => {
      const ia = CAT_ORDER.indexOf(a[0]); const ib = CAT_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map(([c, items]) => [c, items.slice(0, PER_CATEGORY)]);
  const badge = recs ? `${(recs.phase || '').toUpperCase()} PHASE, DAY ${recs.cycle_day}` : '';
  const tip = recs?.movement_tip; const ins = recs?.movement_insight;
  const workoutsDone = checked.size;

  const persist = async (next: Set<string>, nextOthers: string[]) => {
    if (!userId) return;
    const rows = [
      ...cats.flatMap(([c, items]) => items.filter((i) => next.has(i.name)).map((i) => ({
        item_name: i.name, category_tag: c.toLowerCase(),
        intensity_level: (i.intensity ?? '').toLowerCase().replace(/[^a-z]+/g, '_') || null,
        phase: recs?.phase ?? null, checked: true,
      }))),
      ...nextOthers.filter((n) => next.has(n)).map((n) => ({
        item_name: n, category_tag: 'other', intensity_level: null, phase: recs?.phase ?? null, checked: true,
      })),
    ];
    try { await saveChecklist(userId, 'movement_checklist', rows); } catch {}
  };

  const toggle = (name: string) => {
    const next = new Set(checked);
    next.has(name) ? next.delete(name) : next.add(name);
    setChecked(next); persist(next, others);
  };
  const addOther = () => {
    const n = otherTxt.trim();
    if (!n) { setOtherOpen(false); return; }
    const nextOthers = others.includes(n) ? others : [...others, n];
    const next = new Set(checked); next.add(n);
    setOthers(nextOthers); setChecked(next); setOtherTxt(''); setOtherOpen(false);
    persist(next, nextOthers);
  };

  return (
    <View style={styles.fill}>
      {/* R4-f2: coral-to-white screen gradient */}
      <LinearGradient colors={screenGrad.colors as any} locations={screenGrad.locations as any} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* R3-43: Movement History surfaced from the tab */}
        <View style={styles.header}>
          <View style={{ width: 86 }} />
          <Text style={styles.headerTitle}>{t('mob.today', 'Today')}</Text>
          <Pressable onPress={() => nav.navigate('MovementHistory')} hitSlop={8} style={styles.histLink}>
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
                {tab === 'tip' ? (tip?.headline ?? t('mob.moveTipFallback', 'Move with your phase today')) : (ins?.headline ?? '')}
              </Text>
              <Text style={styles.body}>{tab === 'tip' ? (tip?.body ?? '') : (ins?.body ?? '')}</Text>
              {tab === 'tip' && tip?.why ? <Text style={styles.why}>{tip.why}</Text> : null}
              {tab === 'insight' && ins?.recovery_need ? (
                <Text style={styles.why}>{t('mob.recovery', 'Recovery')}: {ins.recovery_need}</Text>
              ) : null}
            </View>
            <Image
              source={tab === 'tip' ? TIP_CHARS[charIdx] : require('../../../assets/movementlog/insight-character.png')}
              style={styles.character} resizeMode="contain"
            />
          </View>

          <View style={styles.statRow}>
            <View style={styles.stat}>
              <View style={styles.statHead}><DumbbellIcon /><Text style={styles.statTag}>SESSION</Text></View>
              <Text style={styles.statVal}>{workoutsDone > 0 ? '1 / 1' : '0 / 1'}</Text>
              <Text style={styles.statLbl}>{t('mob.workouts', 'Workouts')}</Text>
            </View>
            <View style={styles.stat}>
              <View style={styles.statHead}><StepsIcon /><Text style={styles.statTag}>STEPS</Text></View>
              <Text style={styles.statVal}>—</Text>
              <Text style={styles.statLbl}>{t('mob.stepsSync', 'Syncs with devices')}</Text>
            </View>
          </View>

          {tab === 'insight' && ins?.quote ? (
            <View style={styles.quote}><Text style={styles.quoteTxt}>“{ins.quote}”</Text></View>
          ) : null}

          {/* R3-41 (f47/f48): section header + score subheading */}
          <Text style={styles.section}>{t('mob.movementBasics', 'Movement basics')}</Text>
          <Text style={styles.sectionSub}>{t('mob.checkOffMove', 'Check off your movement for today')}</Text>
          <Text style={styles.sectionNote}>{t('mob.boostsScore', 'Each one boosts your cycle sync score')}</Text>
          {cats.map(([c, items]) => (
            <View key={c} style={styles.group}>
              <Text style={styles.groupTitle}>{c}</Text>
              {items.map((i) => {
                const on = checked.has(i.name);
                return (
                  <Pressable key={i.id} onPress={() => toggle(i.name)} style={styles.row}>
                    <Image source={on ? require('../../../assets/nutrilog/checked.png') : require('../../../assets/nutrilog/unchecked.png')} style={styles.box} />
                    <Text style={[styles.rowTxt, on && styles.rowTxtOn]}>{i.name}</Text>
                    {i.intensity ? <Text style={styles.intensity}>{i.intensity}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}

          {others.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>{t('mob.other', 'Other')}</Text>
              {others.map((n) => {
                const on = checked.has(n);
                return (
                  <Pressable key={n} onPress={() => toggle(n)} style={styles.row}>
                    <Image source={on ? require('../../../assets/nutrilog/checked.png') : require('../../../assets/nutrilog/unchecked.png')} style={styles.box} />
                    <Text style={[styles.rowTxt, on && styles.rowTxtOn]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {otherOpen ? (
            <View style={styles.otherRow}>
              <TextInput value={otherTxt} onChangeText={setOtherTxt} autoFocus
                placeholder={t('mob.otherPh', 'e.g. Padel, climbing…')} placeholderTextColor={colors.faint}
                style={styles.otherInput} onSubmitEditing={addOther} returnKeyType="done" />
              <Pressable onPress={addOther} style={styles.otherAdd}><Text style={styles.otherAddTxt}>✓</Text></Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setOtherOpen(true)} style={styles.otherBtn}>
              <Text style={styles.otherBtnTxt}>+ {t('mob.other', 'Other')}</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* R3-42: primary CTA lifted ABOVE the floating tab bar (was hidden under it) */}
        <Pressable style={styles.cta} onPress={() => nav.navigate('LogMovement')}>
          <Text style={styles.ctaTxt}>+ {t('mob.logTodaysMovement', "Log Today's Movement")}</Text>
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
  sectionSub: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink, marginTop: 2 },
  sectionNote: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 8 },
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
  quote: { backgroundColor: '#FDF0E7', borderRadius: radius.lg, padding: 14, marginTop: 14 },
  quoteTxt: { fontFamily: font.medium, fontSize: 13, color: '#8A5A3B', fontStyle: 'italic', lineHeight: 19, textAlign: 'center' },
  section: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 20, marginBottom: 8 },
  group: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 10, ...shadow.card },
  groupTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.coral, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 10, borderTopWidth: 1, borderTopColor: '#F7F0E9' },
  box: { width: 20, height: 20 },
  rowTxt: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.ink },
  rowTxtOn: { color: colors.muted },
  intensity: { fontFamily: font.semibold, fontSize: 10.5, color: colors.faint },
  otherBtn: { borderWidth: 1.5, borderColor: colors.coral, borderStyle: 'dashed', borderRadius: radius.pill, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  otherBtnTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.coral },
  otherRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  otherInput: { flex: 1, backgroundColor: colors.white, borderRadius: radius.pill, height: 46, paddingHorizontal: 16, fontFamily: font.regular, fontSize: 14, color: colors.ink, ...shadow.card },
  otherAdd: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  otherAddTxt: { color: '#fff', fontFamily: font.bold, fontSize: 16 },
  // R3-42: bottom 84 — the floating tab bar was hiding this CTA
  cta: { position: 'absolute', left: 20, right: 20, bottom: 84, backgroundColor: colors.coral, borderRadius: radius.pill, height: 52, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  ctaTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
});
