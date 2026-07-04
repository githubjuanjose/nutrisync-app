import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { ChipGroup } from '../../ui/Chips';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';
import { DIET } from '../../lib/onboardingMap';
import { useT } from '../../i18n';

const DIET_LABELS = Object.keys(DIET); // Balanced Diet, Keto, Vegetarian, ...
const ALLERGIES = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Peanuts', 'Tree nuts', 'Wheat', 'Soy'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const has = (arr: string[], label: string) => arr.map(norm).includes(norm(label));
const toggleTok = (arr: string[], label: string) => {
  const t = norm(label);
  return arr.map(norm).includes(t) ? arr.filter((x) => norm(x) !== t) : [...arr, t];
};

export default function NutritionalPreferencesScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dietLabel, setDietLabel] = useState<string>('No diet');
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase.from('users').select('diet_type, allergies').eq('id', userId).maybeSingle();
      if (data) {
        const d = data as any;
        const label = DIET_LABELS.find((l) => DIET[l] === d.diet_type);
        if (label) setDietLabel(label);
        setAllergies(d.allergies ?? []);
      }
      setLoading(false);
    })();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from('users').update({ diet_type: DIET[dietLabel] ?? 'none', allergies }).eq('id', userId);
      navigation.goBack();
    } catch { navigation.goBack(); }
    finally { setSaving(false); }
  };

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.nutritionalPrefs', "Nutritional Preferences")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.note}>These tune your food guidance — allergens are removed and diet type reshapes each phase's list.</Text>

          <Text style={styles.sectionTitle}>{t('mob.dietTypeCaps', "DIET TYPE")}</Text>
          <View style={styles.card}>
            <ChipGroup options={DIET_LABELS} selected={[dietLabel]} single onToggle={(v) => setDietLabel(v)} />
          </View>

          <Text style={styles.sectionTitle}>{t('mob.allergiesIntol', "ALLERGIES & INTOLERANCES")}</Text>
          <View style={styles.card}>
            <ChipGroup options={ALLERGIES} selected={ALLERGIES.filter((a) => has(allergies, a))}
              onToggle={(v) => setAllergies((p) => toggleTok(p, v))} />
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
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  note: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 6, marginBottom: 4, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, ...shadow.card },
  save: { backgroundColor: colors.coral, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
