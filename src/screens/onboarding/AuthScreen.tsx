import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { colors, font, radius, shadow } from '../../theme';
import { PeachBg } from '../../ui/PeachBg';
import { PrimaryButton } from '../../ui/Buttons';
import { LanguagePicker } from '../../ui/LanguagePicker';
import { supabase } from '../../lib/supabase';
import { isSupabaseConfigured } from '../../lib/config';
import { RootStackParamList } from '../../navigation/types';
import { useT } from '../../i18n';

// Epic K (4B): closes the in-app browser tab once the OAuth redirect fires.
WebBrowser.maybeCompleteAuthSession();
// Epic K: los emails de auth siempre aterrizan en producción, pase lo que pase con Site URL
const WEB_REDIRECT = 'https://nutrisynccollective.com/app.html';

type Props = NativeStackScreenProps<RootStackParamList, 'Login' | 'CreateAccount'>;

/**
 * Epic K (decision 4B) — providers/code first, password as fallback:
 *   1. Apple (iOS only) and Google, native-feeling one-tap sign-in
 *   2. Email + "Email me a code" (6-digit OTP, creates the account if new)
 *   3. A discreet "Use password instead" link unfolds the classic form
 *      (existing login/signup flow, incl. R3-51 activation handling).
 * Routing after auth stays with the session-aware RootNavigator — untouched.
 */

const CFG_ERR = 'Backend not configured — set EXPO_PUBLIC_SUPABASE_ANON_KEY (.env).';

/** Tiny param extractor — works on both ?query and #fragment redirects. */
function urlParam(url: string, name: string): string | null {
  const m = new RegExp('[?&#]' + name + '=([^&#]+)').exec(url);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
}

type Mode = 'providers' | 'otpVerify' | 'password';
type Busy = '' | 'apple' | 'google' | 'otp' | 'verify' | 'pwd';

