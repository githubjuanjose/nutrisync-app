import React from 'react';
import { Image } from 'react-native';
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

/**
 * F12 — unified nav bar: Design's line-icon set (delivered "nav bar" assets),
 * pill-shaped bar, taupe inactive → accent red when active, Home in the centre
 * (Calendar · NutriLog · Home · Movement · Progress), label "Home" not "Today".
 */
const ICONS: Record<keyof MainTabParamList, any> = {
  Calendar: require('../../assets/navbar/calendar.png'),
  NutriLog: require('../../assets/navbar/nutrilog.png'),
  Cycle: require('../../assets/navbar/home.png'),
  Movement: require('../../assets/navbar/movement.png'),
  Progress: require('../../assets/navbar/progress.png'),
};
const LABEL: Record<keyof MainTabParamList, [string, string]> = {
  Calendar: ['navLabels.calendar', 'Calendar'], Cycle: ['navLabels.home', 'Home'],
  NutriLog: ['navLabels.nutrilog', 'NutriLog'], Movement: ['navLabels.movement', 'Movement'],
  Progress: ['navLabels.progress', 'Progress'],
};
const ACTIVE = '#E4572E';
const INACTIVE = '#B8ADA4';

export default function MainTabs() {
  const t = useT();
  return (
    <Tab.Navigator initialRouteName="Cycle" sceneContainerStyle={{ backgroundColor: 'transparent' }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          position: 'absolute', left: 14, right: 14, bottom: 10,
          backgroundColor: colors.white, borderTopWidth: 0, borderRadius: 32,
          height: 66, paddingBottom: 10, paddingTop: 8,
          shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
        },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 10.5 },
        tabBarLabel: t(LABEL[route.name][0], LABEL[route.name][1]),
        tabBarIcon: ({ color }) => (
          <Image source={ICONS[route.name]} style={{ width: 26, height: 21, tintColor: color }} resizeMode="contain" />
        ),
      })}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="NutriLog" component={NutriLogScreen} />
      <Tab.Screen name="Cycle" component={CycleScreen} />
      <Tab.Screen name="Movement" component={MovementLogScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}
