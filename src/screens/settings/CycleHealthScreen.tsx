import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';

/**
 * F43/F46 — Cycle & Health Information (Settings). Its own page (previously the
 * row wrongly opened Edit Period): current cycle anchors + contraception +
 * diagnosed conditions. Uses the same token storage as Edit Health.
 */

const CONDITIONS = ['Adenomyosis', 'Irregular Cycles', 'Hypothyroidism', 'PMOS', 'Endometriosis', "Hashimoto's", 'Heavy menstrual bleeding', 'Hyperthyroidism'];
const CONTRA = [
  { k: 'yes_currently', label: 'Yes, currently' },
  { k: 'not_anymore', label: 'Not anymore' },
  { k: 'never', label: 'Never' },
];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').replace(/^pcos$/, 'pmos');

// Hoisted field (never re-created per keystroke — same F44 fix pattern).
function Field({ label, value, onChange, ...p }: { label: string; value: string; onChange: (v: string) => void } & any) {
  return (
    <View style={fstyles.wrap}>
      <Text style={fstyles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={fstyles.input} placeholderTextColor={colors.faint} {...p} />
    </View>
  );
}
const fstyles = StyleSheet.create({
  wrap: { marginTop: 12 },
  label: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted, marginBottom: 5 },
  input: { backgroundColor: colors.white, borderRadius: radius.md, height: 50, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 14.5, color: colors.ink, ...shadow.card },
});

export default function CycleHealthScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState('');
  const [len, setLen] = useState('28');
  const [dur, setDur] = useState('5');
  const [contra, setContra] = useState<string | null>(null);
  const [conds, setConds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const [{ data: c }, { data: u }] = await Promise.all([
        supabase.from('cycles').select('last_period_start_date,cycle_length,period_duration').eq('user_id', userId).limit(1).maybeSingle(),
        supabase.from('users').select('contraception_status,health_conditions').eq('id', userId).maybeSingle(),
      ]);
      if (c) { setStart((c as any).last_period_start_date ?? ''); setLen(String((c as any).cycle_length ?? 28)); setDur(String((c as any).period_duration ?? 5)); }
      if (u) { setContra((u as any).contraception_status ?? null); setConds(((u as any).health_conditions ?? []) as string[]); }
      setLoading(false);
    })();
  }, [userId]);

  const toggleCond = (label: string) => {
    const tok = norm(label);
    setConds((p) => p.map(norm).includes(tok) ? p.filter((x) => norm(x) !== tok) : [...p, tok]);
  };

  const save = async () => {
    if (!userId) return;
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) { Alert.alert('Date format', 'Last period start must be YYYY-MM-DD.'); return; }
    setSaving(true);
    try {
      const cyc = { last_period_start_date: start || null, cycle_length: parseInt(len, 10) || 28, period_duration: parseInt(dur, 10) || 5 };
      const { data: ex } = await supabase.from('cycles').select('user_id').eq('user_id', userId).limit(1);
      if (ex && ex.length) await supabase.from('cycles').update(cyc).eq('user_id', userId);
      else await supabase.from('cycles').insert({ user_id: userId, ...cyc });
      await supabase.from('users').update({ contraception_status: contra, health_conditions: conds }).eq('id', userId);
      navigation.goBack();
    } catch { Alert.alert('Could not save', 'Check your connection and try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.cycleHealth', 'Cycle & Health Information')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.section}>{t('mob.currentCycle', 'CURRENT CYCLE')}</Text>
          <Field label={t('mob.lastPeriodStart', 'Last period start (YYYY-MM-DD)')} value={start} onChange={setStart} placeholder="2026-07-01" autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Field label={t('mob.cycleLength', 'Cycle length (days)')} value={len} onChange={setLen} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Field label={t('mob.periodDuration', 'Period duration (days)')} value={dur} onChange={setDur} keyboardType="numeric" /></View>
          </View>

          <Text style={styles.section}>{t('mob.contraception', 'HORMONAL CONTRACEPTION')}</Text>
          <View style={styles.chipRow}>
            {CONTRA.map((o) => {
              const on = contra === o.k;
              return (
                <Pressable key={o.k} onPress={() => setContra(on ? null : o.k)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>{t('mob.healthConditionsCaps', 'DIAGNOSED CONDITIONS')}</Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map((c) => {
              const on = conds.map(norm).includes(norm(c));
              return (
                <Pressable key={c} onPress={() => toggleCond(c)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={save} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{t('ui.saveChanges', 'Save changes')}</Text>}
          </Pressable>
          <Text style={styles.note}>{t('mob.cycleRecalc', 'Changing the cycle start recalculates your phase and daily guidance immediately.')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24, marginTop: -3 },
  headerTitle: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  section: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 22, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: '#EADFD5' },
  chipOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  chipTxt: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  chipTxtOn: { color: '#fff' },
  saveBtn: { marginTop: 26, backgroundColor: colors.coral, borderRadius: radius.pill, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12 },
});
