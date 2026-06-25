import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function SplashScreen({ navigation }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      {/* Logo Area */}
      <View style={styles.logoBox}>
        <Text style={styles.logoIcon}>🔐</Text>
        <Text style={styles.appName}>SmartLock</Text>
        <Text style={styles.tagline}>Secure. Smart. Simple.</Text>
      </View>

      <ActivityIndicator
        size="large"
        color={colors.textWhite}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBox: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    ...typography.h1,
    color: colors.textWhite,
    fontSize: 36,
  },
  tagline: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});