export default function AuthScreen({ route, navigation }: Props) {
  const t = useT();
  const signup = route.name === 'CreateAccount';
  const [mode, setMode] = useState<Mode>('providers');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<Busy>('');
  const [err, setErr] = useState('');
  const [otpResent, setOtpResent] = useState(false);
  // R3-51 (D1, two-step activation): signup is accepted with any email, but the
  // account only ACTIVATES via the verification link (Supabase "Confirm email"
  // must be ON: dashboard → Auth → Providers → Email). This state renders the
  // "check your inbox" panel with a resend option.
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  // Epic K: password login against an unconfirmed email → inline resend block.
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resent, setResent] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  const onBack = () => {
    setErr('');
    if (awaitingVerify) { setAwaitingVerify(false); return; }
    if (mode !== 'providers') { setMode('providers'); return; }
    navigation.goBack();
  };

  /* ---------- Apple (iOS only) ---------- */
  const appleSignIn = async () => {
    if (busy) return;
    setErr('');
    if (!isSupabaseConfigured) { setErr(CFG_ERR); return; }
    setBusy('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (error) throw error;
      // Apple only shares the name on the FIRST authorization — stash it like
      // the password signup does (metadata.first_name), best-effort.
      const given = credential.fullName?.givenName;
      if (given) supabase.auth.updateUser({ data: { first_name: given } }).then(() => {}, () => {});
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') return;
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  /* ---------- Google (PKCE via the system browser) ---------- */
  const googleSignIn = async () => {
    if (busy) return;
    setErr('');
    if (!isSupabaseConfigured) { setErr(CFG_ERR); return; }
    setBusy('google');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'nutrisync://auth', skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Could not start Google sign-in.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, 'nutrisync://auth');
      if (result.type !== 'success') return;
      const authCode = urlParam(result.url, 'code');
      if (!authCode) throw new Error(urlParam(result.url, 'error_description') ?? 'Google sign-in failed.');
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(authCode);
      if (exErr) throw exErr;
      // Session lands → the session-aware navigator routes onward.
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  /* ---------- Email OTP ("Email me a code") ---------- */
  const sendOtp = async (isResend = false) => {
    if (busy) return;
    if (!emailValid) return;
    setErr('');
    if (!isSupabaseConfigured) { setErr(CFG_ERR); return; }
    setBusy('otp');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: WEB_REDIRECT },
      });
      if (error) throw error;
      if (isResend) {
        setOtpResent(true);
      } else {
        setCode('');
        setOtpResent(false);
        setMode('otpVerify');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const verifyCode = async () => {
    if (busy || code.length !== 6) return;
    setErr('');
    setBusy('verify');
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
      // Session lands → the session-aware navigator routes onward.
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  /* ---------- Password fallback (the pre-Epic-K flow, unchanged) ---------- */
  const resendConfirm = async () => {
    if (busy) return;
    setErr('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: WEB_REDIRECT } });
      if (error) throw error;
      setResent(true);
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    }
  };

  const submit = async () => {
    if (busy) return;
    setErr('');
    if (!isSupabaseConfigured) { setErr(CFG_ERR); return; }
    setBusy('pwd');
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: WEB_REDIRECT, data: { first_name: firstName.trim() } },
        });
        if (error) throw error;
        // Session returned = confirmations OFF (legacy) → navigator proceeds.
        // No session = activation pending → show the verify panel.
        if (!data.session) setAwaitingVerify(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          // "Email not confirmed" → offer to resend the activation link inline.
          if (/confirm/i.test(error.message)) { setNeedsConfirm(true); setResent(false); return; }
          throw error;
        }
        // Routing is handled by the session-aware navigator.
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy('');
    }
  };

  const switchRoute = () => navigation.replace(signup ? 'Login' : 'CreateAccount');

  return (
    <PeachBg>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <LanguagePicker />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          {awaitingVerify ? (
            /* R3-51: activation pending — clear instructions + resend */
            <View style={styles.body}>
              <Text style={styles.h1}>{t('mob.checkInbox', 'Check your inbox')}</Text>
              <Text style={styles.sub}>
                {t('mob.verifyLead', 'We sent an activation link to')} {email.trim()}.{' '}
                {t('mob.verifyLead2', 'Open it to activate your account, then log in.')}
              </Text>
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <PrimaryButton label={t('ui.login', 'Log in')} onPress={() => { setAwaitingVerify(false); if (signup) navigation.replace('Login'); }} />
              <Pressable onPress={resendConfirm} style={{ marginTop: 18 }}>
                <Text style={styles.switch}>
                  {resent
                    ? t('mob.resent', 'Sent again — give it a minute (and check spam).')
                    : <>{t('mob.noEmail', "Didn't get it?")} <Text style={{ color: colors.coral, fontFamily: font.semibold }}>{t('mob.auth.resend', 'Resend email')}</Text></>}
                </Text>
              </Pressable>
            </View>
          ) : mode === 'otpVerify' ? (
            /* OTP step 2 — the 6-digit code */
            <View style={styles.body}>
              <Text style={styles.h1}>{t('mob.auth.otpTitle', 'Check your email')}</Text>
              <Text style={styles.sub}>{t('mob.auth.otpSub', 'We sent a 6-digit code to')} {email.trim()}</Text>
              <View style={styles.field}>
                <TextInput
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  textContentType="oneTimeCode"
                  placeholder="••••••"
                  placeholderTextColor={colors.faint}
                  style={[styles.input, styles.code]}
                />
              </View>
              <View style={{ height: 18 }} />
              {busy === 'verify' ? (
                <View style={styles.busy}><ActivityIndicator color={colors.coral} /></View>
              ) : (
                <PrimaryButton label={t('mob.auth.otpVerify', 'Verify')} onPress={verifyCode} style={code.length === 6 ? undefined : styles.dim} />
              )}
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <Pressable onPress={() => sendOtp(true)} style={{ marginTop: 18 }}>
                <Text style={styles.switch}>
                  {otpResent
                    ? t('mob.resent', 'Sent again — give it a minute (and check spam).')
                    : <Text style={styles.linkCoral}>{t('mob.auth.resend', 'Resend email')}</Text>}
                </Text>
              </Pressable>
            </View>
          ) : mode === 'password' ? (
            /* Password fallback — the classic email+password form */
            <View style={styles.body}>
              <Text style={styles.h1}>{signup ? t('ui.createAccount', 'Create account') : t('ui.loginTitle', 'Welcome back')}</Text>
              <Text style={styles.sub}>{signup ? t('mob.signupSub', 'A minute to set up your rhythm.') : t('mob.loginSub', 'Log in to sync your cycle.')}</Text>

              {signup && (
                <Field placeholder={t('mob.firstName', 'First name')} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              )}
              <Field placeholder={t('mob.email', 'Email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field placeholder={t('ui.password', 'Password')} value={password} onChangeText={setPassword} secureTextEntry />

              {needsConfirm ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmTxt}>{t('mob.auth.confirmSent', 'Confirm your email — we sent you a link.')}</Text>
                  {resent ? (
                    <Text style={styles.confirmDone}>{t('mob.resent', 'Sent again — give it a minute (and check spam).')}</Text>
                  ) : (
                    <Pressable onPress={resendConfirm} style={styles.resendBtn} hitSlop={6}>
                      <Text style={styles.resendTxt}>{t('mob.auth.resend', 'Resend email')}</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              {err ? <Text style={styles.err}>{err}</Text> : null}

              <View style={{ height: 18 }} />
              {busy === 'pwd' ? (
                <View style={styles.busy}><ActivityIndicator color={colors.coral} /></View>
              ) : (
                <PrimaryButton label={signup ? t('ui.createAccount', 'Create account') : t('ui.login', 'Log in')} onPress={submit} />
              )}

              <Pressable onPress={switchRoute} style={{ marginTop: 18 }}>
                <Text style={styles.switch}>
                  {signup ? t('ui.haveAccount', 'Already have an account?') + ' ' : t('ui.newHere', 'New here?') + ' '}
                  <Text style={{ color: colors.coral, fontFamily: font.semibold }}>{signup ? t('ui.login', 'Log in') : t('ui.createAccount', 'Create account')}</Text>
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Providers + code first (4B) */
            <View style={styles.body}>
              <Text style={styles.h1}>{signup ? t('ui.createAccount', 'Create account') : t('ui.loginTitle', 'Welcome back')}</Text>
              <Text style={styles.sub}>{signup ? t('mob.signupSub', 'A minute to set up your rhythm.') : t('mob.loginSub', 'Log in to sync your cycle.')}</Text>

              {Platform.OS === 'ios' ? (
                <Pressable onPress={appleSignIn} style={({ pressed }) => [styles.provider, styles.apple, pressed && styles.pressed]}>
                  {busy === 'apple' ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <View style={styles.providerRow}>
                      <Text style={styles.appleLogo}></Text>
                      <Text style={[styles.providerTxt, { color: colors.white }]}>{t('mob.auth.continueApple', 'Continue with Apple')}</Text>
                    </View>
                  )}
                </Pressable>
              ) : null}

              <Pressable onPress={googleSignIn} style={({ pressed }) => [styles.provider, styles.google, pressed && styles.pressed]}>
                {busy === 'google' ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <View style={styles.providerRow}>
                    <GoogleG size={18} />
                    <Text style={[styles.providerTxt, { color: colors.ink }]}>{t('mob.auth.continueGoogle', 'Continue with Google')}</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.divider} />

              <Field placeholder={t('mob.email', 'Email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <View style={{ height: 16 }} />
              {busy === 'otp' ? (
                <View style={styles.busy}><ActivityIndicator color={colors.coral} /></View>
              ) : (
                <PrimaryButton label={t('mob.auth.otpBtn', 'Email me a code')} onPress={() => sendOtp(false)} style={emailValid ? undefined : styles.dim} />
              )}

              {err ? <Text style={styles.err}>{err}</Text> : null}

              <Pressable onPress={() => { setErr(''); setNeedsConfirm(false); setMode('password'); }} style={{ marginTop: 22 }} hitSlop={6}>
                <Text style={styles.linkCoral}>{t('mob.auth.usePassword', 'Use password instead')}</Text>
              </Pressable>

              <Pressable onPress={switchRoute} style={{ marginTop: 14 }}>
                <Text style={styles.switch}>
                  {signup ? t('ui.haveAccount', 'Already have an account?') + ' ' : t('ui.newHere', 'New here?') + ' '}
                  <Text style={{ color: colors.coral, fontFamily: font.semibold }}>{signup ? t('ui.login', 'Log in') : t('ui.createAccount', 'Create account')}</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PeachBg>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <TextInput placeholderTextColor={colors.faint} style={styles.input} {...props} />
    </View>
  );
}

/** Official multicolour Google "G". */
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, height: 44 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 30, color: colors.ink, marginTop: -3 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  h1: { fontFamily: font.regular, fontSize: 34, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 26 },
  // provider pills — same geometry as Primary/SecondaryButton (58 / full pill)
  provider: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  apple: { backgroundColor: '#000000' },
  google: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appleLogo: { color: '#FFFFFF', fontSize: 20, marginTop: -2 },
  providerTxt: { fontFamily: font.semibold, fontSize: 16 },
  pressed: { opacity: 0.9 },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 24, marginBottom: 4, opacity: 0.9 },
  field: { backgroundColor: colors.white, borderRadius: radius.md, height: 56, justifyContent: 'center', paddingHorizontal: 18, marginTop: 12, ...shadow.card },
  input: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  code: { fontFamily: font.semibold, fontSize: 24, letterSpacing: 12, textAlign: 'center' },
  err: { fontFamily: font.medium, fontSize: 13, color: colors.coralDeep, marginTop: 12 },
  busy: { height: 56, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.45 },
  switch: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
  linkCoral: { fontFamily: font.semibold, fontSize: 14, color: colors.coral, textAlign: 'center' },
  confirmBox: { backgroundColor: colors.peachTop, borderRadius: radius.md, padding: 14, marginTop: 12 },
  confirmTxt: { fontFamily: font.medium, fontSize: 13, color: colors.body, lineHeight: 19 },
  confirmDone: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 8 },
  resendBtn: { marginTop: 8, alignSelf: 'flex-start' },
  resendTxt: { fontFamily: font.semibold, fontSize: 13, color: colors.coral },
});
