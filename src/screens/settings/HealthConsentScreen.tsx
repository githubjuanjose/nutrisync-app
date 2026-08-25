/**
 * Wearables · CONSENT propio (UST-2026-08-24-06 · F1/F2/F4).
 *
 * Señal a señal, con el «para qué» delante (los textos viven en mapping.SIGNALS
 * y aquí solo se traducen). El write-back del período es un toggle SEPARADO y
 * APAGADO. Nada bloquea: «Ahora no» es un final digno, y todo se revoca en un
 * toque desde Dispositivos conectados. Textos BORRADOR pendientes de Pilar
 * (validación de producto — firma UST-06); son JS: se retocan por OTA.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow } from '../../theme';
import { notify } from '../../lib/notify';
import { useSession } from '../../state/SessionProvider';
import { useT } from '../../i18n';
import { SIGNALS, SignalType } from '../../lib/health/mapping';
import { connectProvider } from '../../lib/health/connections';
import { hkDisponible, hkPedirPermisos } from '../../lib/health/healthkit';
import { syncSaludAlAbrir } from '../../lib/health/sync';

const NOMBRES: Record<SignalType, [string, string]> = {
  sleep_minutes:     ['mob.wear.n.sleep', 'Sleep'],
  workout:           ['mob.wear.n.workout', 'Workouts'],
  menstrual_flow:    ['mob.wear.n.flow', 'Menstrual flow'],
  active_energy:     ['mob.wear.n.energy', 'Active energy'],
  steps:             ['mob.wear.n.steps', 'Steps'],
  resting_hr:        ['mob.wear.n.rhr', 'Resting heart rate'],
  hrv:               ['mob.wear.n.hrv', 'Heart rate variability'],
  wrist_temperature: ['mob.wear.n.temp', 'Wrist temperature'],
};

export default function HealthConsentScreen({ navigation, route }: any) {
  const t = useT();
  const { userId } = useSession();
  const provider: string = route?.params?.provider ?? (Platform.OS === 'ios' ? 'apple_health' : 'health_connect');
  const esApple = provider === 'apple_health';
  const nombreProv = esApple ? 'Apple Health' : 'Health Connect';

  const [sel, setSel] = useState<Set<SignalType>>(
    new Set(SIGNALS.filter((s) => s.esencial).map((s) => s.type)),
  );
  const [escribir, setEscribir] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = (tp: SignalType) =>
    setSel((p) => { const n = new Set(p); n.has(tp) ? n.delete(tp) : n.add(tp); return n; });

  const conectar = async () => {
    if (!userId || sel.size === 0) return;
    setBusy(true);
    try {
      const tipos = Array.from(sel);
      if (esApple) {
        if (await hkDisponible()) {
          const r = await hkPedirPermisos(tipos, escribir);
          if (!r.ok) {
            // Apple no cuenta qué se concedió (privacidad): registramos la
            // intención; la lectura solo trae lo realmente permitido.
            notify(t('mob.wear.permTitulo', 'Permissions'), r.error ?? t('mob.wear.permTexto', 'You can adjust permissions any time in Health.'));
          }
        } else {
          notify(nombreProv, t('mob.wear.sinBuild', 'This build does not include the Health connector yet — your choice is saved and sync will start with the next update.'));
        }
      } else {
        // O3: el conector de Health Connect llega en el mismo build 0.23.0;
        // registrar el consentimiento ya deja la sincronización lista.
        notify(nombreProv, t('mob.wear.sinBuild', 'This build does not include the Health connector yet — your choice is saved and sync will start with the next update.'));
      }
      const scopes = [...tipos, ...(escribir ? ['write_flow'] : [])];
      await connectProvider(userId, provider, scopes);
      syncSaludAlAbrir(userId).catch(() => {});   // primer sync, sin bloquear la salida
      notify(t('mob.wear.listoTitulo', 'Connected'), t('mob.wear.listoTexto', 'Your phone will now fill in what it already knows. What you write always wins.'));
      navigation.goBack();
    } catch (e: any) {
      notify(t('mob.saveFailed', 'Could not save'), e?.message ?? t('mob.tryAgain', 'Please try again.'));
    } finally { setBusy(false); }
  };

  const esenciales = SIGNALS.filter((s) => s.esencial);
  const opcionales = SIGNALS.filter((s) => !s.esencial);

  const Fila = ({ s }: { s: (typeof SIGNALS)[number] }) => (
    <View style={st.fila}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={st.nombre}>{t(NOMBRES[s.type][0], NOMBRES[s.type][1])}</Text>
        <Text style={st.porque}>{t(`mob.wear.pq.${s.type}`, s.porque)}</Text>
      </View>
      <Switch value={sel.has(s.type)} onValueChange={() => toggle(s.type)}
        trackColor={{ true: colors.coral, false: '#E7DCD3' }} thumbColor="#fff" />
    </View>
  );

  return (
    <View style={st.fill}>
      <SafeAreaView style={st.fill} edges={['top']}>
        <View style={st.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={st.back}>‹</Text></Pressable>
          <Text style={st.headerTitle}>{nombreProv}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={st.titulo}>{t('mob.wear.titulo', 'Your phone already knows part of this')}</Text>
          <Text style={st.intro}>
            {t('mob.wear.intro', 'NutriSync can fill in what your watch or phone already records — sleep, workouts, your period. You choose signal by signal, you can change your mind any time, and what you write always wins: your data fills gaps, it never corrects you.')}
          </Text>

          <Text style={st.seccion}>{t('mob.wear.esenciales', 'THE ESSENTIAL THREE')}</Text>
          <View style={st.card}>{esenciales.map((s) => <Fila key={s.type} s={s} />)}</View>

          <Text style={st.seccion}>{t('mob.wear.opcionales', 'OPTIONAL — NICE TO HAVE')}</Text>
          <View style={st.card}>{opcionales.map((s) => <Fila key={s.type} s={s} />)}</View>

          {esApple && (
            <>
              <Text style={st.seccion}>{t('mob.wear.escribirSec', 'GIVE BACK')}</Text>
              <View style={st.card}>
                <View style={st.fila}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={st.nombre}>{t('mob.wear.escribirTitulo', 'Write my period back to Health')}</Text>
                    <Text style={st.porque}>{t('mob.wear.escribirTexto', 'If you log your period here, NutriSync writes it to Apple Health too, so your other apps stay in sync. Off until you turn it on.')}</Text>
                  </View>
                  <Switch value={escribir} onValueChange={setEscribir}
                    trackColor={{ true: colors.coral, false: '#E7DCD3' }} thumbColor="#fff" />
                </View>
              </View>
            </>
          )}

          <Text style={st.legal}>
            {t('mob.wear.legal', 'This consent is separate from the pilot terms and revocable in one tap from Settings → Connected Devices; revoking stops sync immediately. Health data is used only for your features inside NutriSync — never for advertising, never sold, never fed to generative AI. We keep short windows and aggregates, not your life history.')}
          </Text>

          <Pressable onPress={conectar} disabled={busy || sel.size === 0}
            style={[st.btn, (busy || sel.size === 0) && { opacity: 0.5 }]}>
            <Text style={st.btnTxt}>{busy ? '…' : t('mob.wear.conectar', 'Connect')}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={st.btnGhost}>
            <Text style={st.btnGhostTxt}>{t('mob.wear.ahoraNo', 'Not now')}</Text>
          </Pressable>
          <Text style={st.nota}>{t('mob.wear.luego', 'You can connect later from Settings → Connected Devices.')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  titulo: { fontFamily: font.semibold, fontSize: 21, color: colors.ink, marginTop: 6 },
  intro: { fontFamily: font.regular, fontSize: 13.5, color: colors.body, lineHeight: 20, marginTop: 8 },
  seccion: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1, color: colors.muted, marginTop: 20, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, ...shadow.card },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4EBE3', gap: 8 },
  nombre: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  porque: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  legal: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, lineHeight: 17, marginTop: 16, paddingHorizontal: 4 },
  btn: { backgroundColor: colors.coral, borderRadius: radius.pill, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  btnTxt: { fontFamily: font.semibold, fontSize: 15.5, color: '#fff' },
  btnGhost: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnGhostTxt: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  nota: { fontFamily: font.regular, fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 2 },
});
