import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, font, radius, shadow, screenGrad } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { saveEditPeriod, getTodayLog, recomputeCAS } from '../../lib/daily';
import { startNewCycle } from '../../lib/api';
import { ChipGroup } from '../../ui/Chips';
import { useT } from '../../i18n';

/**
 * R3-14/15/16/17 (f27–f30):
 *  • header shows TODAY's real date (was hardcoded "March 11th, 2026")
 *  • soft peach gradient background (was dark)
 *  • pencil in the header → full-screen notes editor (keyboard never covers it)
 *  • today's saved log is RELOADED on open, and save errors surface instead of
 *    being swallowed — logging is visibly persistent now
 */

/* ---------- Mood faces — exact emotes extracted from the Figma edit-period design ---------- */
const EMOTE: Record<string, any> = {
  calm: require('../../../assets/emotes/calm.png'),
  content: require('../../../assets/emotes/content.png'),
  worried: require('../../../assets/emotes/worried.png'),
  anxious: require('../../../assets/emotes/anxious.png'),
  happy: require('../../../assets/emotes/happy.png'),
  mad: require('../../../assets/emotes/mad.png'),
  sad: require('../../../assets/emotes/sad.png'),
  nervous: require('../../../assets/emotes/nervous.png'),
  brainfog: require('../../../assets/emotes/brainfog.png'),
  distracted: require('../../../assets/emotes/distracted.png'),
  mischievous: require('../../../assets/emotes/mischievous.png'),
  clear: require('../../../assets/emotes/clear.png'),
};
const MOOD_NAMES = ['calm', 'content', 'worried', 'anxious', 'happy', 'mad', 'sad', 'nervous', 'brainfog', 'distracted', 'mischievous', 'clear'];

/* ---------- Flow droplet ---------- */
function Droplet({ size = 16, color = colors.coral }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 C12 2 4 11 4 16 a8 8 0 0 0 16 0 C20 11 12 2 12 2 Z" fill={color} />
    </Svg>
  );
}

/* ---------- symptom sections that persist to daily_logs ---------- */
const PERSIST_SECTIONS: { key: string; title: string; options: string[] }[] = [
  { key: 'pain', title: 'Pain', options: ['Uterine cramps', 'Muscle soreness', 'Lower back pain', 'Pelvic aches', 'Headaches/Migraines', 'Joint pain'] },
  { key: 'digestion', title: 'Digestion', options: ['Bloating', 'Nausea', 'Constipation', 'Loose stool'] },
  { key: 'cravings', title: 'Cravings', options: ['Mild', 'Strong', 'Random', 'Carbs', 'Chocolate', 'Sweet'] },
  { key: 'skin', title: 'Skin', options: ['Acne', 'Oily', 'Sensitivity', 'Dry', 'Rash/Irritation'] },
];
const SLEEP = ['Very Poor', 'Okay', 'Restless', 'Restful', 'Deep'];
const BIRTH = ['Condom', 'Patch', 'Ring', 'Pill'];

