import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  ScrollView, FlatList, Platform, PermissionsAndroid,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import { useAuth } from '../context/AuthContext';
import { getDeviceInfo } from '../api/esp32Api';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { ESP32_HOTSPOT_PREFIX } from '../utils/constants';

const STEPS = {
  SCAN_DEVICES:  1,
  VERIFY_DEVICE: 2,
};

export default function AddDeviceScreen({ navigation }) {
  const { user } = useAuth();
  const [step, setStep]               = useState(STEPS.SCAN_DEVICES);
  const [scanning, setScanning]       = useState(false);
  const [connecting, setConnecting]   = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [wifiList, setWifiList]       = useState([]);
  const [deviceInfo, setDeviceInfo]   = useState(null);
  const [deviceName, setDeviceName]   = useState('');
  const [roomName, setRoomName]       = useState('');

  useEffect(() => {
    requestPermissions();
  }, []);

  // ─── Permissions ──────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CHANGE_NETWORK_STATE,
          PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
        ]);
      } catch (e) {
        console.error('Permission error:', e);
      }
    }
  };

  // ─── WiFi Scan ────────────────────────────────────────────────
  const handleScan = async () => {
    setScanning(true);
    setWifiList([]);
    try {
      const networks = await WifiManager.loadWifiList();
      const filtered = networks.filter((n) =>
        n.SSID && n.SSID.startsWith(ESP32_HOTSPOT_PREFIX)
      );
      if (filtered.length === 0) {
        Alert.alert(
          'No Device Found',
          'SMART_LOCK_SETUP_ network nahi mila!\n\n• NodeMCU power on hai?\n• Pehli baar boot ho raha hai?'
        );
      }
      setWifiList(filtered);
    } catch (e) {
      Alert.alert('Scan Failed', 'WiFi scan nahi ho paya: ' + e.message);
    } finally {
      setScanning(false);
    }
  };

  // ─── Connect to ESP Hotspot ───────────────────────────────────
  const handleConnect = async (ssid) => {
    setConnecting(true);
    try {
      await WifiManager.connectToProtectedSSID(ssid, '12345678', false, false);

      // Connected — ab device info fetch karo
      setLoadingInfo(true);
      await new Promise((r) => setTimeout(r, 2000)); // 2 sec wait

      const info = await getDeviceInfo();
      setDeviceInfo(info);
      setStep(STEPS.VERIFY_DEVICE);
    } catch (e) {
      Alert.alert(
        'Connect Failed',
        `${ssid} se connect nahi ho paya!\n\nManually WiFi settings mein connect karke try karo.`
      );
    } finally {
      setConnecting(false);
      setLoadingInfo(false);
    }
  };

  // ─── Confirm Device ───────────────────────────────────────────
  const handleConfirmDevice = () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Device name bharo!');
      return;
    }
    navigation.navigate('WiFiSetup', {
      deviceInfo,
      deviceName: deviceName.trim(),
      roomName:   roomName.trim(),
    });
  };

  // ─── Step 1 — Scan UI ─────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>📡</Text>
      <Text style={styles.stepTitle}>Find Smart Lock</Text>
      <Text style={styles.stepDesc}>
        NodeMCU power on karo — phir Scan dabao.{'\n'}
        App automatically{' '}
        <Text style={styles.highlight}>SMART_LOCK_SETUP_</Text>{' '}
        networks dhundega.
      </Text>

      {/* Scan Button */}
      <TouchableOpacity
        style={[styles.primaryBtn, scanning && styles.btnDisabled]}
        onPress={handleScan}
        disabled={scanning}>
        {scanning
          ? <ActivityIndicator color={colors.textWhite} />
          : <Text style={styles.primaryBtnText}>🔍  Scan for Devices</Text>}
      </TouchableOpacity>

      {/* Device List */}
      {wifiList.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            Available Devices ({wifiList.length})
          </Text>
          {wifiList.map((network, index) => (
            <TouchableOpacity
              key={index}
              style={styles.deviceItem}
              onPress={() => handleConnect(network.SSID)}
              disabled={connecting || loadingInfo}>
              <View style={styles.deviceItemLeft}>
                <View style={styles.deviceItemIcon}>
                  <Text style={styles.deviceItemEmoji}>🔐</Text>
                </View>
                <View>
                  <Text style={styles.deviceItemName}>{network.SSID}</Text>
                  <Text style={styles.deviceItemSub}>
                    Signal: {network.level} dBm
                  </Text>
                </View>
              </View>
              {(connecting || loadingInfo) ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.deviceItemArrow}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Manual Option */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ya manually</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={styles.manualBtn}
        onPress={async () => {
          setLoadingInfo(true);
          try {
            const info = await getDeviceInfo();
            setDeviceInfo(info);
            setStep(STEPS.VERIFY_DEVICE);
          } catch (e) {
            Alert.alert(
              'Failed',
              'ESP se connect nahi ho paya!\nPehle manually SMART_LOCK_SETUP_ WiFi se connect karo.'
            );
          } finally {
            setLoadingInfo(false);
          }
        }}
        disabled={loadingInfo}>
        {loadingInfo
          ? <ActivityIndicator color={colors.primary} />
          : <Text style={styles.manualBtnText}>
              Already connected hoon → Continue
            </Text>}
      </TouchableOpacity>
    </View>
  );

  // ─── Step 2 — Device Info UI ──────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepIcon}>✅</Text>
      <Text style={styles.stepTitle}>Device Found!</Text>

      <View style={styles.deviceInfoBox}>
        <Text style={styles.infoLabel}>Device ID</Text>
        <Text style={styles.infoValue}>
          {deviceInfo?.device_id || 'Unknown'}
        </Text>
        {deviceInfo?.firmware && (
          <>
            <Text style={[styles.infoLabel, { marginTop: 8 }]}>Firmware</Text>
            <Text style={styles.infoValue}>{deviceInfo.firmware}</Text>
          </>
        )}
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
        onPress={() => {
          setStep(STEPS.SCAN_DEVICES);
          setDeviceInfo(null);
        }}>
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
            <Text style={[
              styles.stepDotText,
              step >= s && styles.stepDotTextActive,
            ]}>
              {s}
            </Text>
          </View>
          {s < 2 && (
            <View style={[
              styles.stepLine,
              step > s && styles.stepLineActive,
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}>
      {renderStepIndicator()}
      {step === STEPS.SCAN_DEVICES  && renderStep1()}
      {step === STEPS.VERIFY_DEVICE && renderStep2()}
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
    backgroundColor: colors.surface,
    borderRadius: 20, padding: 24, elevation: 2,
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

  // Device List
  listContainer: {
    marginTop: 20, backgroundColor: colors.background,
    borderRadius: 12, overflow: 'hidden',
  },
  listTitle: {
    ...typography.label, color: colors.textSecondary,
    padding: 12, paddingBottom: 8,
  },
  deviceItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14, borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  deviceItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceItemIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  deviceItemEmoji: { fontSize: 22 },
  deviceItemName: { ...typography.h4, color: colors.textPrimary },
  deviceItemSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  deviceItemArrow: { fontSize: 28, color: colors.textLight },

  // Divider
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.caption, color: colors.textLight, marginHorizontal: 10,
  },

  // Manual Button
  manualBtn: {
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  manualBtnText: { ...typography.btnMedium, color: colors.primary },

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

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  primaryBtnText: { ...typography.btnLarge, color: colors.textWhite },
  backBtn: { alignItems: 'center', marginTop: 16 },
  backBtnText: { ...typography.bodyMedium, color: colors.textSecondary },
});