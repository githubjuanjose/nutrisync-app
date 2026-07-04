import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { useT } from '../../i18n';

export default function SecurityScreen({ navigation }: any) {
  const t = useT();
  const { session } = useSession();
  const email = session?.user.email ?? 'you@email.com';

  const TFA = [
    { icon: '🔑', label: 'Authenticator App', status: 'Disabled' },
    { icon: '💬', label: 'SMS Verification', status: 'Disabled' },
    { icon: '☺', label: 'Face ID / Touch ID', status: 'Disabled' },
  ];

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('ui.security', 'Sign-in & Security')}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('mob.loginDetails', "LOGIN DETAILS")}</Text>
          <View style={styles.card}>
            <View style={styles.kv}><Text style={styles.k}>{t('mob.email', "Email")}</Text><Text style={styles.v}>{email}</Text></View>
            <View style={[styles.kv, { borderBottomWidth: 0 }]}><Text style={styles.k}>Password</Text><Text style={styles.v}>••••••••••</Text></View>
          </View>

          <Text style={styles.sectionTitle}>{t('ui.twofaHdr', 'TWO-FACTOR AUTHENTICATION')}</Text>
          <View style={styles.card}>
            {TFA.map((t, i) => (
              <View key={t.label} style={[styles.row, i < TFA.length - 1 && styles.rowBorder]}>
                <Text style={styles.rowIcon}>{t.icon}</Text>
                <Text style={styles.rowLabel}>{t.label}</Text>
                <View style={styles.badge}><Text style={styles.badgeTxt}>{t.status}</Text></View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>{t('ui.sessionsHdr', 'ACTIVE SESSIONS')}</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowIcon}>📱</Text>
              <View style={{ flex: 1 }}><Text style={styles.rowLabel}>iPhone 15 Pro</Text><Text style={styles.sub}>{t('mob.currentDevice', "Current device")}</Text></View>
              <Text style={styles.active}>{t('mob.activeWord', "Active")}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowIcon}>💻</Text>
              <View style={{ flex: 1 }}><Text style={styles.rowLabel}>MacBook Pro</Text><Text style={styles.sub}>2 hours ago</Text></View>
              <Text style={styles.logout}>{t('ui.logout', 'Log Out')}</Text>
            </View>
          </View>

          <Text style={styles.note}>2FA and passkeys are on the roadmap (see the Beyond-Figma requirements doc).</Text>
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
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 50, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  k: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  v: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', height: 54 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  rowIcon: { fontSize: 17, width: 30 },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 1 },
  badge: { backgroundColor: '#F1E7DF', borderRadius: radius.pill, paddingHorizontal: 10, height: 24, justifyContent: 'center' },
  badgeTxt: { fontFamily: font.medium, fontSize: 11, color: colors.muted },
  active: { fontFamily: font.semibold, fontSize: 12, color: colors.good },
  logout: { fontFamily: font.semibold, fontSize: 12, color: colors.coralDeep },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 18, textAlign: 'center' },
});
