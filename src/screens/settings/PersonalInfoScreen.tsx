import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { notify } from '../../lib/notify';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { NutriAvatar } from '../../ui/NutriAvatar';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { useT, useI18n, localeTag } from '../../i18n';
import { getUnits, UnitSystem, parseNum, cmToFtIn, ftInToCm, kgToLb, lbToKg, R, inR, isoToDate, dateToIso } from '../../lib/units';
import { WheelSheet } from '../../ui/WheelSheet';

// r11b — wheel ranges (valid by construction, Apple-Health style)
const CM = Array.from({ length: 141 }, (_, i) => 90 + i);          // 90–230
const KG = Array.from({ length: 441 }, (_, i) => 30 + i * 0.5);    // 30–250 ×0.5
const FT = [3, 4, 5, 6, 7];
const IN = Array.from({ length: 12 }, (_, i) => i);                // 0–11
const LB = Array.from({ length: 485 }, (_, i) => 66 + i);          // 66–550
const nearest = (arr: number[], v: number) => {
  let best = 0; for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i] - v) < Math.abs(arr[best] - v)) best = i;
  return best;
};

type Form = {
  first_name: string; full_name: string; username: string; email: string;
  date_of_birth: string; gender: string; height_cm: string; weight_kg: string;
};

/**
 * F44 FIX — `Field` is hoisted to module scope. It was previously declared inside
 * the component, so every keystroke re-created the component type, React
 * remounted the TextInput and focus was lost → "one letter at a time".
 */
function Field({ label, value, onChange, inputRef, ...p }: { label: string; value: string; onChange: (v: string) => void; inputRef?: any } & any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput ref={inputRef} value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.faint} {...p} />
    </View>
  );
}

// stored values stay canonical (unchanged in DB); labels render localized
const GENDERS = [
  { v: 'Woman', k: 'gender.woman', en: 'Woman' },
  { v: 'Non-binary', k: 'gender.nonbinary', en: 'Non-binary' },
  { v: 'Prefer not to say', k: 'gender.pnts', en: 'Prefer not to say' },
];
const MIN_AGE = 16; // matches our 16+ store rating and Terms

