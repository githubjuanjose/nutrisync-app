import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import RootNavigator from './src/navigation/RootNavigator';
import { SessionProvider } from './src/state/SessionProvider';
import { LanguageProvider } from './src/i18n';
import { PeachBg } from './src/ui/PeachBg';
import { BioGate, BioOfferModal, useBioOffer } from './src/ui/BioLock';

// One soft radial-peach behind the whole app; every screen renders transparent on top.
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

/** Inside SessionProvider so useBioOffer can see the session (Epic K, 3B). */
function AppInner() {
  const bio = useBioOffer();
  return (
    <View style={{ flex: 1 }}>
      <PeachBg style={StyleSheet.absoluteFill} />
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
      <BioOfferModal visible={bio.visible} onClose={bio.close} />
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold,
  });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#FFF8F1' }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <SessionProvider>
            <BioGate>
              <AppInner />
            </BioGate>
          </SessionProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
