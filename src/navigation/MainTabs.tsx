import React from 'react';
import { Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { colors } from '../theme';
import CycleScreen from '../screens/main/CycleScreen';
import NutriLogScreen from '../screens/main/NutriLogScreen';
import MovementLogScreen from '../screens/main/MovementLogScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import CalendarScreen from '../screens/main/CalendarScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * R3-01/048 — icon-only nav bar: the Design icon assets already carry their own
 * tiny caption, so the RN text labels rendered UNDER them read as duplicates and
 * made the bar chunky. Labels removed everywhere (founders, Round 2); icons
 * centred and slightly larger. Pill bar, taupe inactive → accent red active,
 * Home centred (Calendar · NutriLog · Home · Movement · Progress).
 */
const ICONS: Record<keyof MainTabParamList, any> = {
  Calendar: require('../../assets/navbar/calendar.png'),
  NutriLog: require('../../assets/navbar/nutrilog.png'),
  Cycle: require('../../assets/navbar/home.png'),
  Movement: require('../../assets/navbar/movement.png'),
  Progress: require('../../assets/navbar/progress.png'),
};
const ACTIVE = '#E4572E';
const INACTIVE = '#B8ADA4';

export default function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Cycle" sceneContainerStyle={{ backgroundColor: 'transparent' }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute', left: 14, right: 14, bottom: 10,
          backgroundColor: colors.white, borderTopWidth: 0, borderRadius: 32,
          height: 62, paddingBottom: 6, paddingTop: 6,
          shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
        },
        tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
        tabBarIcon: ({ color }) => (
          <Image source={ICONS[route.name]} style={{ width: 40, height: 35, tintColor: color }} resizeMode="contain" />
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
