import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { LoadingView } from '../../ui/LoadingView';
import { useSession } from '../../state/SessionProvider';
import { PROVIDERS } from '../../lib/health/providers';
import { getConnections, connectProvider, disconnectProvider } from '../../lib/health/connections';
import { useT } from '../../i18n';

export default function ConnectedDevicesScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());

  const refresh = async () => {
    if (!userId) { setLoading(false); return; }
    const rows = await getConnections(userId);
    setConnected(new Set(rows.map((r) => r.provider)));
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [userId]);

  const onConnect = (key: string, name: string, scopes: string[]) => {
    Alert.alert(
      `Connect ${name}?`,
      `NutriSync will read: ${scopes.join(', ')}. Data is stored privately under your account and used only to personalise your guidance. You can disconnect any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect', onPress: async () => {
            if (!userId) return;
            setBusy(key);
            try { await connectProvider(userId, key, scopes); await refresh(); }
            catch (e: any) { Alert.alert('Could not connect', e?.message ?? 'Try again.'); }
            finally { setBusy(null); }
          },
        },
      ]
    );
  };

  const onDisconnect = (key: string, name: string) => {
    Alert.alert(`Disconnect ${name}?`, 'NutriSync will stop reading from this source. Existing data stays until you delete your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          if (!userId) return;
          setBusy(key);
          try { await disconnectProvider(userId, key); await refresh(); }
          catch (e: any) { Alert.alert('Could not disconnect', e?.message ?? 'Try again.'); }
          finally { setBusy(null); }
        },
      },
    ]);
  };

  if (loading) return <LoadingView />;

  const platformOk = (p: typeof PROVIDERS[number]) =>
    p.platform === 'both' || (p.platform === 'ios' && Platform.OS === 'ios') || (p.platform === 'android' && Platform.OS === 'android');

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></Pressable>
          <Text style={styles.headerTitle}>{t('mob.connectedDevices', "Connected Devices")}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.banner}>
            <Text style={styles.bannerTxt}>⌚ Link a health app or wearable to sharpen your Cycle Sync Score with real steps, sleep and heart-rate. Live sync activates in the installed app build.</Text>
          </View>

          <Text style={styles.sectionTitle}>{t('mob.healthPlatforms', "HEALTH PLATFORMS")}</Text>
          <View style={styles.card}>
            {PROVIDERS.map((p, i) => {
              const on = connected.has(p.key);
              const ok = platformOk(p);
              return (
                <View key={p.key} style={[styles.row, i < PROVIDERS.length - 1 && styles.rowBorder]}>
                  <Text style={styles.icon}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.sub}>{on ? t('ui.connectedWord', 'Connected') : ok ? p.scopes.slice(0, 3).join(' · ') : `${p.platform === 'ios' ? 'iOS' : 'Android'} only`}</Text>
                  </View>
                  {on ? (
                    <Pressable onPress={() => onDisconnect(p.key, p.name)} disabled={busy === p.key} style={[styles.btn, styles.btnOff]}>
                      <Text style={styles.btnOffTxt}>{t('mob.disconnect', "Disconnect")}</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => onConnect(p.key, p.name, p.scopes)} disabled={busy === p.key || !ok} style={[styles.btn, styles.btnOn, !ok && styles.btnDim]}>
                      <Text style={styles.btnOnTxt}>{busy === p.key ? '…' : t('ui.connectWord', 'Connect')}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.note}>Connecting records your consent now. Each source's live data sync (Apple Health, Health Connect, Garmin, etc.) turns on in the native app build — see the connector guide. Disconnecting stops sync immediately.</Text>
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
  banner: { backgroundColor: '#FDECE6', borderRadius: radius.md, padding: 14 },
  bannerTxt: { fontFamily: font.regular, fontSize: 12.5, color: colors.body, lineHeight: 18 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4EBE3', gap: 12 },
  rowBorder: {},
  icon: { fontSize: 22, width: 30, textAlign: 'center' },
  name: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },
  btn: { borderRadius: radius.pill, paddingHorizontal: 14, height: 32, alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: colors.coral },
  btnOnTxt: { fontFamily: font.semibold, fontSize: 12.5, color: '#fff' },
  btnOff: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  btnOffTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted },
  btnDim: { opacity: 0.4 },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 16, lineHeight: 17, paddingHorizontal: 4 },
});
