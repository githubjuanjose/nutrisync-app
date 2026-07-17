import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { NutriAvatar } from '../../ui/NutriAvatar';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';

type Form = {
  first_name: string; full_name: string; username: string; email: string;
  date_of_birth: string; gender: string; height_cm: string; weight_kg: string;
};

/**
 * F44 FIX — `Field` is hoisted to module scope. It was previously declared inside
 * the component, so every keystroke re-created the component type, React
 * remounted the TextInput and focus was lost → "one letter at a time".
 */
function Field({ label, value, onChange, ...p }: { label: string; value: string; onChange: (v: string) => void } & any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} style={styles.input} placeholderTextColor={colors.faint} {...p} />
    </View>
  );
}

const GENDERS = ['Woman', 'Non-binary', 'Prefer not to say'];

export default function PersonalInfoScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [f, setF] = useState<Form>({ first_name: '', full_name: '', username: '', email: '', date_of_birth: '', gender: '', height_cm: '', weight_kg: '' });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Form) => (v: string) => setF((s) => ({ ...s, [k]: v }));

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
    setSaving(true);
    try {
      const patch: Record<string, any> = {
        first_name: f.first_name || null, full_name: f.full_name || null,
        date_of_birth: f.date_of_birth || null, gender: f.gender || null, username: f.username || null,
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
      };
      let { error } = await supabase.from('users').update(patch).eq('id', userId);
      if (error && /username|gender/.test(error.message)) {
        // columns migration not applied yet — save the rest, don't block the user
        delete patch.username; delete patch.gender;
        ({ error } = await supabase.from('users').update(patch).eq('id', userId));
      }
      if (error) throw error;
      navigation.goBack();
    } catch (e: any) { Alert.alert('Save failed', e?.message ?? 'Try again.'); }
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
            <Field label={t('mob.firstName', 'First name')} value={f.first_name} onChange={set('first_name')} autoCapitalize="words" />
            <Field label={t('ui.fullName', 'Full name')} value={f.full_name} onChange={set('full_name')} autoCapitalize="words" />
            <Field label={t('mob.username', 'Username')} value={f.username} onChange={set('username')} autoCapitalize="none" />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t('mob.email', 'Email')}</Text>
              <Text style={[styles.input, { color: colors.muted }]}>{f.email || '—'}</Text>
            </View>
            <Field label={t('mob.dob', 'Date of birth')} value={f.date_of_birth} onChange={set('date_of_birth')} placeholder="YYYY-MM-DD" />
            <View style={[styles.field, { borderBottomWidth: 0 }]}>
              <Text style={styles.fieldLabel}>{t('mob.gender', 'Gender')}</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => {
                  const on = f.gender === g;
                  return (
                    <Pressable key={g} onPress={() => set('gender')(on ? '' : g)} style={[styles.chip, on && styles.chipOn]}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{g}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t('mob.bodyMetrics', "BODY METRICS")}</Text>
          <View style={styles.card}>
            <Field label={t('mob.heightCm', 'Height (cm)')} value={f.height_cm} onChange={set('height_cm')} keyboardType="numeric" />
            <Field label={t('mob.weightKg', 'Weight (kg)')} value={f.weight_kg} onChange={set('weight_kg')} keyboardType="numeric" />
          </View>

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
});
