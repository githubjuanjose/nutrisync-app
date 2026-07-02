import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import AuthScreen from '../screens/onboarding/AuthScreen';
import OnboardingWizard from '../screens/onboarding/OnboardingWizard';
import AppStack from './AppStack';
import { useSession } from '../state/SessionProvider';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.peachTop, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.coral} />
    </View>
  );
}

export default function RootNavigator() {
  const { session, onboarded } = useSession();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={AuthScreen} />
          <Stack.Screen name="CreateAccount" component={AuthScreen} />
        </>
      ) : onboarded === null ? (
        <Stack.Screen name="Splash" component={Splash} />
      ) : onboarded ? (
        <Stack.Screen name="Main" component={AppStack} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingWizard} />
      )}
    </Stack.Navigator>
  );
}
