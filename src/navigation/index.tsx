import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';

import WatchListScreen from '../screens/WatchListScreen';
import WatchDetailScreen from '../screens/WatchDetailScreen';
import AddWatchScreen from '../screens/AddWatchScreen';
import AddEditMeasurementScreen from '../screens/AddEditMeasurementScreen';
import SettingsScreen from '../screens/SettingsScreen';

import {useTheme} from '../components/ThemeContext';

export type RootStackParamList = {
  Tabs: undefined;
  WatchDetail: {watchId: string};
  AddWatch: undefined;
  AddEditMeasurement: {watchId: string; measurementId?: string};
};

export type TabParamList = {
  WatchList: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {backgroundColor: colors.card, borderTopColor: colors.border},
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
      }}>
      <Tab.Screen
        name="WatchList"
        component={WatchListScreen}
        options={{
          title: 'Watches',
          tabBarLabel: 'Watches',
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}} accessibilityElementsHidden>
              ⌚
            </Text>
          ),
          tabBarAccessibilityLabel: 'Watches tab',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 20, color}} accessibilityElementsHidden>
              ⚙️
            </Text>
          ),
          tabBarAccessibilityLabel: 'Settings tab',
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const {navigationTheme} = useTheme();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerBackTitle: 'Back',
        }}>
        <Stack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="WatchDetail"
          component={WatchDetailScreen}
          options={({route}) => ({
            title: route.params.watchId,
            // Title is overridden in WatchDetailScreen via navigation.setOptions
          })}
        />
        <Stack.Screen
          name="AddWatch"
          component={AddWatchScreen}
          options={{title: 'New Watch', presentation: 'modal'}}
        />
        <Stack.Screen
          name="AddEditMeasurement"
          component={AddEditMeasurementScreen}
          options={({route}) => ({
            title: route.params.measurementId ? 'Edit Measurement' : 'New Measurement',
            presentation: 'modal',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
