import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsIcon } from '../../ui/SettingsIcons';
import { colors, font, radius, shadow } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { exportUserData, deleteAccount } from '../../lib/account';
import { useT } from '../../i18n';

export default function DataPrivacyScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [analytics, setAnalytics] = useState(true);
  const [insights, setInsights] = useState(true);
  const [research, setResearch] = useState(false);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (!userId) return;
    setBusy(true);
    try { await exportUserData(userId); } catch (e: any) { Alert.alert('Export failed', e?.message ?? 'Try again.'); }
    finally { setBusy(false); }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your cycle data, logs and scores. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!userId) return;
            setBusy(true);
            try { await deleteAccount(); } // full erasure (data + auth); sign-out fires the navigator back to Welcome
            catch (e: any) { Alert.alert('Delete failed', e?.message ?? 'Try again.'); setBusy(false); }
          },
        },
      ]
    );
  };

  const Toggle = ({ v, set, title, sub }: { v: boolean; set: (b: boolean) => void; title: string; sub: string }) => (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={v} onValueChange={set} trackColor={{ true: colors.coral, false: '#E4DAD0' }} thumbColor="#fff" />
    </View>
  );
  const RightRow = ({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) => (
    <Pressable onPress={onPress} style={styles.rightRow}>
      <SettingsIcon name={icon} size={20} /><Text style={styles.rowLabel}>{label}</Text><Text style={styles.chev}>›</Text>
    </Pressable>
  );

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('ui.dataPrivacy', 'Data Privacy')}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.banner}>
            <View style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}><SettingsIcon name="lock" size={18} /><Text style={[styles.bannerTxt,{flex:1}]}>Your health data is encrypted and never sold. You control what's shared below.</Text></View>
          </View>

          <Text style={styles.sectionTitle}>{t('mob.dataPermissions', "DATA PERMISSIONS")}</Text>
          <View style={styles.card}>
            <Toggle v={analytics} set={setAnalytics} title={t('mob.analyticsCrash', "Analytics & crash reports")} sub="Helps us fix bugs faster" />
            <Toggle v={insights} set={setInsights} title={t('mob.personalisedInsights', "Personalised insights")} sub="Tailors tips to your patterns" />
            <Toggle v={research} set={setResearch} title={t('mob.researchPart', "Research participation")} sub="Anonymised, for women's health" />
          </View>

          <Text style={styles.sectionTitle}>{t('mob.yourDataRights', "YOUR DATA RIGHTS")}</Text>
          <View style={styles.card}>
            <RightRow icon="download" label={busy ? 'Preparing…' : t('ui.exportJson', 'Download my data')} onPress={onExport} />
            <RightRow icon="📄" label="View privacy policy" />
            <RightRow icon="🗂️" label="Manage activity log" />
            <RightRow icon="🍪" label="Cookie preferences" />
          </View>

          <Pressable onPress={onDelete} disabled={busy} style={styles.delete}>
            {busy ? <ActivityIndicator color={colors.coralDeep} /> : <Text style={styles.deleteTxt}>{t('mob.deleteAccount', "Delete account")}</Text>}
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
  banner: { backgroundColor: '#E9F5EC', borderRadius: radius.md, padding: 14 },
  bannerTxt: { fontFamily: font.regular, fontSize: 12.5, color: '#3B6B47', lineHeight: 18 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  toggleTitle: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  toggleSub: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  rightRow: { flexDirection: 'row', alignItems: 'center', height: 52, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  rowIcon: { fontSize: 16, width: 28 },
  rowLabel: { flex: 1, fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  chev: { fontSize: 22, color: colors.faint },
  delete: { alignItems: 'center', justifyContent: 'center', height: 52, marginTop: 24 },
  deleteTxt: { fontFamily: font.semibold, fontSize: 15, color: colors.coralDeep },
});
