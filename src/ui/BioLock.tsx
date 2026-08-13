import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, font, radius } from '../theme';
import { PeachBg } from './PeachBg';
import { PrimaryButton } from './Buttons';
import { useSession } from '../state/SessionProvider';
import { useT } from '../i18n';

/**
 * Epic K (decision 3B) — opt-in biometric lock.
 *   • BioOfferModal: one-time "unlock with Face ID?" offer after the first
 *     login. Accept → ns.biolock='1' + a trial authenticate. Either way the
 *     offer is marked as shown (ns.biooffered='1') and never reappears.
 *   • BioGate: at cold start, if the lock is on AND there is a session AND the
 *     device actually has enrolled biometrics, hold the app behind a peach
 *     lock screen until authenticateAsync succeeds. Fallback = sign out.
 *   • useBioOffer: tiny controller for mounting the modal at the root.
 * No hardware / not enrolled → never blocks, never offers.
 */

const KEY_ENABLED = 'ns.biolock';
const KEY_OFFERED = 'ns.biooffered';

async function canUseBiometrics(): Promise<boolean> {
  try {
    const hw = await LocalAuthentication.hasHardwareAsync();
    if (!hw) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* One-time offer modal                                                */
/* ------------------------------------------------------------------ */

export function BioOfferModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const busy = useRef(false);

  const finish = useCallback(async (accepted: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (accepted) {
        await SecureStore.setItemAsync(KEY_ENABLED, '1');
        // Trial run so the OS permission/consent sheet appears right now,
        // not as a surprise on the next cold start.
        await LocalAuthentication.authenticateAsync({ promptMessage: t('mob.auth.bioUnlock', 'Unlock NutriSync') });
      }
    } catch { /* best-effort: the gate never locks without working biometrics */ }
    try { await SecureStore.setItemAsync(KEY_OFFERED, '1'); } catch {}
    busy.current = false;
    onClose();
  }, [onClose, t]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => finish(false)}>
      <View style={m.backdrop}>
        <View style={m.card}>
          <Text style={m.title}>{t('mob.auth.bioTitle', 'Unlock with Face ID?')}</Text>
          <Text style={m.sub}>
            {t('mob.auth.bioSub', 'Open NutriSync with your face or fingerprint. Your password still works, and biometrics never leave your phone.')}
          </Text>
          <PrimaryButton label={t('mob.auth.bioYes', 'Yes, activate')} onPress={() => finish(true)} style={{ marginTop: 22 }} />
          <Pressable onPress={() => finish(false)} style={m.noBtn} hitSlop={8}>
            <Text style={m.noTxt}>{t('mob.auth.bioNo', 'Not now')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Root-level controller for the one-time offer: visible once there is a
 * session, the offer was never shown, the lock isn't already on, and the
 * device can actually do biometrics.
 */
export function useBioOffer() {
  const { session, loading } = useSession();
  const [visible, setVisible] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (loading || !session || checked.current) return;
    checked.current = true;
    let alive = true;
    // Small delay so the post-login navigation settles before the modal fades in.
    const timer = setTimeout(async () => {
      try {
        if ((await SecureStore.getItemAsync(KEY_OFFERED)) === '1') return;
        if ((await SecureStore.getItemAsync(KEY_ENABLED)) === '1') return;
        if (!(await canUseBiometrics())) return;
        if (alive) setVisible(true);
      } catch { /* never block the app over the offer */ }
    }, 900);
    return () => { alive = false; clearTimeout(timer); };
  }, [loading, session]);

  return { visible, close: () => setVisible(false) };
}

/* ------------------------------------------------------------------ */
/* Cold-start gate                                                     */
/* ------------------------------------------------------------------ */

/** Alas + marca. Una sola definición: la espera y el bloqueo enseñan lo mismo. */
function Marca() {
  return (
    <View style={g.center}>
      <Image source={require('../../assets/nutri-wings.png')} style={g.wings} resizeMode="contain" />
      <Text style={g.brand}>
        <Text style={{ color: colors.ink }}>Nutri</Text>
        <Text style={{ color: colors.brandOrange }}>Sync</Text>
      </Text>
    </View>
  );
}

export function BioGate({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useSession();
  const t = useT();
  const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking');
  const decided = useRef(false);
  const authBusy = useRef(false);

  useEffect(() => {
    if (loading || decided.current) return;
    decided.current = true;
    (async () => {
      try {
        if (!session) { setState('open'); return; }
        if ((await SecureStore.getItemAsync(KEY_ENABLED)) !== '1') { setState('open'); return; }
        if (!(await canUseBiometrics())) { setState('open'); return; }
        setState('locked');
      } catch {
        setState('open');
      }
    })();
  }, [loading, session]);

  // Fallback path: signing out drops the session → release the gate to login.
  useEffect(() => {
    if (!session && state === 'locked') setState('open');
  }, [session, state]);

  const tryUnlock = useCallback(async () => {
    if (authBusy.current) return;
    authBusy.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({ promptMessage: t('mob.auth.bioUnlock', 'Unlock NutriSync') });
      if (res.success) setState('open');
    } catch { /* stay locked; the button retries */ }
    authBusy.current = false;
  }, [t]);

  // Prompt automatically the moment the lock screen appears.
  useEffect(() => {
    if (state === 'locked') tryUnlock();
  }, [state, tryUnlock]);

  if (state === 'open') return <>{children}</>;

  // r17-i: antes esto era un `<PeachBg />` pelado — un degradado con NADA
  // encima. Unos segundos de pantalla vacía no se leen como «está arrancando»,
  // se leen como «se ha colgado», y eso fue justo lo que reportó Juanjo. Ahora
  // la espera enseña la misma cara que la pantalla de bloqueo, así que lo único
  // que cambia al decidirse son los botones.
  if (state === 'checking') {
    return (
      <PeachBg>
        <SafeAreaView style={g.fill}><Marca /></SafeAreaView>
      </PeachBg>
    );
  }

  return (
    <PeachBg>
      <SafeAreaView style={g.fill}>
        <Marca />
        <View style={g.actions}>
          <PrimaryButton label={t('mob.auth.bioUnlock', 'Unlock NutriSync')} onPress={tryUnlock} />
          <Pressable onPress={() => { signOut(); }} style={g.fallback} hitSlop={8}>
            <Text style={g.fallbackTxt}>{t('mob.auth.bioFallback', 'Use password')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </PeachBg>
  );
}

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,29,26,0.45)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    alignSelf: 'stretch', backgroundColor: colors.white, borderRadius: radius.lg, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 12,
  },
  title: { fontFamily: font.semibold, fontSize: 20, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 8 },
  noBtn: { marginTop: 16, alignItems: 'center' },
  noTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});

const g = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wings: { width: 132, height: 126 },
  brand: { fontFamily: font.medium, fontSize: 28, marginTop: 12 },
  actions: { paddingHorizontal: 40, paddingBottom: 28 },
  fallback: { marginTop: 16, alignItems: 'center' },
  fallbackTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
});
