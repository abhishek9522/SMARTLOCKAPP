import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getDeviceInfo } from '../api/esp32Api';
import { requestWifiPermissions } from '../utils/permissions';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { ESP32_HOTSPOT_PREFIX } from '../utils/constants';

const STEPS = {
  CONNECT_HOTSPOT: 1,
  VERIFY_DEVICE:   2,
};

export default function AddDeviceScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep]             = useState(STEPS.CONNECT_HOTSPOT);
  const [loading, setLoading]       = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [deviceName, setDeviceName] = useState('');
  const [roomName, setRoomName]     = useState('');

  const handleFetchDeviceInfo = async () => {
    const hasPermission = await requestWifiPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const info = await getDeviceInfo();
      setDeviceInfo(info);
      setStep(STEPS.VERIFY_DEVICE);
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        'Could not connect to ESP!\n\nPlease check:\n• Is your phone connected to SMART_LOCK_SETUP_xxxx WiFi?\n• Is ESP in setup mode?',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDevice = () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter device name!');
      return;
    }
    navigation.navigate('WiFiSetup', {
      deviceInfo,
      deviceName: deviceName.trim(),
      roomName:   roomName.trim(),
    });
  };

  // ─── Step 1 UI ────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>📡</Text>
      <Text style={styles.stepTitle}>Connect to ESP Hotspot</Text>
      <Text style={styles.stepDesc}>
        Go to your phone's WiFi settings and connect to{' '}
        <Text style={styles.highlight}>{ESP32_HOTSPOT_PREFIX}xxxx</Text>{' '}
        network.
      </Text>

      <View style={styles.instructionBox}>
        {[
          '1. Open phone WiFi settings',
          '2. Find SMART_LOCK_SETUP_xxxx',
          '3. Password: 12345678',
          '4. Come back here after connecting',
        ].map((text, i) => (
          <Text key={i} style={styles.instructionText}>{text}</Text>
        ))}
      </View>

      {/* Open WiFi Settings Button */}
      <TouchableOpacity
        style={styles.wifiSettingsBtn}
        onPress={() => Linking.openSettings()}>
        <Text style={styles.wifiSettingsBtnText}>📶  Open WiFi Settings</Text>
      </TouchableOpacity>

      {/* Connected Button */}
      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.btnDisabled]}
        onPress={handleFetchDeviceInfo}
        disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.textWhite} />
          : <Text style={styles.primaryBtnText}>Connected ✓</Text>}
      </TouchableOpacity>
    </View>
  );

  // ─── Step 2 UI ────────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>✅</Text>
      <Text style={styles.stepTitle}>Device Found!</Text>

      <View style={styles.deviceInfoBox}>
        <Text style={styles.infoLabel}>Device ID</Text>
        <Text style={styles.infoValue}>{deviceInfo?.device_id}</Text>
      </View>

      <Text style={styles.label}>Device Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Main Door Lock"
        placeholderTextColor={colors.textLight}
        value={deviceName}
        onChangeText={setDeviceName}
      />

      <Text style={styles.label}>Room Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Living Room"
        placeholderTextColor={colors.textLight}
        value={roomName}
        onChangeText={setRoomName}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, !deviceName.trim() && styles.btnDisabled]}
        onPress={handleConfirmDevice}
        disabled={!deviceName.trim()}>
        <Text style={styles.primaryBtnText}>Continue → WiFi Setup</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => setStep(STEPS.CONNECT_HOTSPOT)}>
        <Text style={styles.backBtnText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Step Indicator ───────────────────────────────────────────
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2].map((s) => (
        <View key={s} style={styles.stepIndicatorRow}>
          <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
              {s}
            </Text>
          </View>
          {s < 2 && (
            <View style={[styles.stepLine, step > s && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderStepIndicator()}
      {step === STEPS.CONNECT_HOTSPOT && renderStep1()}
      {step === STEPS.VERIFY_DEVICE   && renderStep2()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginBottom: 32,
  },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotText: { ...typography.btnSmall, color: colors.textSecondary },
  stepDotTextActive: { color: colors.textWhite },
  stepLine: {
    width: 48, height: 3,
    backgroundColor: colors.border, marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: colors.primary },

  // Step Container
  stepContainer: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 24, elevation: 2,
  },
  stepIcon: { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  stepTitle: {
    ...typography.h2, color: colors.textPrimary,
    textAlign: 'center', marginBottom: 8,
  },
  stepDesc: {
    ...typography.bodyMedium, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  highlight: { color: colors.primary, fontWeight: '700' },

  // Instruction Box
  instructionBox: {
    backgroundColor: colors.background, borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  instructionText: {
    ...typography.bodyMedium, color: colors.textPrimary,
    marginBottom: 8, lineHeight: 22,
  },

  // Device Info Box
  deviceInfoBox: {
    backgroundColor: colors.background, borderRadius: 12,
    padding: 16, marginBottom: 20,
  },
  infoLabel: { ...typography.label, color: colors.textSecondary },
  infoValue: { ...typography.h4, color: colors.primary, marginTop: 4 },

  // Inputs
  label: {
    ...typography.label, color: colors.textSecondary,
    marginBottom: 6, marginTop: 16,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  // WiFi Settings Button
  wifiSettingsBtn: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 1.5, borderColor: colors.primary,
  },
  wifiSettingsBtnText: {
    ...typography.btnMedium, color: colors.primary,
  },

  // Primary Button
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  primaryBtnText: { ...typography.btnLarge, color: colors.textWhite },

  // Back Button
  backBtn: { alignItems: 'center', marginTop: 16 },
  backBtnText: { ...typography.bodyMedium, color: colors.textSecondary },
});