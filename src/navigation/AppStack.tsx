import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import MoodEnergyGate from '../screens/main/MoodEnergyGate';
import EditPeriodScreen from '../screens/main/EditPeriodScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import DataPrivacyScreen from '../screens/settings/DataPrivacyScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';
import NutriAvatarScreen from '../screens/settings/NutriAvatarScreen';
import { makePlaceholder } from '../screens/Placeholder';

const Stack = createNativeStackNavigator();
const PersonalInfo = makePlaceholder('Personal Information');
const CommunityPrivacy = makePlaceholder('Community Privacy');
const Notifications = makePlaceholder('Notifications & Reminders');

/** The signed-in, onboarded app: tabs + the daily mood/energy gate (modal). */
export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Gate" component={MoodEnergyGate} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditPeriod" component={EditPeriodScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfo} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="DataPrivacy" component={DataPrivacyScreen} />
      <Stack.Screen name="CommunityPrivacy" component={CommunityPrivacy} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="NutriAvatar" component={NutriAvatarScreen} />
    </Stack.Navigator>
  );
}
