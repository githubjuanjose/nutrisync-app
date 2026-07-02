import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import MoodEnergyGate from '../screens/main/MoodEnergyGate';
import EditPeriodScreen from '../screens/main/EditPeriodScreen';

const Stack = createNativeStackNavigator();

/** The signed-in, onboarded app: tabs + the daily mood/energy gate (modal). */
export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="Gate" component={MoodEnergyGate} options={{ presentation: 'modal' }} />
      <Stack.Screen name="EditPeriod" component={EditPeriodScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}
