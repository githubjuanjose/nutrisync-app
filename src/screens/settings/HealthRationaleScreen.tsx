/**
 * UST-2026-09-08-16 · C7 (D5) — JUSTIFICACIÓN de los permisos de salud.
 *
 * Google exige que una app que lee Health Connect pueda EXPLICAR, en su propia
 * pantalla, para qué usa cada señal: el intent-filter
 * `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` viaja en el manifest
 * desde el 25-ago y hasta hoy no lo atendía nadie — la app abría en la Home.
 * Sin esta pantalla, Play puede rechazar la declaración de datos de salud.
 *
 * El «para qué» de cada señal NO se escribe aquí: sale de mapping.SIGNALS, la
 * misma fuente que la pantalla de consentimiento. Una sola definición: si
 * cambia el motivo, cambia en los dos sitios a la vez.
 *
 * DESVIACIÓN DECLARADA (temporal, caduca con el nativo 0.24.0): el enrutado
 * AUTOMÁTICO desde el intent del sistema necesita leer la acción de la Activity,
 * que es código nativo y no viaja por OTA. Hoy la pantalla se alcanza desde el
 * consentimiento y desde Dispositivos conectados; en la 0.24.0 el intent
 * aterrizará aquí directamente. Registrada en lib/paridad.ts.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bordesPantalla } from '../../lib/plataforma';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { SIGNALS, SignalType } from '../../lib/health/mapping';
import { nombreProveedor, proveedorDePlataforma } from '../../lib/health/proveedor';
import { hcAbrirAjustes } from '../../lib/health/healthconnect';

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

const abrirPrivacidad = () =>
  Linking.openURL('https://nutrisynccollective.com/legal/privacy.html').catch(() => {});

export default function HealthRationaleScreen({ navigation, route }: any) {
  const t = useT();
  const provider: string = route?.params?.provider ?? proveedorDePlataforma(Platform.OS) ?? 'health_connect';
  const nombreProv = nombreProveedor(provider);
  const esHC = provider === 'health_connect';

  return (
    <View style={st.fill}>
      <SafeAreaView style={st.fill} edges={bordesPantalla(Platform.OS)}>
        <View style={st.headerBar}>
          <Pressable onPress={() => navigation.goBack()}><Text style={st.back}>‹</Text></Pressable>
          <Text style={st.headerTitle}>{t('mob.wear.justTitulo', 'Why we ask')}</Text><View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={st.titulo}>{t('mob.wear.justH1', 'What NutriSync reads, and what for')}</Text>
          <Text style={st.intro}>
            {t('mob.wear.justIntro', 'NutriSync reads only the signals you switch on, one by one, and only to fill in your own daily log and adjust your guidance. What you write always wins: your data fills gaps, it never corrects you.')
              .replace('{{prov}}', nombreProv)}
          </Text>

          <Text style={st.seccion}>{t('mob.wear.justSenales', 'SIGNAL BY SIGNAL')}</Text>
          <View style={st.card}>
            {SIGNALS.map((s) => (
              <View key={s.type} style={st.fila}>
                <View style={{ flex: 1 }}>
                  <Text style={st.nombre}>
                    {t(NOMBRES[s.type][0], NOMBRES[s.type][1])}
                    {s.esencial ? ` · ${t('mob.wear.justEsencial', 'recommended')}` : ''}
                  </Text>
                  <Text style={st.porque}>{t(`mob.wear.pq.${s.type}`, s.porque)}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={st.seccion}>{t('mob.wear.justEscribir', 'WHAT WE WRITE BACK')}</Text>
          <View style={st.card}>
            <View style={st.fila}>
              <Text style={st.porque}>
                {t('mob.wear.justEscribirTxt', 'Only your period, only if you turn that switch on, and only the day you log it here. Nothing else is ever written to your health app.')}
              </Text>
            </View>
          </View>

          <Text style={st.seccion}>{t('mob.wear.justNunca', 'WHAT WE NEVER DO')}</Text>
          <View style={st.card}>
            <View style={st.fila}>
              <Text style={st.porque}>
                {t('mob.wear.justNuncaTxt', 'Health data is never used for advertising, never sold, never shared with other users and never fed to generative AI. We keep short windows and aggregates, not your life history, and you can revoke access in one tap — sync stops immediately.')}
              </Text>
            </View>
          </View>

          <Pressable onPress={abrirPrivacidad} style={st.btn} accessibilityRole="button">
            <Text style={st.btnTxt}>{t('mob.legalPrivacy', 'Privacy policy')}</Text>
          </Pressable>
          {esHC && Platform.OS === 'android' ? (
            <Pressable onPress={hcAbrirAjustes} style={st.btnGhost} accessibilityRole="button">
              <Text style={st.btnGhostTxt}>{t('mob.wear.justAjustesHC', 'Manage permissions in Health Connect')}</Text>
            </Pressable>
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
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4EBE3' },
  nombre: { fontFamily: font.medium, fontSize: 14.5, color: colors.ink },
  porque: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, marginTop: 2, lineHeight: 18 },
  btn: { backgroundColor: colors.coral, borderRadius: radius.pill, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnTxt: { fontFamily: font.semibold, fontSize: 15.5, color: '#fff' },
  btnGhost: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnGhostTxt: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
});
