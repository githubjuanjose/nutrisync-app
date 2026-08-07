import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { notify } from '../../lib/notify';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useT, useI18n, localeTag } from '../../i18n';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { parseNum, R, inR, isoToDate, dateToIso } from '../../lib/units';
import { WheelSheet } from '../../ui/WheelSheet';

// r11b — barrels: rango válido por construcción
const LEN = Array.from({ length: 76 }, (_, i) => 15 + i);  // 15–90
const DUR = Array.from({ length: 14 }, (_, i) => 1 + i);   // 1–14

/**
 * F43/F46 — Cycle & Health Information (Settings). Its own page (previously the
 * row wrongly opened Edit Period): current cycle anchors + contraception +
 * diagnosed conditions. Uses the same token storage as Edit Health.
 */

// stored tokens unchanged; labels localized via cond.* / contra.* keys
const CONDITIONS = ['Adenomyosis', 'Irregular Cycles', 'Hypothyroidism', 'PMOS', 'Endometriosis', "Hashimoto's", 'Heavy menstrual bleeding', 'Hyperthyroidism'];
const CONTRA = [
  { k: 'yes_currently', tk: 'contra.yes', label: 'Yes, currently' },
  { k: 'not_anymore', tk: 'contra.notanymore', label: 'Not anymore' },
  { k: 'never', tk: 'contra.never', label: 'Never' },
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
  const { lang } = useI18n();
  const lt = localeTag(lang);
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [start, setStart] = useState('');
  const [len, setLen] = useState('28');
  const [dur, setDur] = useState('5');
  const [contra, setContra] = useState<string | null>(null);
  const [conds, setConds] = useState<string[]>([]);
  const [showStart, setShowStart] = useState(false);   // r11a: date picker
  const [wheel, setWheel] = useState<null | 'len' | 'dur'>(null);  // r11b
  const startDate = isoToDate(start);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const [{ data: c }, { data: u }] = await Promise.all([
        supabase.from('cycles').select('id,last_period_start_date,cycle_length,period_duration').eq('user_id', userId).order('last_period_start_date', { ascending: false }).limit(1).maybeSingle(),  /* R8-f29: latest cycle */
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

  // r11a — ranges over canonical values; soft band 21–45 confirms, never blocks (Propuesta 31)
  const doSave = async (nLen: number, nDur: number) => {
    setSaving(true);
    try {
      const cyc = { last_period_start_date: start || null, cycle_length: nLen, period_duration: nDur };
      // R8-f29: update ONLY the latest cycle row — never blanket all history
      const { data: ex } = await supabase.from('cycles').select('id').eq('user_id', userId)
        .order('last_period_start_date', { ascending: false }).limit(1).maybeSingle();
      if (ex) await supabase.from('cycles').update(cyc).eq('id', (ex as any).id);
      else await supabase.from('cycles').insert({ user_id: userId, ...cyc });
      await supabase.from('users').update({ contraception_status: contra, health_conditions: conds }).eq('id', userId);
      navigation.goBack();
    } catch { notify(t('mob.saveFail', 'Could not save'), t('mob.saveFailBody', 'Check your connection and try again.')); }
    finally { setSaving(false); }
  };

  const save = () => {
    if (!userId || saving) return;
    const nLen = parseNum(len), nDur = parseNum(dur);
    if (nLen == null || !Number.isInteger(nLen) || !inR(nLen, R.cycleLen)) {
      notify(t('mob.invalidCycleLen', 'Cycle length must be a whole number between 15 and 90 days.')); return;
    }
    if (nDur == null || !Number.isInteger(nDur) || !inR(nDur, R.periodDur)) {
      notify(t('mob.invalidDur', 'Period duration must be between 1 and 14 days.')); return;
    }
    if (!inR(nLen, R.cycleLenSoft)) {
      // outside the no-friction band → confirm, never block (Propuesta 31)
      notify(
        t('mob.confirmRare', 'Unusual value'),
        t('mob.confirmRareBody', 'Cycle lengths outside 21–45 days are uncommon. Save anyway?'),
        [
          { text: t('ui.cancel', 'Cancel'), style: 'cancel' },
          { text: t('mob.saveAnyway', 'Save anyway'), onPress: () => doSave(nLen, nDur) },
        ]
      );
      return;
    }
    doSave(nLen, nDur);
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
          {/* r11a — localized date picker (no free text, no format traps) */}
          <View style={fstyles.wrap}>
            <Text style={fstyles.label}>{t('mob.lastPeriodStart', 'When did your last period start?')}</Text>
            <Pressable onPress={() => { if (!startDate) setStart(dateToIso(new Date())); setShowStart(true); }} style={[fstyles.input, { justifyContent: 'center' }]}>
              <Text style={{ fontFamily: font.regular, fontSize: 14.5, color: startDate ? colors.ink : colors.faint }}>
                {startDate ? startDate.toLocaleDateString(lt, { day: 'numeric', month: 'long', year: 'numeric' }) : t('mob.dobPick', 'Tap to select')}
              </Text>
            </Pressable>
          </View>
          {showStart && (
            <DateTimePicker
              value={startDate ?? new Date()} mode="date" maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_e: any, d?: Date) => {
                if (Platform.OS !== 'ios') setShowStart(false);
                if (d) setStart(dateToIso(d));
              }}
            />
          )}
          {showStart && Platform.OS === 'ios' ? (
            <Pressable onPress={() => setShowStart(false)} style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 10 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.coral }}>{t('ui.done', 'Done')}</Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={fstyles.wrap}>
                <Text style={fstyles.label}>{t('mob.cycleLength', 'Cycle length (days)')}</Text>
                <Pressable onPress={() => setWheel('len')} style={[fstyles.input, { justifyContent: 'center' }]}>
                  <Text style={{ fontFamily: font.regular, fontSize: 14.5, color: colors.ink }}>{len} {t('mob.days', 'days')}</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={fstyles.wrap}>
                <Text style={fstyles.label}>{t('mob.periodDuration', 'Period duration (days)')}</Text>
                <Pressable onPress={() => setWheel('dur')} style={[fstyles.input, { justifyContent: 'center' }]}>
                  <Text style={{ fontFamily: font.regular, fontSize: 14.5, color: colors.ink }}>{dur} {t('mob.days', 'days')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <WheelSheet visible={wheel === 'len'} title={t('mob.cycleLength', 'Cycle length (days)')} onClose={() => setWheel(null)}
            cols={[{ values: LEN, suffix: t('mob.days', 'days'), selected: Math.max(0, LEN.indexOf(parseNum(len) ?? 28)), onChange: (i) => setLen(String(LEN[i])) }]} />
          <WheelSheet visible={wheel === 'dur'} title={t('mob.periodDuration', 'Period duration (days)')} onClose={() => setWheel(null)}
            cols={[{ values: DUR, suffix: t('mob.days', 'days'), selected: Math.max(0, DUR.indexOf(parseNum(dur) ?? 5)), onChange: (i) => setDur(String(DUR[i])) }]} />

          <Text style={styles.section}>{t('mob.contraception', 'HORMONAL CONTRACEPTION')}</Text>
          <View style={styles.chipRow}>
            {CONTRA.map((o) => {
              const on = contra === o.k;
              return (
                <Pressable key={o.k} onPress={() => setContra(on ? null : o.k)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{t(o.tk, o.label)}</Text>
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
                  <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{t('cond.' + norm(c), c)}</Text>
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
