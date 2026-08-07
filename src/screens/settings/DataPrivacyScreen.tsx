import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, ActivityIndicator, Linking } from 'react-native';
import { notify } from '../../lib/notify';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsIcon } from '../../ui/SettingsIcons';
import { colors, font, radius, shadow } from '../../theme';
import { useSession } from '../../state/SessionProvider';
import { exportUserData, deleteAccount } from '../../lib/account';
import { useT } from '../../i18n';

/* po71: documentos legales bilingües publicados en la web (fuente única) */
const openLegal = (page: string) =>
  Linking.openURL('https://nutrisynccollective.com/legal/' + page).catch(() => {});

export default function DataPrivacyScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [analytics, setAnalytics] = useState(true);
  const [insights, setInsights] = useState(true);
  const [research, setResearchState] = useState(false);
  // R8-f21: persisted; seeded by onboarding's consent answer
  React.useEffect(() => {
    (async () => {
      try {
        const AS = require('@react-native-async-storage/async-storage').default;
        const v = await AS.getItem('ns.research.' + (userId ?? ''));
        if (v != null) setResearchState(v === '1');
      } catch {}
    })();
  }, [userId]);
  const setResearch = (v: boolean) => {
    setResearchState(v);
    try {
      const AS = require('@react-native-async-storage/async-storage').default;
      AS.setItem('ns.research.' + (userId ?? ''), v ? '1' : '0');
    } catch {}
  };
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (!userId) return;
    setBusy(true);
    try { await exportUserData(userId); } catch (e: any) { notify('Export failed', e?.message ?? 'Try again.'); }
    finally { setBusy(false); }
  };

  const onDelete = () => {
    notify(
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
            catch (e: any) { notify('Delete failed', e?.message ?? 'Try again.'); setBusy(false); }
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

          {/* po77 (decisión counsel + Juanjo, 4-ago): los toggles de Analítica,
              Insights y Research quedan OCULTOS mientras no exista tratamiento
              real detrás — un interruptor sin función sugiere un control que no
              es tal. Se restauran con consentimiento granular cuando se activen
              (y con actualización del inventario y la política de cookies). */}

          <Text style={styles.sectionTitle}>{t('mob.yourDataRights', "YOUR DATA RIGHTS")}</Text>
          <View style={styles.card}>
            <RightRow icon="download" label={busy ? 'Preparing…' : t('ui.exportJson', 'Download my data')} onPress={onExport} />
          </View>

          {/* po71: los 5 documentos legales publicados (borrador validado por
              asesoría en curso) — páginas bilingües ES/EN en la web */}
          <Text style={styles.sectionTitle}>{t('mob.legalHdr', 'LEGAL')}</Text>
          <View style={styles.card}>
            <RightRow icon="📜" label={t('mob.legalTerms', 'Terms & conditions')} onPress={() => openLegal('terms.html')} />
            <RightRow icon="📄" label={t('mob.legalPrivacy', 'Privacy policy')} onPress={() => openLegal('privacy.html')} />
            <RightRow icon="🩺" label={t('mob.legalConsent', 'Health-data consent')} onPress={() => openLegal('health-consent.html')} />
            <RightRow icon="🧪" label={t('mob.legalBeta', 'Beta agreement')} onPress={() => openLegal('beta-agreement.html')} />
            <RightRow icon="🍪" label={t('mob.legalCookies', 'Cookie policy')} onPress={() => openLegal('cookies.html')} />
            <RightRow icon="🫶" label={t('mob.legalHealth', 'Health notice')} onPress={() => openLegal('health.html')} />
            <RightRow icon="⚖️" label={t('mob.legalNotice', 'Legal notice')} onPress={() => openLegal('legal-notice.html')} />
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
