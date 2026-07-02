import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, font, radius, shadow } from '../../theme';

const KEY = 'nutrisync.appPrefs.v1';
type Prefs = { units: 'metric' | 'imperial'; weekStart: 'monday' | 'sunday'; haptics: boolean; appearance: 'light' | 'system' };
const DEFAULTS: Prefs = { units: 'metric', weekStart: 'monday', haptics: true, appearance: 'light' };

/** Two-option segmented control. */
function Segment<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.segBtn, on && styles.segOn]}>
            <Text style={[styles.segTxt, on && styles.segTxtOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppPreferencesScreen({ navigation }: any) {
  const [p, setP] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) { try { setP({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {} }
    })();
  }, []);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...p, ...patch };
    setP(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>App Preferences</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>UNITS</Text>
          <View style={styles.card}>
            <View style={styles.rowCol}>
              <Text style={styles.rowLabel}>Measurement units</Text>
              <Segment value={p.units} onChange={(v) => update({ units: v })}
                options={[{ key: 'metric', label: 'Metric (kg, cm)' }, { key: 'imperial', label: 'Imperial (lb, in)' }]} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>CALENDAR</Text>
          <View style={styles.card}>
            <View style={styles.rowCol}>
              <Text style={styles.rowLabel}>Start week on</Text>
              <Segment value={p.weekStart} onChange={(v) => update({ weekStart: v })}
                options={[{ key: 'monday', label: 'Monday' }, { key: 'sunday', label: 'Sunday' }]} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>GENERAL</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Haptic feedback</Text>
              <Switch value={p.haptics} onValueChange={(v) => update({ haptics: v })}
                trackColor={{ true: colors.coral, false: '#E3D8CE' }} thumbColor="#fff" />
            </View>
            <View style={styles.rowCol}>
              <Text style={styles.rowLabel}>Appearance</Text>
              <Segment value={p.appearance} onChange={(v) => update({ appearance: v })}
                options={[{ key: 'light', label: 'Light' }, { key: 'system', label: 'System' }]} />
            </View>
          </View>

          <Text style={styles.note}>Preferences save instantly on this device. Dark mode is on the roadmap.</Text>
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
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  rowCol: { paddingVertical: 14, gap: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  rowLabel: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  segment: { flexDirection: 'row', backgroundColor: '#F6EEE7', borderRadius: radius.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.white, ...shadow.card },
  segTxt: { fontFamily: font.medium, fontSize: 13, color: colors.muted },
  segTxtOn: { color: colors.ink, fontFamily: font.semibold },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 18, textAlign: 'center' },
});
