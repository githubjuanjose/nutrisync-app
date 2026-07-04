import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font, radius, shadow } from '../../theme';
import { PrimaryButton } from '../../ui/Buttons';
import { supabase } from '../../lib/supabase';
import { isSupabaseConfigured } from '../../lib/config';
import { RootStackParamList } from '../../navigation/types';
import { useT } from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Login' | 'CreateAccount'>;

export default function AuthScreen({ route, navigation }: Props) {
  const t = useT();
  const signup = route.name === 'CreateAccount';
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!isSupabaseConfigured) {
      setErr('Backend not configured — set EXPO_PUBLIC_SUPABASE_ANON_KEY (.env).');
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() } },
        });
        if (error) throw error;
        // If a session is returned, the session-aware navigator switches to Onboarding.
        if (!data.session) setErr('Account created. Please confirm your email, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // Routing is handled by the session-aware navigator.
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.peachTop, '#FBE3D6', colors.peachBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <View style={styles.body}>
            <Text style={styles.h1}>{signup ? t('ui.createAccount', 'Create account') : t('ui.loginTitle', 'Welcome back')}</Text>
            <Text style={styles.sub}>{signup ? 'A minute to set up your rhythm.' : 'Log in to sync your cycle.'}</Text>

            {signup && (
              <Field placeholder={t('mob.firstName', "First name")} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            )}
            <Field placeholder={t('mob.email', "Email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Field placeholder={t('ui.password', 'Password')} value={password} onChangeText={setPassword} secureTextEntry />

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <View style={{ height: 18 }} />
            {busy ? (
              <View style={styles.busy}><ActivityIndicator color={colors.coral} /></View>
            ) : (
              <PrimaryButton label={signup ? t('ui.createAccount', 'Create account') : t('ui.login', 'Log in')} onPress={submit} />
            )}

            <Pressable onPress={() => navigation.replace(signup ? 'Login' : 'CreateAccount')} style={{ marginTop: 18 }}>
              <Text style={styles.switch}>
                {signup ? t('ui.haveAccount', 'Already have an account?') + ' ' : t('ui.newHere', 'New here?') + ' '}
                <Text style={{ color: colors.coral, fontFamily: font.semibold }}>{signup ? t('ui.login', 'Log in') : t('ui.createAccount', 'Create account')}</Text>
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <TextInput placeholderTextColor={colors.faint} style={styles.input} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  h1: { fontFamily: font.regular, fontSize: 34, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 26 },
  field: { backgroundColor: colors.white, borderRadius: radius.md, height: 56, justifyContent: 'center', paddingHorizontal: 18, marginTop: 12, ...shadow.card },
  input: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  err: { fontFamily: font.medium, fontSize: 13, color: colors.coralDeep, marginTop: 12 },
  busy: { height: 56, alignItems: 'center', justifyContent: 'center' },
  switch: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
