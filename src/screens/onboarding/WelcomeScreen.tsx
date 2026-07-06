import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../../theme';
import { PeachBg } from '../../ui/PeachBg';
import { PrimaryButton, SecondaryButton } from '../../ui/Buttons';
import { LanguagePicker } from '../../ui/LanguagePicker';
import { RootStackParamList } from '../../navigation/types';
import { useT } from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const t = useT();
  return (
    <PeachBg>
      <SafeAreaView style={styles.fill}>
        {/* Wings brand mark — centered, no orb (matches Design's Welcome) */}
        <View style={styles.mascot}>
          <Image source={require('../../../assets/nutri-wings.png')} style={styles.wings} resizeMode="contain" />
        </View>

        <View style={styles.copy}>
          <Text style={styles.h1}>{t('ui.welTo', t('mob.welcomeTo', 'Welcome to'))}</Text>
          <Text style={[styles.h1, { color: colors.brandOrange }]}>NutriSync</Text>
          <Text style={styles.sub}>
            {t('ui.welP', 'You are here because your body deserves better than guesswork. Lets sync your nutrition and movement to your natural rhythm.')}
          </Text>
          <LanguagePicker align="center" style={{ marginTop: 18 }} />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label={t('ui.createAccount', 'Create account')} onPress={() => navigation.navigate('CreateAccount')} />
          <SecondaryButton
            label={t('ui.login', 'Log in')}
            style={{ marginTop: 14 }}
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </SafeAreaView>
    </PeachBg>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  mascot: { flex: 0.9, alignItems: 'center', justifyContent: 'center', paddingTop: 0 },
  wings: { width: 176, height: 168 },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 0 },
  h1: { fontFamily: font.medium, fontSize: 38, lineHeight: 42, color: colors.ink, textAlign: 'center' },
  sub: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16,
  },
  actions: { paddingHorizontal: 40, paddingBottom: 24 },
});
