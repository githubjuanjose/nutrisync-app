/**
 * Wearables · la INVITACIÓN de la primera visita (UST-2026-08-24-06 · F4).
 *
 * No bloquea nada: una tarjeta en el registro diario que se descarta para
 * siempre con un toque (AsyncStorage) y desaparece sola si ya hay conexión.
 * Copy BORRADOR pendiente de Pilar — es JS, se retoca por OTA.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, font, radius, shadow } from '../theme';
import { flags } from '../lib/flags';
import { useSession } from '../state/SessionProvider';
import { getConnections } from '../lib/health/connections';
import { useT } from '../i18n';

const CLAVE = 'ns.wear.invite.v1';

export default function WearInvite({ navigation }: { navigation: any }) {
  const t = useT();
  const { userId } = useSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!flags.connectors || !userId) return;
        if ((await AsyncStorage.getItem(CLAVE)) === '1') return;
        const conexiones = await getConnections(userId);
        const ya = conexiones.some((c) => c.provider === 'apple_health' || c.provider === 'health_connect');
        if (!ya && vivo) setVisible(true);
      } catch { /* invitación fallida = invitación que no sale; jamás rompe la pantalla */ }
    })();
    return () => { vivo = false; };
  }, [userId]);

  if (!visible) return null;

  const descartar = () => { setVisible(false); AsyncStorage.setItem(CLAVE, '1').catch(() => {}); };
  const provider = Platform.OS === 'ios' ? 'apple_health' : 'health_connect';

  return (
    <View style={st.card}>
      <View style={{ flex: 1 }}>
        <Text style={st.titulo}>✨ {t('mob.wear.invTitulo', 'Your phone can fill this in for you')}</Text>
        <Text style={st.texto}>
          {t('mob.wear.invTexto', 'Sleep, workouts and your period — if your phone already knows them, stop typing them. You choose what to share, and you can turn it off any time.')}
        </Text>
        <View style={st.filaBtn}>
          <Pressable style={st.btn} onPress={() => { descartar(); navigation.navigate('HealthConsent', { provider }); }}>
            <Text style={st.btnTxt}>{t('mob.wear.invBoton', 'Connect Health')}</Text>
          </Pressable>
          <Pressable style={st.btnGhost} onPress={descartar}>
            <Text style={st.btnGhostTxt}>{t('mob.wear.ahoraNo', 'Not now')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#FDECE6', borderRadius: radius.lg, padding: 14, marginHorizontal: 20, marginTop: 10, flexDirection: 'row', ...shadow.card },
  titulo: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  texto: { fontFamily: font.regular, fontSize: 12.5, color: colors.body, lineHeight: 18, marginTop: 4 },
  filaBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  btn: { backgroundColor: colors.coral, borderRadius: radius.pill, paddingHorizontal: 16, height: 34, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontFamily: font.semibold, fontSize: 12.5, color: '#fff' },
  btnGhost: { height: 34, alignItems: 'center', justifyContent: 'center' },
  btnGhostTxt: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
});