export default function PersonalInfoScreen({ navigation }: any) {
  const t = useT();
  const { lang } = useI18n();
  const lt = localeTag(lang);
  const { userId } = useSession();
  const [f, setF] = useState<Form>({ first_name: '', full_name: '', username: '', email: '', date_of_birth: '', gender: '', height_cm: '', weight_kg: '' });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Form) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // r11a — units, DOB picker, next-field refs
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [showDob, setShowDob] = useState(false);
  const [wheel, setWheel] = useState<null | 'h' | 'w'>(null);   // r11b: barrel abierta
  const [hFt, setHFt] = useState(''); const [hIn, setHIn] = useState(''); const [wLb, setWLb] = useState('');
  const fullRef = useRef<TextInput>(null); const userRef = useRef<TextInput>(null);
  const maxDob = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - MIN_AGE); return d; })();
  const minDob = new Date(1926, 0, 1);
  const dobDate = isoToDate(f.date_of_birth);

  useEffect(() => { getUnits().then(setUnits); }, []);
  // seed imperial display fields from canonical metric once both are known
  useEffect(() => {
    if (units !== 'imperial') return;
    const cm = parseNum(f.height_cm); const kg = parseNum(f.weight_kg);
    if (cm != null && hFt === '' && hIn === '') { const { ft, inch } = cmToFtIn(cm); setHFt(String(ft)); setHIn(String(inch)); }
    if (kg != null && wLb === '') setWLb(String(kgToLb(kg)));
  }, [units, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase.from('users')
        .select('first_name,full_name,username,email,date_of_birth,gender,height_cm,weight_kg,nutri_avatar')
        .eq('id', userId).maybeSingle();
      if (data) {
        const d = data as any;
        setF({
          first_name: d.first_name ?? '', full_name: d.full_name ?? '', username: d.username ?? '',
          email: d.email ?? '', date_of_birth: d.date_of_birth ?? '', gender: d.gender ?? '',
          height_cm: d.height_cm ? String(d.height_cm) : '', weight_kg: d.weight_kg ? String(d.weight_kg) : '',
        });
        setAvatar(d.nutri_avatar ?? null);
      }
      setLoading(false);
    });
    return unsub;
  }, [userId, navigation]);

  const age = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date_of_birth)) return null;
    const b = new Date(f.date_of_birth); const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
    return a > 0 && a < 120 ? a : null;
  })();

  const save = async () => {
    if (!userId) return;
    // r11a — canonical metric + garbage-proof validation (never store nonsense)
    let heightCm: number | null = null, weightKg: number | null = null;
    if (units === 'imperial') {
      const ft = parseNum(hFt), inch = parseNum(hIn), lb = parseNum(wLb);
      if (hFt || hIn) {
        if (ft == null || inch == null || inch < 0 || inch >= 12) { notify(t('mob.invalidHeight', 'That height looks off — please check it.')); return; }
        heightCm = ftInToCm(ft, inch);
      }
      if (wLb) { if (lb == null) { notify(t('mob.invalidWeight', 'That weight looks off — please check it.')); return; } weightKg = lbToKg(lb); }
    } else {
      if (f.height_cm) { heightCm = parseNum(f.height_cm); if (heightCm == null) { notify(t('mob.invalidHeight', 'That height looks off — please check it.')); return; } }
      if (f.weight_kg) { weightKg = parseNum(f.weight_kg); if (weightKg == null) { notify(t('mob.invalidWeight', 'That weight looks off — please check it.')); return; } }
    }
    if (heightCm != null && !inR(heightCm, R.heightCm)) { notify(t('mob.invalidHeight', 'That height looks off — please check it.')); return; }
    if (weightKg != null && !inR(weightKg, R.weightKg)) { notify(t('mob.invalidWeight', 'That weight looks off — please check it.')); return; }
    setSaving(true);
    try {
      const patch: Record<string, any> = {
        first_name: f.first_name || null, full_name: f.full_name || null,
        date_of_birth: f.date_of_birth || null, gender: f.gender || null, username: f.username || null,
        age: age ?? null,   // crossover v11.50: web guarda DOB + edad derivada — la app igual
        height_cm: heightCm,
        weight_kg: weightKg,
      };
      let { error } = await supabase.from('users').update(patch).eq('id', userId);
      if (error && /username|gender/.test(error.message)) {
        // columns migration not applied yet — save the rest, don't block the user
        delete patch.username; delete patch.gender;
        ({ error } = await supabase.from('users').update(patch).eq('id', userId));
      }
      if (error) throw error;
      navigation.goBack();
    } catch (e: any) { notify('Save failed', e?.message ?? 'Try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.personalInfo', "Personal Information")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* F46: profile photo → Choose Your Nutri */}
          <Pressable style={{ alignItems: 'center', marginBottom: 10 }} onPress={() => navigation.navigate('NutriAvatar')}>
            <NutriAvatar variant={avatar} size={84} />
            <Text style={styles.editPhoto}>{t('mob.editPhoto', 'Edit profile photo ›')}</Text>
            <Text style={styles.name}>{f.first_name || 'You'}</Text>
            {/* F45: age directly underneath the name */}
            {age != null ? <Text style={styles.age}>{age} {t('ui.years', 'years')}</Text> : null}
          </Pressable>

          <Text style={styles.sectionTitle}>{t('mob.basicInfo', "BASIC INFO")}</Text>
          <View style={styles.card}>
            <Field label={t('mob.firstName', 'First name')} value={f.first_name} onChange={set('first_name')} autoCapitalize="words"
              returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => fullRef.current?.focus()} />
            <Field label={t('ui.fullName', 'Full name')} value={f.full_name} onChange={set('full_name')} autoCapitalize="words"
              inputRef={fullRef} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => userRef.current?.focus()} />
            <Field label={t('mob.username', 'Username')} value={f.username} onChange={set('username')} autoCapitalize="none"
              inputRef={userRef} returnKeyType="done" />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('mob.email', 'Email')}</Text>
              <Text style={[styles.input, { color: colors.muted }]}>{f.email || '—'}</Text>
            </View>
            {/* r11a — DOB via native picker: localized format, bounded, zero garbage */}
            <Pressable style={styles.field} onPress={() => {
              // mismo principio que las ruedas: lo mostrado queda seleccionado desde el primer momento
              if (!dobDate) set('date_of_birth')(dateToIso(new Date(1995, 5, 15)));
              setShowDob(true);
            }}>
              <Text style={styles.fieldLabel}>{t('mob.dob', 'Date of birth')}</Text>
              <Text style={[styles.input, !dobDate && { color: colors.faint }]}>
                {dobDate ? dobDate.toLocaleDateString(lt, { day: 'numeric', month: 'long', year: 'numeric' }) : t('mob.dobPick', 'Tap to select')}
              </Text>
            </Pressable>
            {showDob && (
              <DateTimePicker
                value={dobDate ?? new Date(1995, 5, 15)}
                mode="date" maximumDate={maxDob} minimumDate={minDob}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_e: any, d?: Date) => {
                  if (Platform.OS !== 'ios') setShowDob(false);
                  if (d) set('date_of_birth')(dateToIso(d));
                }}
              />
            )}
            {showDob && Platform.OS === 'ios' ? (
              <Pressable onPress={() => setShowDob(false)} style={styles.dobDone}><Text style={styles.dobDoneTxt}>{t('ui.done', 'Done')}</Text></Pressable>
            ) : null}
            <View style={[styles.field, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>{t('mob.gender', 'Gender')}</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => {
                  const on = f.gender === g.v;
                  return (
                    <Pressable key={g.v} onPress={() => set('gender')(on ? '' : g.v)} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{t(g.k, g.en)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t('mob.bodyMetrics', "BODY METRICS")}</Text>
          <View style={styles.card}>
            {/* r11b — barrel pickers: tap the row, spin the wheel; garbage impossible */}
            <Pressable style={styles.field} onPress={() => setWheel('h')}>
              <Text style={styles.fieldLabel}>{units === 'imperial' ? t('mob.heightLbl', 'Height') + ' (ft · in)' : t('mob.heightLbl', 'Height') + ' (cm)'}</Text>
              <Text style={[styles.input, !(units === 'imperial' ? hFt : f.height_cm) && { color: colors.faint }]}>
                {units === 'imperial'
                  ? (hFt ? `${hFt} ft ${hIn || 0} in` : t('mob.dobPick', 'Tap to select'))
                  : (f.height_cm ? `${f.height_cm} cm` : t('mob.dobPick', 'Tap to select'))}
              </Text>
            </Pressable>
            <Pressable style={[styles.field, { borderBottomWidth: 0 }]} onPress={() => setWheel('w')}>
              <Text style={styles.fieldLabel}>{units === 'imperial' ? t('mob.weightLbl', 'Weight') + ' (lb)' : t('mob.weightLbl', 'Weight') + ' (kg)'}</Text>
              <Text style={[styles.input, !(units === 'imperial' ? wLb : f.weight_kg) && { color: colors.faint }]}>
                {units === 'imperial'
                  ? (wLb ? `${wLb} lb` : t('mob.dobPick', 'Tap to select'))
                  : (f.weight_kg ? `${f.weight_kg} kg` : t('mob.dobPick', 'Tap to select'))}
              </Text>
            </Pressable>
            <Text style={styles.unitsHint}>{t('mob.unitsHint', 'Units can be changed in App Preferences.')}</Text>
          </View>

          <WheelSheet
            visible={wheel === 'h'}
            title={t('mob.heightLbl', 'Height')}
            onClose={() => setWheel(null)}
            cols={units === 'imperial' ? [
              { values: FT, suffix: 'ft', selected: nearest(FT, parseNum(hFt) ?? 5), onChange: (i) => setHFt(String(FT[i])) },
              { values: IN, suffix: 'in', selected: nearest(IN, parseNum(hIn) ?? 6), onChange: (i) => setHIn(String(IN[i])) },
            ] : [
              { values: CM, suffix: 'cm', selected: nearest(CM, parseNum(f.height_cm) ?? 165), onChange: (i) => set('height_cm')(String(CM[i])) },
            ]}
          />
          <WheelSheet
            visible={wheel === 'w'}
            title={t('mob.weightLbl', 'Weight')}
            onClose={() => setWheel(null)}
            cols={units === 'imperial' ? [
              { values: LB, suffix: 'lb', selected: nearest(LB, parseNum(wLb) ?? 150), onChange: (i) => setWLb(String(LB[i])) },
            ] : [
              { values: KG, suffix: 'kg', selected: nearest(KG, parseNum(f.weight_kg) ?? 65), onChange: (i) => set('weight_kg')(String(KG[i])) },
            ]}
          />

          {/* F46: cycle + conditions + contraception live on their own page */}
          <Text style={styles.sectionTitle}>{t('mob.cycleHealthCaps', "CYCLE & HEALTH")}</Text>
          <Pressable style={[styles.card, styles.linkRow]} onPress={() => navigation.navigate('CycleHealth')}>
            <Text style={styles.linkTxt}>{t('mob.cycleHealth', 'Cycle & Health Information')}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <Pressable onPress={save} disabled={saving} style={styles.save}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{t('ui.saveChanges', 'Save Changes')}</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  editPhoto: { fontFamily: font.semibold, fontSize: 12.5, color: colors.coral, marginTop: 6 },
  name: { fontFamily: font.bold, fontSize: 20, color: colors.ink, marginTop: 6 },
  age: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  fieldLabel: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  input: { fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingBottom: 6 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: '#F6EEE7' },
  chipOn: { backgroundColor: colors.coral },
  chipTxt: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  chipTxtOn: { color: '#fff' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  linkTxt: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  chev: { fontFamily: font.semibold, fontSize: 18, color: colors.faint },
  save: { backgroundColor: colors.coral, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
  dobDone: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14 },
  dobDoneTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.coral },
  unitsHint: { fontFamily: font.regular, fontSize: 11, color: colors.faint, paddingVertical: 8 },
});
