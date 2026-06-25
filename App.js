import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { DeviceProvider } from './src/context/DeviceContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <AppNavigator />
      </DeviceProvider>
    </AuthProvider>
  );
}