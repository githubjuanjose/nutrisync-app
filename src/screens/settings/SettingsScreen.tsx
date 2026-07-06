import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { getProfile } from '../../lib/api';
import { NutriOrb } from '../../ui/NutriOrb';
import { isEnabled, FlagKey } from '../../lib/flags';
import { useT } from '../../i18n';

type Row = { icon: string; label: string; route?: string; flag?: FlagKey };
const SECTIONS: { title: string; rows: Row[] }[] = [
  { title: 'HEALTH & PROFILE', rows: [
    { icon: '👤', label: 'Personal Information', route: 'PersonalInfo' },
    { icon: '🩺', label: 'Cycle & Health Information', route: 'EditPeriod' },
    { icon: '⌚', label: 'Connected Devices', route: 'ConnectedDevices', flag: 'connectors' },
  ]},
  { title: 'PRIVACY & SECURITY', rows: [
    { icon: '🔒', label: 'Sign In & Security', route: 'Security' },
    { icon: '🛡️', label: 'Data Privacy', route: 'DataPrivacy' },
    { icon: '👥', label: 'Community Privacy', route: 'CommunityPrivacy' },
  ]},
  { title: 'PREFERENCES', rows: [
    { icon: '⚙️', label: 'App Preferences', route: 'AppPreferences' },
    { icon: '🔔', label: 'Notifications & Reminders', route: 'Notifications' },
    { icon: '🥗', label: 'Nutritional Preferences', route: 'NutritionalPreferences' },
    { icon: '🟠', label: 'Choose Your Nutri', route: 'NutriAvatar' },
  ]},
];

export default function SettingsScreen({ navigation }: any) {
  const t = useT();
  const { userId, signOut } = useSession();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (userId) { const p = await getProfile(userId); setName(p?.first_name ?? 'You'); }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <LoadingView />;

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('ui.settings', 'Settings')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.profile}>
            <NutriOrb size={92} withHalo />
            <Text style={styles.pname}>{name}</Text>
          </View>

          {SECTIONS.map((s) => (
            <View key={s.title} style={{ marginTop: 18 }}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <View style={styles.card}>
                {s.rows.filter((r) => !r.flag || isEnabled(r.flag)).map((r, i, arr) => (
                  <Pressable
                    key={r.label}
                    onPress={() => r.route && navigation.navigate(r.route)}
                    style={[styles.row, i < arr.length - 1 && styles.rowBorder]}
                  >
                    <Text style={styles.rowIcon}>{r.icon}</Text>
                    <Text style={styles.rowLabel}>{r.label}</Text>
                    <Text style={styles.chev}>›</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutTxt}>{t('ui.logout', 'Sign Out')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  fillC: { flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  profile: { alignItems: 'center', marginTop: 6 },
  pname: { fontFamily: font.bold, fontSize: 22, color: colors.ink, marginTop: 8 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 54 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  rowIcon: { fontSize: 17, width: 30 },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink },
  chev: { fontSize: 22, color: colors.faint },
  signOut: { backgroundColor: '#F6A99A', height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  signOutTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
