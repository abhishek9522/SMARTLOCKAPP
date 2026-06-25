import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both Email and Password!');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // AuthContext will automatically navigate to Home
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to your Smart Lock</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.textWhite} />
              : <Text style={styles.loginBtnText}>Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { fontSize: 60, marginBottom: 12 },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 6 },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, elevation: 3 },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { ...typography.bodySmall, color: colors.primary },
  loginBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  loginBtnText: { ...typography.btnLarge, color: colors.textWhite },
  signupLink: { alignItems: 'center', marginTop: 20 },
  signupText: { ...typography.bodyMedium, color: colors.textSecondary },
  signupBold: { color: colors.primary, fontWeight: '700' },
});