import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, font, radius, shadow } from '../../theme';
import { PhaseKey, phaseColor } from '../../theme';

export type LogItem = { name: string; tag: string | null };

function MiniRing({ phase, day }: { phase: PhaseKey; day: number }) {
  const c = phaseColor[phase];
  return (
    <View style={{ width: 130, height: 130 }}>
      <Svg width={130} height={130} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={50} stroke="#F3E3DB" strokeWidth={12} fill="none" />
        <Circle cx={60} cy={60} r={50} stroke={c} strokeWidth={12} fill="none" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 50 * 0.72} ${2 * Math.PI * 50}`} transform="rotate(-90 60 60)" />
      </Svg>
      <View style={styles.miniCenter} pointerEvents="none">
        <Text style={[styles.miniPhase, { color: c }]}>{phase[0].toUpperCase() + phase.slice(1)}</Text>
        <Text style={styles.miniDay}>Day {day}</Text>
      </View>
    </View>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <View style={[styles.check, on ? { backgroundColor: '#7FC08A' } : { backgroundColor: '#E7DCD3' }]}>
      {on && (
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Path d="M5 12l4 4 10-10" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

type Props = {
  title: string;
  greeting: string;
  checklistTitle: string;
  items: LogItem[];
  tips: { primary?: string; insight?: string };
  phase: PhaseKey;
  day: number;
  mealTitle: string;
  logging: boolean;
  onLog: (checked: string[], text: string) => void;
};

export default function DailyLogScreen({
  title, greeting, checklistTitle, items, tips, phase, day, mealTitle, logging, onLog,
}: Props) {
  const [tab, setTab] = useState<'tip' | 'insight'>('tip');
  const [checked, setChecked] = useState<Set<string>>(new Set(items.map((i) => i.name)));
  const [text, setText] = useState('');

  // keep checked set in sync when items load
  React.useEffect(() => { setChecked(new Set(items.map((i) => i.name))); }, [items.length]);

  const toggle = (name: string) =>
    setChecked((p) => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.head}>
            <View style={{ flex: 1 }} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.toggle}>
              <Pressable onPress={() => setTab('tip')} style={[styles.tog, tab === 'tip' && styles.togOn]}>
                <Text style={[styles.togTxt, tab === 'tip' && styles.togTxtOn]}>Daily Tip</Text>
              </Pressable>
              <Pressable onPress={() => setTab('insight')} style={[styles.tog, tab === 'insight' && styles.togOn]}>
                <Text style={[styles.togTxt, tab === 'insight' && styles.togTxtOn]}>Body Insight</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.tipRow}>
            <View style={styles.tipCard}>
              <Text style={styles.tipTxt}>{(tab === 'tip' ? tips.primary : tips.insight) ?? '—'}</Text>
            </View>
            <MiniRing phase={phase} day={day} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{checklistTitle}</Text>
            {items.map((it) => {
              const on = checked.has(it.name);
              return (
                <Pressable key={it.name} onPress={() => toggle(it.name)} style={styles.item}>
                  <Check on={on} />
                  <Text style={styles.itemName}>{it.name}</Text>
                  {it.tag ? <Text style={styles.tag}>{it.tag}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.mealCard}>
            <Text style={styles.mealTitle}>{mealTitle}</Text>
            <TextInput
              value={text} onChangeText={setText} placeholder="Enter a description..." placeholderTextColor={colors.faint}
              multiline style={styles.mealInput}
            />
            <Pressable onPress={() => onLog([...checked], text)} disabled={logging} style={styles.logBtn}>
              {logging ? <ActivityIndicator color={colors.coral} /> : <Text style={styles.logTxt}>log today</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  greeting: { fontFamily: font.semibold, fontSize: 14, color: colors.coral },
  title: { fontFamily: font.bold, fontSize: 26, color: colors.ink },
  row: { marginTop: 6 },
  toggle: { flexDirection: 'row', gap: 8 },
  tog: { paddingHorizontal: 16, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  togOn: { backgroundColor: colors.coral },
  togTxt: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  togTxtOn: { color: colors.white },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  tipCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: '#F3D9C9', padding: 14 },
  tipTxt: { fontFamily: font.regular, fontSize: 12.5, color: colors.body, lineHeight: 18 },
  miniCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  miniPhase: { fontFamily: font.semibold, fontSize: 15 },
  miniDay: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, marginTop: 18, ...shadow.card },
  cardTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemName: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink },
  tag: { fontFamily: font.medium, fontSize: 11, color: colors.coralDeep, backgroundColor: '#FBE0D9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  mealCard: { backgroundColor: '#FBEEE7', borderRadius: radius.lg, padding: 18, marginTop: 18 },
  mealTitle: { fontFamily: font.bold, fontSize: 15, color: colors.coral, marginBottom: 10 },
  mealInput: { minHeight: 90, backgroundColor: colors.white, borderRadius: radius.md, padding: 14, fontFamily: font.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top' },
  logBtn: { alignSelf: 'center', marginTop: 14, backgroundColor: colors.white, paddingHorizontal: 26, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  logTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.coral },
});
