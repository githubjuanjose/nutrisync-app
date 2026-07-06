import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font } from '../../theme';
import { NutriOrb } from '../../ui/NutriOrb';
import { PrimaryButton, SecondaryButton } from '../../ui/Buttons';
import { LanguagePicker } from '../../ui/LanguagePicker';
import { RootStackParamList } from '../../navigation/types';
import { useT } from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const t = useT();
  return (
    <LinearGradient colors={[colors.peachTop, '#FBE0D2', colors.peachBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.mascot}>
          <View style={styles.mascotWrap}>
            <Image source={require('../../../assets/nutri-wings.png')} style={styles.wings} resizeMode="contain" />
            <View style={styles.orbOnWings}><NutriOrb size={104} /></View>
          </View>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  mascot: { flex: 1.3, alignItems: 'center', justifyContent: 'flex-end' },
  mascotWrap: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center' },
  wings: { width: 225, height: 250, position: 'absolute', top: 0 },
  orbOnWings: { position: 'absolute', right: 34, bottom: 40 },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 24 },
  h1: { fontFamily: font.regular, fontSize: 40, lineHeight: 42, color: colors.ink, textAlign: 'center' },
  sub: {
    fontFamily: font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16,
  },
  actions: { paddingHorizontal: 24, paddingBottom: 24 },
});
