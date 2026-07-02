import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, font, radius, shadow } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { saveEditPeriod } from '../../lib/daily';
import { ChipGroup } from '../../ui/Chips';

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
  const [flow, setFlow] = useState<number | null>(null);
  const [moods, setMoods] = useState<string[]>([]);
  const [sym, setSym] = useState<Record<string, string[]>>({});
  const [sleep, setSleep] = useState<string[]>([]);
  const [libido, setLibido] = useState<number | null>(null);
  const [birth, setBirth] = useState<string[]>([]);
  const [sex, setSex] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
    } catch {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}><Text style={styles.x}>✕</Text></Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>Period</Text>
            <Text style={styles.date}>March 11th, 2026</Text>
          </View>
          <Pressable onPress={save} style={styles.iconBtn}>
            {saving ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.tick}>✓</Text>}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {/* Flow */}
          <View style={styles.card}>
            <Text style={styles.h}>Flow</Text>
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
            <Text style={styles.h}>Mood &amp; Mental State</Text>
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
          <Text style={styles.section}>Physical Symptoms</Text>
          <View style={styles.card}>
            {PERSIST_SECTIONS.map((s) => (
              <ChipGroup key={s.key} title={s.title} options={s.options} selected={sym[s.key] ?? []} onToggle={(v) => toggleSym(s.key, v)} />
            ))}
            <ChipGroup title="Sleep Quality" options={SLEEP} selected={sleep} single onToggle={(v) => setSleep([v])} />
          </View>

          {/* Libido */}
          <View style={styles.card}>
            <Text style={styles.h}>Libido</Text>
            <View style={styles.libRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setLibido(n)} style={[styles.libDot, libido != null && n <= libido && styles.libOn]} />
              ))}
            </View>
          </View>

          {/* Birth control + sex log */}
          <View style={styles.card}>
            <ChipGroup title="Birth Control" options={BIRTH} selected={birth} onToggle={(v) => toggle(birth, setBirth, v)} />
            <Text style={[styles.h, { marginTop: 16 }]}>Sex Log</Text>
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

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.h}>Add notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Enter a description..." placeholderTextColor={colors.faint} multiline style={styles.notes} />
          </View>

          <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  x: { fontSize: 20, color: colors.ink },
  tick: { fontSize: 20, color: colors.coral, fontFamily: font.bold },
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
});
