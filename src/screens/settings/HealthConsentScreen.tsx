/**
 * Wearables · CONSENT propio (UST-2026-08-24-06 · F1/F2/F4).
 *
 * Señal a señal, con el «para qué» delante (los textos viven en mapping.SIGNALS
 * y aquí solo se traducen). El write-back del período es un toggle SEPARADO y
 * APAGADO. Nada bloquea: «Ahora no» es un final digno, y todo se revoca en un
 * toque desde Dispositivos conectados. Textos BORRADOR pendientes de Pilar
 * (validación de producto — firma UST-06); son JS: se retocan por OTA.
 *
 * UST-2026-09-07-09 · C1 — MODO EDICIÓN: si el proveedor YA está conectado
 * (switch de Movimiento o Connected Devices), la pantalla se abre con las
 * señales consentidas precargadas, el botón dice «Save changes» y a HealthKit
 * solo se le piden los tipos NUEVOS (lib/health/scopes.ts, puro + unitarios).
 * Antes esta pantalla solo se alcanzaba sin conexión: regresión r24-l/n.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bordesPantalla, consentimientoDisponible } from '../../lib/plataforma';
import { colors, font, radius, shadow } from '../../theme';
import { notify } from '../../lib/notify';
import { useSession } from '../../state/SessionProvider';
import { useT } from '../../i18n';
import { SIGNALS, SignalType } from '../../lib/health/mapping';
import { connectProvider, getConnections, updateProviderScopes } from '../../lib/health/connections';
import { scopesAEstado, estadoAScopes, tiposNuevos, hayQuePedir } from '../../lib/health/scopes';
import { adaptadorDeProveedor } from '../../lib/health/adaptador';
import { EstadoSdk, nombreProveedor, proveedorDePlataforma, PLAY_HC } from '../../lib/health/proveedor';
import { hcEstado, hcHayModulo } from '../../lib/health/healthconnect';
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
  const provider: string = route?.params?.provider ?? proveedorDePlataforma(Platform.OS) ?? 'health_connect';
  const esApple = provider === 'apple_health';
  const nombreProv = nombreProveedor(provider);
  const ad = adaptadorDeProveedor(provider);
  // UST-16 C3: la MISMA pantalla en las dos plataformas — el proveedor de este
  // sistema. Con cualquier otro (o en web) sigue el aviso de UST-15 C2: atrás
  // sin escribir nada, jamás una conexión que nadie leerá.
  const disponible = consentimientoDisponible(Platform.OS, provider);
  useEffect(() => {
    if (disponible) return;
    notify(nombreProv, t('mob.wear.proximamenteTexto', 'This source arrives in a future version of NutriSync. Nothing to set up yet.'));
    navigation.goBack();
  }, [disponible]); // eslint-disable-line react-hooks/exhaustive-deps

  // C2 (D4) · estado del SDK de Health Connect: instalar · actualizar · listo.
  // Ningún botón muerto: si falta la app del sistema, la pantalla lo dice y
  // lleva a Play en vez de fingir que conecta.
  const [sdk, setSdk] = useState<EstadoSdk>('listo');
  useEffect(() => {
    let vivo = true;
    if (provider !== 'health_connect' || Platform.OS !== 'android') return;
    hcEstado().then((e) => { if (vivo) setSdk(e); }).catch(() => {});
    return () => { vivo = false; };
  }, [provider]);
  // Sin módulo en el binario (runtimes anteriores al 25-ago, que reciben esta
  // misma OTA) no falta Health Connect: falta ACTUALIZAR la app desde Play.
  const sinModulo = provider === 'health_connect' && Platform.OS === 'android' && !hcHayModulo();
  const faltaHC = provider === 'health_connect' && !sinModulo && (sdk === 'instalar' || sdk === 'actualizar');
  const abrirPlay = () => { Linking.openURL(PLAY_HC).catch(() => {}); };

  const [sel, setSel] = useState<Set<SignalType>>(
    new Set(SIGNALS.filter((s) => s.esencial).map((s) => s.type)),
  );
  const [escribir, setEscribir] = useState(false);
  const [busy, setBusy] = useState(false);
  // C1 · modo edición: scopes que YA tiene la conexión (null = no conectada → alta normal)
  const [scopesAntes, setScopesAntes] = useState<string[] | null>(null);
  const editando = scopesAntes !== null;

  // C1 · al entrar, si el proveedor ya está conectado, precargar lo consentido.
  // Se lee de la base (la verdad), no de params: el switch de Movimiento
  // conecta con las esenciales + pasos sin pasar por aquí.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!userId) return;
        const con = (await getConnections(userId)).find((c) => c.provider === provider);
        if (!vivo || !con) return;
        const e = scopesAEstado(con.scopes);
        setSel(e.tipos.size ? e.tipos : new Set(SIGNALS.filter((s) => s.esencial).map((s) => s.type)));
        setEscribir(e.escribir);
        setScopesAntes(con.scopes ?? []);
      } catch { /* sin conexión legible → alta normal; nunca en blanco */ }
    })();
    return () => { vivo = false; };
  }, [userId, provider]);

  const toggle = (tp: SignalType) =>
    setSel((p) => { const n = new Set(p); n.has(tp) ? n.delete(tp) : n.add(tp); return n; });

  const conectar = async () => {
    if (!userId || sel.size === 0) return;
    setBusy(true);
    try {
      const tipos = Array.from(sel);
      // Editando: a la plataforma solo se le piden los tipos NUEVOS (o el write-back recién activado).
      const aPedir = editando ? tiposNuevos(scopesAntes!, tipos) : tipos;
      const pedir = editando ? hayQuePedir(scopesAntes!, tipos, escribir) : true;

      // UST-16 C1/C3 · un solo camino para las dos plataformas: el adaptador de
      // ESTE proveedor. La diferencia real es si el sistema dice qué concedió
      // (Android sí — y entonces se guarda ESO, no lo que pedimos; Apple no lo
      // revela por privacidad y se registra la intención, como en UST-06).
      let tiposFinales: SignalType[] = tipos;
      let escribirFinal = escribir;
      if (ad && await ad.disponible()) {
        if (pedir) {
          const r = await ad.pedirPermisos(aPedir, escribir);
          if (ad.informaConcesion) {
            const antes = editando ? scopesAEstado(scopesAntes!) : { tipos: new Set<SignalType>(), escribir: false };
            const concedidas = new Set<SignalType>(r.tipos);
            for (const tp of antes.tipos) concedidas.add(tp);       // lo ya concedido sigue concedido
            tiposFinales = tipos.filter((tp) => concedidas.has(tp));
            escribirFinal = escribir && (r.escribir || antes.escribir);
            if (!tiposFinales.length) {
              // Nada concedido: NO se escribe una conexión que no leería nada.
              notify(t('mob.wear.permTitulo', 'Permissions'),
                t('mob.wear.hcSinPermiso', 'Android did not grant any of the signals, so nothing was connected. You can try again whenever you want.'));
              setBusy(false);
              return;
            }
          } else if (!r.ok) {
            notify(t('mob.wear.permTitulo', 'Permissions'), r.error ?? t('mob.wear.permTexto', 'You can adjust permissions any time in Health.'));
          }
        }
      } else if (provider === 'health_connect') {
        // C2 · no se guarda nada, y se dice la verdad EXACTA: si el binario es
        // anterior al módulo (runtimes 0.18–0.22, que reciben esta misma OTA),
        // lo que falta es ACTUALIZAR la app; si el módulo está, lo que falta es
        // Health Connect en el teléfono. Mandar a instalar algo que ya se tiene
        // es el mismo callejón que cerró UST-15, con otra cara.
        if (sinModulo) {
          notify(nombreProv, t('mob.wear.sinBuild', 'This build does not include the Health connector yet — your choice is saved and sync will start with the next update.'));
        } else {
          setSdk(await hcEstado());
          notify(nombreProv, t('mob.wear.hcInstalarTexto', 'Health Connect is the Android app where your health data lives. Install it (free, from Google) and come back — NutriSync will read only what you choose.'));
        }
        setBusy(false);
        return;
      } else {
        notify(nombreProv, t('mob.wear.sinBuild', 'This build does not include the Health connector yet — your choice is saved and sync will start with the next update.'));
      }
      const scopes = estadoAScopes(new Set(tiposFinales), escribirFinal);
      if (editando) {
        await updateProviderScopes(userId, provider, scopes);
        syncSaludAlAbrir(userId).catch(() => {});   // la siguiente sync ya lee solo lo elegido
        notify(t('mob.wear.guardadoTitulo', 'Saved'), t('mob.wear.guardadoTexto', 'Your choice is saved. From now on NutriSync reads only what you selected.'));
      } else {
        await connectProvider(userId, provider, scopes);
        syncSaludAlAbrir(userId).catch(() => {});   // primer sync, sin bloquear la salida
        notify(t('mob.wear.listoTitulo', 'Connected'), t('mob.wear.listoTexto', 'Your phone will now fill in what it already knows. What you write always wins.'));
      }
      navigation.goBack();
    } catch (e: any) {
      notify(t('mob.saveFailed', 'Could not save'), e?.message ?? t('mob.tryAgain', 'Please try again.'));
    } finally { setBusy(false); }
  };

  if (!disponible) return null;
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
      <SafeAreaView style={st.fill} edges={bordesPantalla(Platform.OS)}>
        <View style={st.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={st.back}>‹</Text></Pressable>
          <Text style={st.headerTitle}>{nombreProv}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={st.titulo}>{t('mob.wear.titulo', 'Your phone already knows part of this')}</Text>
          <Text style={st.intro}>
            {t('mob.wear.intro', 'NutriSync can fill in what your watch or phone already records — sleep, workouts, your period. You choose signal by signal, you can change your mind any time, and what you write always wins: your data fills gaps, it never corrects you.')}
          </Text>

          {/* C2 (D4) · Health Connect ausente o viejo: se dice y se lleva a Play.
              Un botón que no hace nada es peor que no tener botón (P0 de UST-15). */}
          {faltaHC ? (
            <View style={st.aviso}>
              <Text style={st.avisoTit}>
                {sdk === 'actualizar'
                  ? t('mob.wear.hcActualizarTitulo', 'Health Connect needs an update')
                  : t('mob.wear.hcInstalarTitulo', 'Health Connect is not on this phone yet')}
              </Text>
              <Text style={st.avisoTxt}>
                {sdk === 'actualizar'
                  ? t('mob.wear.hcActualizarTexto', 'Your version of Health Connect is older than the one NutriSync needs. Update it and come back — nothing else changes.')
                  : t('mob.wear.hcInstalarTexto', 'Health Connect is the Android app where your health data lives. Install it (free, from Google) and come back — NutriSync will read only what you choose.')}
              </Text>
              <Pressable onPress={abrirPlay} style={st.avisoBtn} accessibilityRole="button">
                <Text style={st.avisoBtnTxt}>
                  {sdk === 'actualizar'
                    ? t('mob.wear.hcActualizarBoton', 'Update Health Connect')
                    : t('mob.wear.hcInstalarBoton', 'Install Health Connect')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={st.seccion}>{t('mob.wear.esenciales', 'THE ESSENTIAL THREE')}</Text>
          <View style={st.card}>{esenciales.map((s) => <Fila key={s.type} s={s} />)}</View>

          <Text style={st.seccion}>{t('mob.wear.opcionales', 'OPTIONAL — NICE TO HAVE')}</Text>
          <View style={st.card}>{opcionales.map((s) => <Fila key={s.type} s={s} />)}</View>

          {/* C6 · el write-back también en Android (WRITE_MENSTRUATION ya viaja en
              el binario desde el 25-ago). Sigue APAGADO por defecto. */}
          <Text style={st.seccion}>{t('mob.wear.escribirSec', 'GIVE BACK')}</Text>
          <View style={st.card}>
            <View style={st.fila}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={st.nombre}>{t('mob.wear.escribirTitulo', 'Write my period back to Health')}</Text>
                <Text style={st.porque}>
                  {esApple
                    ? t('mob.wear.escribirTexto', 'If you log your period here, NutriSync writes it to Apple Health too, so your other apps stay in sync. Off until you turn it on.')
                    : t('mob.wear.escribirTextoHC', 'If you log your period here, NutriSync writes it to Health Connect too, so your other apps stay in sync. Off until you turn it on. One difference: “none” is not written back — Health Connect has no such level.')}
                </Text>
              </View>
              <Switch value={escribir} onValueChange={setEscribir}
                trackColor={{ true: colors.coral, false: '#E7DCD3' }} thumbColor="#fff" />
            </View>
          </View>

          {/* C7 · el «para qué» completo, la misma página que Google exige enseñar
              cuando el sistema pregunta por los permisos de salud. */}
          <Pressable onPress={() => navigation.navigate('HealthRationale', { provider })} hitSlop={8} accessibilityRole="button">
            <Text style={st.enlace}>{t('mob.wear.verJustificacion', 'Why NutriSync asks for each signal')} ›</Text>
          </Pressable>

          <Text style={st.legal}>
            {t('mob.wear.legal', 'This consent is separate from the pilot terms and revocable in one tap from Settings → Connected Devices; revoking stops sync immediately. Health data is used only for your features inside NutriSync — never for advertising, never sold, never fed to generative AI. We keep short windows and aggregates, not your life history.')}
          </Text>

          <Pressable onPress={conectar} disabled={busy || sel.size === 0}
            style={[st.btn, (busy || sel.size === 0) && { opacity: 0.5 }]}>
            <Text style={st.btnTxt}>{busy ? '…' : editando ? t('mob.wear.guardar', 'Save changes') : t('mob.wear.conectar', 'Connect')}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={st.btnGhost}>
            <Text style={st.btnGhostTxt}>{editando ? t('ui.cancel', 'Cancel') : t('mob.wear.ahoraNo', 'Not now')}</Text>
          </Pressable>
          {!editando ? (
            <Text style={st.nota}>{t('mob.wear.luego', 'You can connect later from Settings → Connected Devices.')}</Text>
          ) : null}
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
  enlace: { fontFamily: font.medium, fontSize: 13, color: colors.coral, marginTop: 14, marginLeft: 4 },
  aviso: { backgroundColor: '#FDECE6', borderRadius: radius.lg, padding: 14, marginTop: 16 },
  avisoTit: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  avisoTxt: { fontFamily: font.regular, fontSize: 12.5, color: colors.body, lineHeight: 18, marginTop: 4 },
  avisoBtn: { backgroundColor: colors.coral, borderRadius: radius.pill, height: 42, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  avisoBtnTxt: { fontFamily: font.semibold, fontSize: 14, color: '#fff' },
});
