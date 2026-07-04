import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { NutriOrb } from '../../ui/NutriOrb';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n';

type Form = { first_name: string; full_name: string; email: string; date_of_birth: string; height_cm: string; weight_kg: string };

export default function PersonalInfoScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [f, setF] = useState<Form>({ first_name: '', full_name: '', email: '', date_of_birth: '', height_cm: '', weight_kg: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase.from('users').select('first_name,full_name,email,date_of_birth,height_cm,weight_kg').eq('id', userId).maybeSingle();
      if (data) {
        const d = data as any;
        setF({
          first_name: d.first_name ?? '', full_name: d.full_name ?? '', email: d.email ?? '',
          date_of_birth: d.date_of_birth ?? '', height_cm: d.height_cm ? String(d.height_cm) : '', weight_kg: d.weight_kg ? String(d.weight_kg) : '',
        });
      }
      setLoading(false);
    })();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from('users').update({
        first_name: f.first_name || null, full_name: f.full_name || null,
        date_of_birth: f.date_of_birth || null,
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
      }).eq('id', userId);
      navigation.goBack();
    } catch (e: any) { Alert.alert('Save failed', e?.message ?? 'Try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingView />;

  const Field = ({ label, k, ...p }: { label: string; k: keyof Form } & any) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={f[k]} onChangeText={(t) => setF((s) => ({ ...s, [k]: t }))} style={styles.input} placeholderTextColor={colors.faint} {...p} />
    </View>
  );

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.personalInfo', "Personal Information")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <NutriOrb size={84} withHalo />
            <Text style={styles.name}>{f.first_name || 'You'}</Text>
            <Text style={styles.email}>{f.email}</Text>
          </View>

          <Text style={styles.sectionTitle}>{t('mob.basicInfo', "BASIC INFO")}</Text>
          <View style={styles.card}>
            <Field label="First name" k="first_name" autoCapitalize="words" />
            <Field label={t('ui.fullName', 'Full name')} k="full_name" autoCapitalize="words" />
            <Field label="Date of birth" k="date_of_birth" placeholder="YYYY-MM-DD" />
          </View>

          <Text style={styles.sectionTitle}>{t('mob.bodyMetrics', "BODY METRICS")}</Text>
          <View style={styles.card}>
            <Field label="Height (cm)" k="height_cm" keyboardType="numeric" />
            <Field label="Weight (kg)" k="weight_kg" keyboardType="numeric" />
          </View>

          <Pressable onPress={save} disabled={saving} style={styles.save}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{t('ui.saveChanges', 'Save Changes')}</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.peachTop },
  fillC: { flex: 1, backgroundColor: colors.peachTop, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  name: { fontFamily: font.bold, fontSize: 20, color: colors.ink, marginTop: 8 },
  email: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  fieldLabel: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted },
  input: { fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 4 },
  save: { backgroundColor: colors.coral, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
