import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { colors, font } from '../theme';
import { useT } from '../i18n';
import CycleScreen from '../screens/main/CycleScreen';
import NutriLogScreen from '../screens/main/NutriLogScreen';
import MovementLogScreen from '../screens/main/MovementLogScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import CalendarScreen from '../screens/main/CalendarScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON: Record<keyof MainTabParamList, string> = {
  Calendar: '📅', Cycle: '◍', NutriLog: '🥗', Movement: '🧘', Progress: '📈',
};
// tab route → catalog key + English fallback
const LABEL: Record<keyof MainTabParamList, [string, string]> = {
  Calendar: ['navLabels.calendar', 'Calendar'], Cycle: ['navLabels.home', 'Today'],
  NutriLog: ['navLabels.nutrilog', 'NutriLog'], Movement: ['navLabels.movement', 'Movement'],
  Progress: ['navLabels.progress', 'Progress'],
};

export default function MainTabs() {
  const t = useT();
  return (
    <Tab.Navigator initialRouteName="Cycle" sceneContainerStyle={{ backgroundColor: 'transparent' }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 64, paddingBottom: 8, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
        tabBarLabel: t(LABEL[route.name][0], LABEL[route.name][1]),
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>{ICON[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Cycle" component={CycleScreen} />
      <Tab.Screen name="NutriLog" component={NutriLogScreen} />
      <Tab.Screen name="Movement" component={MovementLogScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}
