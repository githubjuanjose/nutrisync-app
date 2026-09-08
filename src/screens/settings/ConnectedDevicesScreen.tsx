import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { notify } from '../../lib/notify';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bordesPantalla, proveedoresVisibles, estadoProveedor } from '../../lib/plataforma';
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
  // UST-09 C1 · qué señales tiene consentidas cada conexión viva (de la base)
  const [scopesDe, setScopesDe] = useState<Record<string, string[]>>({});

  const refresh = async () => {
    if (!userId) { setLoading(false); return; }
    const rows = await getConnections(userId);
    setConnected(new Set(rows.map((r) => r.provider)));
    setScopesDe(Object.fromEntries(rows.map((r) => [r.provider, r.scopes ?? []])));
    setLoading(false);
  };

  // UST-09 C1 · las plataformas de salud tienen consent señal a señal: con la
  // conexión viva se EDITA en la misma pantalla (antes solo «Disconnect» — la
  // elección granular desaparecía al conectar desde el switch de Movimiento).
  const tieneConsentPropio = (key: string) => key === 'apple_health' || key === 'health_connect';
  const onManage = (key: string) => navigation.navigate('HealthConsent', { provider: key, edit: true });
  // r24-l: re-leer al ENTRAR y cada vez que la pantalla recupera el foco — al
  // volver de HealthConsent (donde Apple Salud conecta) el estado se refresca
  // solo, sin tener que salir y entrar.
  useEffect(() => {
    refresh();
    const unsub = navigation.addListener('focus', refresh);
    return unsub;
  }, [userId, navigation]);

  const onConnect = (key: string, name: string, scopes: string[]) => {
    // UST-06 F4: las plataformas nativas de salud tienen consent PROPIO,
    // señal a señal — el diálogo genérico queda para el resto de proveedores.
    if (key === 'apple_health' || key === 'health_connect') {
      navigation.navigate('HealthConsent', { provider: key });
      return;
    }
    notify(
      `Connect ${name}?`,
      `NutriSync will read: ${scopes.join(', ')}. Data is stored privately under your account and used only to personalise your guidance. You can disconnect any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect', onPress: async () => {
            if (!userId) return;
            setBusy(key);
            setConnected((s) => new Set(s).add(key));   // r24-l: respuesta inmediata
            try { await connectProvider(userId, key, scopes); await refresh(); }
            catch (e: any) { setConnected((s) => { const n = new Set(s); n.delete(key); return n; }); notify('Could not connect', e?.message ?? 'Try again.'); }
            finally { setBusy(null); }
          },
        },
      ]
    );
  };

  const onDisconnect = (key: string, name: string) => {
    notify(`Disconnect ${name}?`, 'NutriSync will stop reading from this source. Existing data stays until you delete your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          if (!userId) return;
          setBusy(key);
          setConnected((s) => { const n = new Set(s); n.delete(key); return n; });   // r24-l: respuesta inmediata
          try { await disconnectProvider(userId, key); await refresh(); }
          catch (e: any) { setConnected((s) => new Set(s).add(key)); notify('Could not disconnect', e?.message ?? 'Try again.'); }
          finally { setBusy(null); }
        },
      },
    ]);
  };

  if (loading) return <LoadingView />;

  // UST-15 C2 (D2): Android no ve «Apple Health · iOS only»; Health Connect y Samsung
  // son «Próximamente» SIN botón hasta O3 (UST-16) — antes «Connect» conectaba nada (P0).
  const visibles = proveedoresVisibles(Platform.OS, PROVIDERS);

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={bordesPantalla(Platform.OS)}>
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
            {visibles.map((p, i) => {
              const on = connected.has(p.key);
              const estado = estadoProveedor(Platform.OS, p);
              const ok = estado === 'conectable';
              return (
                <View key={p.key} style={[styles.row, i < visibles.length - 1 && styles.rowBorder]}>
                  <Text style={styles.icon}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.sub}>
                      {on
                        ? (scopesDe[p.key]?.length
                            ? `${t('ui.connectedWord', 'Connected')} · ${scopesDe[p.key].filter((s) => s !== 'write_flow').slice(0, 3).join(' · ').replace(/_/g, ' ')}`
                            : t('ui.connectedWord', 'Connected'))
                        : ok ? p.scopes.slice(0, 3).join(' · ') : t('mob.wear.proximamente', 'Coming in a future version')}
                    </Text>
                  </View>
                  {on ? (
                    <View style={styles.btnCol}>
                      {tieneConsentPropio(p.key) ? (
                        <Pressable onPress={() => onManage(p.key)} disabled={busy === p.key} style={[styles.btn, styles.btnManage]}
                          accessibilityRole="button">
                          <Text style={styles.btnManageTxt}>{t('mob.wear.manageSignals', 'Manage signals')}</Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => onDisconnect(p.key, p.name)} disabled={busy === p.key} style={[styles.btn, styles.btnOff]}>
                        <Text style={styles.btnOffTxt}>{t('mob.disconnect', "Disconnect")}</Text>
                      </Pressable>
                    </View>
                  ) : ok ? (
                    <Pressable onPress={() => onConnect(p.key, p.name, p.scopes)} disabled={busy === p.key} style={[styles.btn, styles.btnOn]}>
                      <Text style={styles.btnOnTxt}>{busy === p.key ? '…' : t('ui.connectWord', 'Connect')}</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.btn, styles.btnDim]}><Text style={styles.btnDimTxt}>{t('mob.wear.pronto', 'Soon')}</Text></View>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.note}>{Platform.OS === 'android'
            ? t('mob.wear.notaAndroid', 'Health Connect arrives in a future version: until then nothing syncs on Android. Connecting records your consent; disconnecting stops any sync immediately.')
            : t('mob.wear.notaIos', 'Connecting records your consent now. Apple Health syncs live in this build; other sources activate as their connectors ship. Disconnecting stops sync immediately.')}</Text>
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
  // UST-09 C1 · dos botones apilados a la derecha cuando la conexión está viva
  btnCol: { alignItems: 'flex-end', gap: 6 },
  btnManage: { borderWidth: 1, borderColor: colors.coral, backgroundColor: colors.white },
  btnManageTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.coral },
  btnDimTxt: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted },
  btnDim: { backgroundColor: '#F1E9E3', opacity: 1 },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 16, lineHeight: 17, paddingHorizontal: 4 },
});