export default function EditPeriodScreen({ navigation }: any) {
  const { userId } = useSession();
  const t = useT();
  const [flow, setFlow] = useState<number | null>(null);
  const [moods, setMoods] = useState<string[]>([]);
  const [sym, setSym] = useState<Record<string, string[]>>({});
  const [sleep, setSleep] = useState<string[]>([]);
  const [libido, setLibido] = useState<number | null>(null);
  const [birth, setBirth] = useState<string[]>([]);
  const [sex, setSex] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // R4-f31: log a new period start → starts a new cycle at Day 1
  const [lpOpen, setLpOpen] = useState(false);
  const [lpMonth, setLpMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [lpSel, setLpSel] = useState<Date | null>(null);
  const [lpSaving, setLpSaving] = useState(false);

  const startCycle = async () => {
    if (!userId || !lpSel || lpSaving) return;
    setLpSaving(true);
    try {
      const iso = `${lpSel.getFullYear()}-${String(lpSel.getMonth() + 1).padStart(2, '0')}-${String(lpSel.getDate()).padStart(2, '0')}`;
      await startNewCycle(userId, iso);
      await recomputeCAS(userId);
      setLpOpen(false); setLpSel(null);
      Alert.alert(
        t('mob.periodLogged', 'Period logged'),
        t('mob.cycleRestarted', 'A new cycle has started from the date you picked. Your averages now use your real cycle lengths.')
      );
    } catch (e: any) {
      Alert.alert(t('mob.saveFailed', 'Could not save'), e?.message ?? t('mob.tryAgain', 'Please try again.'));
    } finally {
      setLpSaving(false);
    }
  };

  // R3-17: reload today's saved log so reopening shows what you logged
  useEffect(() => {
    if (!userId) return;
    getTodayLog(userId).then((l: any) => {
      if (!l) return;
      if (l.flow_level != null) setFlow(l.flow_level);
      if (Array.isArray(l.mood_state)) setMoods(l.mood_state);
      setSym({ pain: l.pain_symptoms ?? [], digestion: l.digestion_symptoms ?? [], cravings: l.cravings ?? [], skin: l.skin_symptoms ?? [] });
      if (l.sleep_quality) setSleep([l.sleep_quality]);
      if (l.libido != null) setLibido(l.libido);
      if (l.sex_logged === 'protected') setSex(['Protected']);
      if (l.sex_logged === 'unprotected') setSex(['Unprotected']);
      if (l.period_notes) setNotes(l.period_notes);
    }).catch(() => {});
  }, [userId]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleSym = (key: string, v: string) =>
    setSym((p) => { const cur = p[key] ?? []; return { ...p, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }; });

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await saveEditPeriod(userId, {
        flow_level: flow,
        mood_state: moods,
        pain_symptoms: sym.pain ?? [],
        digestion_symptoms: sym.digestion ?? [],
        cravings: sym.cravings ?? [],
        skin_symptoms: sym.skin ?? [],
        sleep_quality: sleep[0] ?? null,
        libido,
        sex_logged: sex.includes('Unprotected') ? 'unprotected' : sex.includes('Protected') ? 'protected' : null,
        period_notes: notes.trim() || null,
      });
      navigation.goBack();
    } catch (e: any) {
      // R3-17: never pretend a failed save worked
      setSaving(false);
      Alert.alert(t('mob.saveFailed', 'Could not save'), e?.message ?? t('mob.tryAgain', 'Please try again.'));
    }
  };

  const todayLabel = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <View style={styles.fill}>
      <LinearGradient colors={screenGrad.colors as any} locations={screenGrad.locations as any} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Text style={styles.x}>✕</Text></Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>{t('mob.period', "Period")}</Text>
            <Text style={styles.date}>{todayLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* R5-f3: wireframe btn-notes pill (white pill + pencil + "Notes") */}
            <Pressable onPress={() => setNotesOpen(true)} style={styles.notesBtn}>
              <Svg width={16} height={16} viewBox="0 0 18 18">
                <Path d="M9.75 15.25H15.75M15.88 4.6a1.6 1.6 0 0 0-2.26-2.26L3.6 12.35a1 1 0 0 0-.25.42l-.99 3.26a.25.25 0 0 0 .31.31l3.26-.99a1 1 0 0 0 .42-.25L15.88 4.6Z" stroke="#25292A" strokeWidth={1.8} strokeLinecap="round" fill="none" />
              </Svg>
              <Text style={styles.notesBtnTxt}>{t('mob.notesBtn', 'Notes')}</Text>
            </Pressable>
            <Pressable onPress={save} style={styles.iconBtn}>
              {saving ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.tick}>✓</Text>}
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* R4-f31: log period → new cycle starts on the chosen date */}
          <Pressable onPress={() => setLpOpen(true)} style={styles.lpBtn}>
            <Droplet size={16} color="#fff" />
            <Text style={styles.lpTxt}>{t('mob.logPeriod', 'Log period')}</Text>
            <Text style={styles.lpSub}>{t('mob.logPeriodSub', 'starts a new cycle')}</Text>
          </Pressable>

          {/* Flow */}
          <View style={styles.card}>
            <Text style={styles.h}>{t('ui.flow', 'Flow')}</Text>
            <View style={styles.flowRow}>
              {[1, 2, 3, 4].map((n) => (
                <Pressable key={n} onPress={() => setFlow(n)} style={[styles.flowCircle, flow === n && styles.flowOn]}>
                  <View style={styles.flowDrops}>
                    {Array.from({ length: n }).map((_, i) => <Droplet key={i} size={13} color={flow === n ? '#fff' : colors.coral} />)}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Mood & Mental State */}
          <View style={styles.card}>
            <Text style={styles.h}>{t('ui.moodMental', 'Mood & Mental State')}</Text>
            <View style={styles.moodGrid}>
              {MOOD_NAMES.map((m) => {
                const on = moods.includes(m);
                return (
                  <Pressable key={m} onPress={() => toggle(moods, setMoods, m)} style={styles.moodCell}>
                    <Image source={EMOTE[m]} style={[styles.emote, !on && { opacity: 0.4 }]} />
                    <Text style={[styles.moodLabel, on && { color: colors.coralDeep, fontFamily: font.semibold }]}>{m}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Physical symptoms */}
          <Text style={styles.section}>{t('ui.physSymptoms', 'Physical Symptoms')}</Text>
          <View style={styles.card}>
            {PERSIST_SECTIONS.map((s) => (
              <ChipGroup key={s.key} title={s.title} options={s.options} selected={sym[s.key] ?? []} onToggle={(v) => toggleSym(s.key, v)} />
            ))}
            <ChipGroup title={t('mob.sleepQuality', "Sleep Quality")} options={SLEEP} selected={sleep} single onToggle={(v) => setSleep([v])} />
          </View>

          {/* Libido */}
          <View style={styles.card}>
            <Text style={styles.h}>{t('ui.libido', 'Libido')}</Text>
            <View style={styles.libRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setLibido(n)} style={[styles.libDot, libido != null && n <= libido && styles.libOn]} />
              ))}
            </View>
          </View>

          {/* Birth control + sex log */}
          <View style={styles.card}>
            <ChipGroup title={t('ui.birthControl', 'Birth Control')} options={BIRTH} selected={birth} onToggle={(v) => toggle(birth, setBirth, v)} />
            <Text style={[styles.h, { marginTop: 16 }]}>{t('mob.sexLog', "Sex Log")}</Text>
            <View style={{ gap: 8, marginTop: 6 }}>
              {['Protected', 'Unprotected'].map((s) => {
                const on = sex.includes(s);
                return (
                  <Pressable key={s} onPress={() => toggle(sex, setSex, s)} style={[styles.sexRow, on && styles.sexOn]}>
                    <Text style={{ color: on ? colors.coralDeep : colors.faint }}>{on ? '★' : '☆'}</Text>
                    <Text style={[styles.sexTxt, on && { color: colors.coralDeep }]}>{s} Sex</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* R5-f4: bottom "Add notes" card removed — notes live behind the
              header Notes button only (single entry point) */}

          <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveTxt}>{saving ? 'Saving…' : t('ui.saveLog', 'Save')}</Text>
          </Pressable>
        </ScrollView>

        {/* R4-f31: mini calendar — pick the day the period started */}
        {lpOpen && (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const y = lpMonth.getFullYear(), m = lpMonth.getMonth();
          const off = new Date(y, m, 1).getDay(); // Sunday-first (D2)
          const nDays = new Date(y, m + 1, 0).getDate();
          const cells: (Date | null)[] = [
            ...Array.from({ length: off }, () => null),
            ...Array.from({ length: nDays }, (_, i) => new Date(y, m, i + 1)),
          ];
          const monthLabel = lpMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
          return (
            <View style={styles.notesOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setLpOpen(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(28,23,21,.45)' }} />
              </Pressable>
              <View style={styles.lpSheet}>
                <Text style={styles.lpTitle}>{t('mob.whenPeriodStart', 'When did this period start?')}</Text>
                <View style={styles.lpMonthRow}>
                  <Pressable onPress={() => setLpMonth(new Date(y, m - 1, 1))} style={styles.lpArrow}><Text style={styles.lpArrowTxt}>‹</Text></Pressable>
                  <Text style={styles.lpMonthTxt}>{monthLabel}</Text>
                  <Pressable onPress={() => setLpMonth(new Date(y, m + 1, 1))} style={styles.lpArrow}><Text style={styles.lpArrowTxt}>›</Text></Pressable>
                </View>
                <View style={styles.lpGrid}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <Text key={i} style={styles.lpDow}>{d}</Text>
                  ))}
                  {cells.map((d, i) => {
                    if (!d) return <View key={i} style={styles.lpCell} />;
                    const future = d.getTime() > today.getTime();
                    const sel = lpSel && d.toDateString() === lpSel.toDateString();
                    return (
                      <Pressable key={i} disabled={future} onPress={() => setLpSel(d)} style={[styles.lpCell, sel && styles.lpCellOn]}>
                        <Text style={[styles.lpCellTxt, future && { color: '#D8CCC2' }, sel && { color: '#fff', fontFamily: font.bold }]}>{d.getDate()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={startCycle} disabled={!lpSel || lpSaving} style={[styles.saveBtn, { marginTop: 14 }, (!lpSel || lpSaving) && { opacity: 0.5 }]}>
                  <Text style={styles.saveTxt}>
                    {lpSaving ? t('ui.saving', 'Saving…') : lpSel
                      ? `${t('mob.startCycleOn', 'Start new cycle on')} ${lpSel.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                      : t('mob.pickDay', 'Pick a day')}
                  </Text>
                </Pressable>
                <Text style={styles.lpNote}>{t('mob.noAutoRestart', "Cycles only restart when you log a period — never automatically, even past day 28.")}</Text>
              </View>
            </View>
          );
        })()}

        {/* f29: full-screen notes editor — keyboard can never cover the input */}
        {notesOpen && (
          <View style={styles.notesOverlay}>
            <LinearGradient colors={['#FCF1EC', '#FBE7DB']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                  <Pressable onPress={() => setNotesOpen(false)} style={styles.iconBtn}><Text style={styles.x}>✕</Text></Pressable>
                  <Text style={styles.title}>{t('mob.notes', 'Add notes')}</Text>
                  <Pressable onPress={() => setNotesOpen(false)} style={styles.iconBtn}><Text style={styles.tick}>✓</Text></Pressable>
                </View>
                <TextInput
                  value={notes} onChangeText={setNotes} autoFocus multiline
                  placeholder={t('mob.descPh', 'Enter a description...')} placeholderTextColor={colors.faint}
                  style={styles.notesFull}
                />
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        )}
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
  pencil: { fontSize: 18, color: colors.ink },
  // R5-f3: btn-notes pill
  notesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 15, height: 30, paddingHorizontal: 12 },
  notesBtnTxt: { fontFamily: font.semibold, fontSize: 12.5, color: '#25292A' },
  notesOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  notesFull: { flex: 1, margin: 18, backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, fontFamily: font.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top', ...shadow.card },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.ink },
  date: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 14, ...shadow.card },
  h: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  section: { fontFamily: font.semibold, fontSize: 16, color: colors.ink, marginTop: 20, marginLeft: 4 },
  flowRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  flowCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FBEEE7', alignItems: 'center', justifyContent: 'center' },
  flowOn: { backgroundColor: colors.coral },
  flowDrops: { flexDirection: 'row', flexWrap: 'wrap', width: 34, justifyContent: 'center', gap: 1 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  moodCell: { width: '16.6%', alignItems: 'center', marginBottom: 12 },
  emote: { width: 48, height: 48 },
  moodLabel: { fontFamily: font.regular, fontSize: 9.5, color: colors.muted, marginTop: 3 },
  libRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  libDot: { flex: 1, height: 10, borderRadius: 6, backgroundColor: '#EFE2D7' },
  libOn: { backgroundColor: colors.coral },
  sexRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, height: 40 },
  sexOn: { borderColor: colors.coral, backgroundColor: '#FDECE6' },
  sexTxt: { fontFamily: font.regular, fontSize: 14, color: colors.ink },
  notes: { minHeight: 90, backgroundColor: '#FBF6F2', borderRadius: radius.md, padding: 14, marginTop: 10, fontFamily: font.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.coral, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
  // R4-f31: log-period button + mini calendar sheet
  lpBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.coral, borderRadius: radius.pill, paddingHorizontal: 18, height: 48, alignSelf: 'stretch', justifyContent: 'center', ...shadow.card },
  lpTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
  lpSub: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,.85)' },
  lpSheet: { position: 'absolute', left: 16, right: 16, top: '16%', backgroundColor: '#fff', borderRadius: radius.lg, padding: 18, ...shadow.card },
  lpTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  lpMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  lpArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBEEE7' },
  lpArrowTxt: { fontSize: 20, color: colors.coral, marginTop: -2 },
  lpMonthTxt: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  lpGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  lpDow: { width: '14.28%', textAlign: 'center', fontFamily: font.semibold, fontSize: 11, color: colors.muted, marginBottom: 4 },
  lpCell: { width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  lpCellOn: { backgroundColor: colors.coral },
  lpCellTxt: { fontFamily: font.regular, fontSize: 14, color: colors.ink },
  lpNote: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 10, lineHeight: 16 },
});
