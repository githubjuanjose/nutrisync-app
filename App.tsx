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
import { useOtaAutoApply } from './src/lib/otaAutoApply';
import { usePushTap, navRef } from './src/lib/pushTap';

// One soft radial-peach behind the whole app; every screen renders transparent on top.
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent' } };

/** Inside SessionProvider so useBioOffer can see the session (Epic K, 3B). */
function AppInner() {
  const bio = useBioOffer();
  useOtaAutoApply();   // r14: las OTA se aplican solas al abrir/volver — adiós al «cierra dos veces»
  usePushTap();        // N4 (0.21): toque en la notificación → su pestaña (guardas para runtimes viejos)
  return (
    <View style={{ flex: 1 }}>
      <PeachBg style={StyleSheet.absoluteFill} />
      <NavigationContainer theme={navTheme} ref={navRef}>
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
