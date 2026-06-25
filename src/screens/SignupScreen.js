import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Error', 'Please fill all fields!');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long!');
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password, name.trim());
    } catch (error) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register for Smart Lock</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Full Name',        value: name,     set: setName,     placeholder: 'Your name',            secure: false, keyboard: 'default' },
            { label: 'Email',            value: email,    set: setEmail,    placeholder: 'email@example.com',    secure: false, keyboard: 'email-address' },
            { label: 'Password',         value: password, set: setPassword, placeholder: '••••••••',             secure: true,  keyboard: 'default' },
            { label: 'Confirm Password', value: confirm,  set: setConfirm,  placeholder: '••••••••',             secure: true,  keyboard: 'default' },
          ].map((field) => (
            <View key={field.label}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textLight}
                value={field.value}
                onChangeText={field.set}
                secureTextEntry={field.secure}
                keyboardType={field.keyboard}
                autoCapitalize="none"
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.signupBtn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.textWhite} />
              : <Text style={styles.signupBtnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginBold}>Login</Text>
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
  signupBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  signupBtnText: { ...typography.btnLarge, color: colors.textWhite },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginText: { ...typography.bodyMedium, color: colors.textSecondary },
  loginBold: { color: colors.primary, fontWeight: '700' },
});