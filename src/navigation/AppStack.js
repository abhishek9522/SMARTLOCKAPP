import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import colors from '../theme/colors';

import HomeScreen           from '../screens/HomeScreen';
import AddDeviceScreen      from '../screens/AddDeviceScreen';
import WiFiSetupScreen      from '../screens/WiFiSetupScreen';
import DeviceControlScreen  from '../screens/DeviceControlScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import RFIDManagementScreen from '../screens/RFIDManagementScreen';
import FingerprintMgmtScreen from '../screens/FingerprintMgmtScreen';
import AccessHistoryScreen  from '../screens/AccessHistoryScreen';
import SettingsScreen       from '../screens/SettingsScreen';
import AdminPanelScreen     from '../screens/AdminPanelScreen';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textWhite,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Back',
      }}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'My Smart Locks' }} />
      <Stack.Screen
        name="AddDevice"
        component={AddDeviceScreen}
        options={{ title: 'Add New Lock' }} />
      <Stack.Screen
        name="WiFiSetup"
        component={WiFiSetupScreen}
        options={{ title: 'WiFi Setup' }} />
      <Stack.Screen
        name="DeviceControl"
        component={DeviceControlScreen}
        options={{ title: 'Lock Control' }} />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'Manage Users' }} />
      <Stack.Screen
        name="RFIDManagement"
        component={RFIDManagementScreen}
        options={{ title: 'RFID Cards' }} />
      <Stack.Screen
        name="FingerprintMgmt"
        component={FingerprintMgmtScreen}
        options={{ title: 'Fingerprints' }} />
      <Stack.Screen
        name="AccessHistory"
        component={AccessHistoryScreen}
        options={{ title: 'Access History' }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }} />
      <Stack.Screen
        name="AdminPanel"
        component={AdminPanelScreen}
        options={{ title: 'Admin Panel' }} />
    </Stack.Navigator>
  );
}