import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import MoodEnergyGate from '../screens/main/MoodEnergyGate';
import MealLogScreen from '../screens/main/MealLogScreen';
import MealHistoryScreen from '../screens/main/MealHistoryScreen';
import LogMovementScreen from '../screens/main/LogMovementScreen';
import MovementHistoryScreen from '../screens/main/MovementHistoryScreen';
import FeedbackScreen from '../screens/settings/FeedbackScreen';
import CycleHealthScreen from '../screens/settings/CycleHealthScreen';
import CASHistoryScreen from '../screens/main/CASHistoryScreen';
import EditPeriodScreen from '../screens/main/EditPeriodScreen';
import EditHealthScreen from '../screens/main/EditHealthScreen';
import NotificationCenterScreen from '../screens/main/NotificationCenterScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import DataPrivacyScreen from '../screens/settings/DataPrivacyScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';
import NutriAvatarScreen from '../screens/settings/NutriAvatarScreen';
import PersonalInfoScreen from '../screens/settings/PersonalInfoScreen';
import CommunityPrivacyScreen from '../screens/settings/CommunityPrivacyScreen';
import NotificationsScreen from '../screens/settings/NotificationsScreen';
import AppPreferencesScreen from '../screens/settings/AppPreferencesScreen';
import NutritionalPreferencesScreen from '../screens/settings/NutritionalPreferencesScreen';
import ConnectedDevicesScreen from '../screens/settings/ConnectedDevicesScreen';

const Stack = createNativeStackNavigator();

/** The signed-in, onboarded app: tabs + the daily mood/energy gate (modal). */
export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Gate" component={MoodEnergyGate} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditPeriod" component={EditPeriodScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditHealth" component={EditHealthScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="MealLog" component={MealLogScreen} />
      <Stack.Screen name="MealHistory" component={MealHistoryScreen} />
      <Stack.Screen name="LogMovement" component={LogMovementScreen} />
      <Stack.Screen name="MovementHistory" component={MovementHistoryScreen} />
      <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AppPreferences" component={AppPreferencesScreen} />
      <Stack.Screen name="NutritionalPreferences" component={NutritionalPreferencesScreen} />
      <Stack.Screen name="ConnectedDevices" component={ConnectedDevicesScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="CycleHealth" component={CycleHealthScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="CASHistory" component={CASHistoryScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="DataPrivacy" component={DataPrivacyScreen} />
      <Stack.Screen name="CommunityPrivacy" component={CommunityPrivacyScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="NutriAvatar" component={NutriAvatarScreen} />
    </Stack.Navigator>
  );
}
