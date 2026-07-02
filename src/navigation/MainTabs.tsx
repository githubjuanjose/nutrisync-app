import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { colors, font } from '../theme';
import CycleScreen from '../screens/main/CycleScreen';
import NutriLogScreen from '../screens/main/NutriLogScreen';
import MovementLogScreen from '../screens/main/MovementLogScreen';
import { makePlaceholder } from '../screens/Placeholder';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON: Record<keyof MainTabParamList, string> = {
  Calendar: '📅', Cycle: '◍', NutriLog: '🥗', Movement: '🧘', Progress: '📈',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 64, paddingBottom: 8, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{ICON[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Calendar" component={makePlaceholder('Calendar')} />
      <Tab.Screen name="Cycle" component={CycleScreen} />
      <Tab.Screen name="NutriLog" component={NutriLogScreen} />
      <Tab.Screen name="Movement" component={MovementLogScreen} />
      <Tab.Screen name="Progress" component={makePlaceholder('Progress')} />
    </Tab.Navigator>
  );
}
