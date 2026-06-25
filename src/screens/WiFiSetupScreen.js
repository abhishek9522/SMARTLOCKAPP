import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { sendConfig } from '../api/esp32Api';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function WiFiSetupScreen({ route, navigation }) {
  const { deviceInfo, deviceName, roomName } = route.params;
  const { user } = useAuth();

  const [ssid, setSsid]         = useState('');
  const [pass, setPass]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const handleSendConfig = async () => {
    if (!ssid.trim()) {
      Alert.alert('Error', 'Please enter WiFi network name (SSID)!');
      return;
    }
    if (pass.length < 8) {
      Alert.alert('Error', 'WiFi password must be at least 8 characters!');
      return;
    }

    setLoading(true);
    try {
      // Step 1: ESP ko config bhejo
      await sendConfig({
        ssid: ssid.trim(),
        pass: pass,
      });

      // Step 2: Firestore mein device save karo
      await firestore()
        .collection('devices')
        .doc(deviceInfo.device_id)
        .set({
          name:      deviceName,
          roomName:  roomName,
          ownerId:   user.uid,
          status:    'OFFLINE',
          lockState: 'LOCKED',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      // Step 3: Owner subcollection mein save karo
      await firestore()
        .collection('devices')
        .doc(deviceInfo.device_id)
        .collection('users')
        .doc(user.uid)
        .set({ role: 'owner' });

      setDone(true);
    } catch (error) {
      Alert.alert(
        'Setup Failed',
        'Error sending config!\n\nPlease check:\n• Phone is still connected to ESP hotspot?\n• WiFi credentials are correct?',
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Success Screen ───────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Setup Complete!</Text>
        <Text style={styles.successDesc}>
          ESP is restarting and will connect to{' '}
          <Text style={styles.highlight}>{ssid}</Text> WiFi.
          {'\n\n'}
          The device will show{' '}
          <Text style={{ color: colors.online, fontWeight: '700' }}>ONLINE</Text>{' '}
          in a few moments.
        </Text>

        <View style={styles.summaryBox}>
          <Row label="Device ID"   value={deviceInfo.device_id} />
          <Row label="Device Name" value={deviceName} />
          <Row label="Room"        value={roomName || '—'} />
          <Row label="WiFi"        value={ssid} />
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeBtnText}>Go to Home 🏠</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Setup Form ───────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📶</Text>
        <Text style={styles.headerTitle}>WiFi Setup</Text>
        <Text style={styles.headerDesc}>
          Enter your home/office WiFi SSID and password.{'\n'}
          ESP will save and connect to this network.
        </Text>
      </View>

      {/* Device Info Badge */}
      <View style={styles.deviceBadge}>
        <Text style={styles.deviceBadgeText}>
          🔐  {deviceName}  •  {deviceInfo.device_id}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>

        <Text style={styles.label}>WiFi Network Name (SSID)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MyHomeWiFi"
          placeholderTextColor={colors.textLight}
          value={ssid}
          onChangeText={setSsid}
          autoCapitalize="none"
        />

        <Text style={styles.label}>WiFi Password</Text>
        <View style={styles.passRow}>
          <TextInput
            style={[styles.input, styles.passInput]}
            placeholder="WiFi password"
            placeholderTextColor={colors.textLight}
            value={pass}
            onChangeText={setPass}
            secureTextEntry={!showPass}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPass(!showPass)}>
            <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Warning */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️  Phone must remain connected to ESP hotspot until you press "Send".
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.btnDisabled]}
          onPress={handleSendConfig}
          disabled={loading}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.textWhite} style={{ marginRight: 10 }} />
              <Text style={styles.sendBtnText}>Sending Config...</Text>
            </View>
          ) : (
            <Text style={styles.sendBtnText}>Send Config & Setup 🚀</Text>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

// ─── Helper ───────────────────────────────────────────────────
const Row = ({ label, value }) => (
  <View style={rowStyles.row}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={rowStyles.value}>{value}</Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  label: { ...typography.bodySmall, color: colors.textSecondary },
  value: {
    ...typography.bodySmall, color: colors.textPrimary,
    fontWeight: '600', maxWidth: '60%', textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', marginBottom: 20 },
  headerIcon: { fontSize: 56, marginBottom: 12 },
  headerTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 8 },
  headerDesc: {
    ...typography.bodyMedium, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  // Device Badge
  deviceBadge: {
    backgroundColor: colors.primary + '15', borderRadius: 10,
    padding: 12, marginBottom: 20, alignItems: 'center',
  },
  deviceBadgeText: {
    ...typography.bodyMedium, color: colors.primary, fontWeight: '600',
  },

  // Form
  form: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 24, elevation: 2,
  },
  label: {
    ...typography.label, color: colors.textSecondary,
    marginBottom: 6, marginTop: 16,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background, flex: 1,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passInput: { flex: 1 },
  eyeBtn: {
    padding: 14, backgroundColor: colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  eyeIcon: { fontSize: 20 },

  // Warning
  warningBox: {
    backgroundColor: colors.warning + '15', borderRadius: 10,
    padding: 14, marginTop: 20,
    borderLeftWidth: 4, borderLeftColor: colors.warning,
  },
  warningText: {
    ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20,
  },

  // Send Button
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  sendBtnText: { ...typography.btnLarge, color: colors.textWhite },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // Success Screen
  successContainer: {
    flex: 1, backgroundColor: colors.background,
    padding: 24, justifyContent: 'center', alignItems: 'center',
  },
  successIcon: { fontSize: 80, marginBottom: 16 },
  successTitle: { ...typography.h1, color: colors.textPrimary, marginBottom: 12 },
  successDesc: {
    ...typography.bodyLarge, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 26, marginBottom: 24,
  },
  highlight: { color: colors.primary, fontWeight: '700' },
  summaryBox: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, width: '100%', elevation: 2, marginBottom: 32,
  },
  homeBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingHorizontal: 40, paddingVertical: 16,
  },
  homeBtnText: { ...typography.btnLarge, color: colors.textWhite },
});