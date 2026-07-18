import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { colors, font, radius, shadow } from '../../theme';
import { useT } from '../../i18n';
import { useSession } from '../../state/SessionProvider';
import { supabase } from '../../lib/supabase';

/**
 * R3-49 (f55) — in-app Send Feedback. Writes to public.feedback (RLS: insert
 * own); founders read via the admin_feedback() RPC from the hub. Replaces the
 * old mailto: hand-off that kicked users out of the app.
 */
export default function FeedbackScreen({ navigation }: any) {
  const t = useT();
  const { userId } = useSession();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!userId || !text.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: userId,
        message: text.trim(),
        app_version: Constants.expoConfig?.version ?? null,
        platform: Platform.OS,
      });
      if (error) throw error;
      setSent(true);
      setTimeout(() => navigation.goBack(), 1400);
    } catch (e: any) {
      Alert.alert(t('mob.sendFailed', 'Could not send'), e?.message ?? t('mob.tryAgain', 'Please try again.'));
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.fill}>
      <LinearGradient colors={['#FCF1EC', '#FBE7DB']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>
            <Text style={styles.headerTitle}>{t('mob.sendFeedback', 'Send Feedback')}</Text>
            <View style={{ width: 24 }} />
          </View>

          {sent ? (
            <View style={styles.sentBox}>
              <Text style={styles.sentBig}>✓</Text>
              <Text style={styles.sentTxt}>{t('mob.feedbackThanks', 'Thank you! Your feedback reached the team.')}</Text>
            </View>
          ) : (
            <View style={{ flex: 1, padding: 18 }}>
              <Text style={styles.lead}>{t('mob.feedbackLead', 'Tell us what to improve — every message goes straight to the founders.')}</Text>
              <TextInput
                value={text} onChangeText={setText} multiline autoFocus
                placeholder={t('mob.feedbackPh', 'Write your message…')} placeholderTextColor={colors.faint}
                style={styles.input} maxLength={4000}
              />
              <Pressable onPress={send} disabled={busy || !text.trim()} style={[styles.btn, (busy || !text.trim()) && { opacity: 0.5 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>{t('mob.send', 'Send')}</Text>}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  back: { fontSize: 30, color: colors.ink, width: 24, marginTop: -3 },
  headerTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  lead: { fontFamily: font.regular, fontSize: 13.5, color: colors.muted, lineHeight: 19, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: 16, fontFamily: font.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top', ...shadow.card },
  btn: { backgroundColor: colors.coral, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  btnTxt: { fontFamily: font.semibold, fontSize: 15, color: '#fff' },
  sentBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  sentBig: { fontSize: 44, color: '#3DBE8B', fontFamily: font.bold },
  sentTxt: { fontFamily: font.medium, fontSize: 15, color: colors.ink, textAlign: 'center', marginTop: 10, lineHeight: 21 },
});
