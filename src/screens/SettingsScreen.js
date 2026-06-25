import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { isOwner } from '../utils/roleHelper';

export default function SettingsScreen({ route, navigation }) {
  const { device } = route.params;
  const { user, logout } = useAuth();

  const [deviceName, setDeviceName] = useState(device.name || '');
  const [roomName, setRoomName]     = useState(device.roomName || '');
  const [saving, setSaving]         = useState(false);
  const [userRole, setUserRole]     = useState(null);

  // Fetch role
  React.useEffect(() => {
    const fetchRole = async () => {
      if (device.ownerId === user.uid) {
        setUserRole('owner');
        return;
      }
      const doc = await firestore()
        .collection('devices')
        .doc(device.id)
        .collection('users')
        .doc(user.uid)
        .get();
      if (doc.exists) setUserRole(doc.data().role);
    };
    fetchRole();
  }, []);

  // ─── Save Device Name/Room ────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Device name cannot be empty!');
      return;
    }
    setSaving(true);
    try {
      await firestore()
        .collection('devices')
        .doc(device.id)
        .update({
          name:     deviceName.trim(),
          roomName: roomName.trim(),
        });
      Alert.alert('Saved', 'Device info updated successfully! ✅');
    } catch (e) {
      Alert.alert('Error', 'Problem saving device info!');
    } finally {
      setSaving(false);
    }
  };

  // ─── WiFi Reset ───────────────────────────────────────────────
  const handleWiFiReset = () => {
    Alert.alert(
      'WiFi Reset',
      'Do you want to reset the device WiFi?\n\nDevice will go into setup mode and you will need to pair it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Send factory reset command via MQTT
            Alert.alert('Info', 'Implement MQTT factory reset command for this feature.');
          },
        },
      ]
    );
  };

  // ─── Remove Device ────────────────────────────────────────────
  const handleRemoveDevice = () => {
    Alert.alert(
      'Remove Device',
      `Do you want to remove "${device.name}" from your account?\n\nThis action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('devices').doc(device.id).delete();
              navigation.navigate('Home');
              Alert.alert('Done', 'Device removed successfully!');
            } catch (e) {
              Alert.alert('Error', 'Problem removing device!');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Device Info Section ─────────────────────────────── */}
      <Text style={styles.sectionTitle}>📋 Device Info</Text>
      <View style={styles.card}>

        <Text style={styles.label}>Device Name</Text>
        <TextInput
          style={styles.input}
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="e.g. Main Door Lock"
          placeholderTextColor={colors.textLight}
        />

        <Text style={styles.label}>Room Name</Text>
        <TextInput
          style={styles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="e.g. Living Room"
          placeholderTextColor={colors.textLight}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSaveInfo}
          disabled={saving}>
          {saving
            ? <ActivityIndicator color={colors.textWhite} />
            : <Text style={styles.saveBtnText}>Save ✓</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Device Details Section ──────────────────────────── */}
      <Text style={styles.sectionTitle}>🔍 Device Details</Text>
      <View style={styles.card}>
        {[
          { label: 'Device ID',    value: device.id },
          { label: 'Owner ID',     value: device.ownerId },
          { label: 'Status',       value: device.status   || 'OFFLINE' },
          { label: 'Lock State',   value: device.lockState || 'LOCKED' },
          { label: 'Your Role',    value: userRole?.toUpperCase() || '...' },
        ].map((row) => (
          <View key={row.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{row.label}</Text>
            <Text style={styles.detailValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* ── Danger Zone — Only for Owner ───────────────── */}
      {isOwner(userRole) && (
        <>
          <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
          <View style={[styles.card, styles.dangerCard]}>

            {/* WiFi Reset */}
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={handleWiFiReset}>
              <View style={styles.dangerBtnLeft}>
                <Text style={styles.dangerBtnIcon}>📶</Text>
                <View>
                  <Text style={styles.dangerBtnTitle}>WiFi Reset</Text>
                  <Text style={styles.dangerBtnDesc}>Put device into setup mode</Text>
                </View>
              </View>
              <Text style={styles.dangerArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Remove Device */}
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={handleRemoveDevice}>
              <View style={styles.dangerBtnLeft}>
                <Text style={styles.dangerBtnIcon}>🗑️</Text>
                <View>
                  <Text style={[styles.dangerBtnTitle, { color: colors.error }]}>
                    Remove Device
                  </Text>
                  <Text style={styles.dangerBtnDesc}>Permanently delete from account</Text>
                </View>
              </View>
              <Text style={styles.dangerArrow}>›</Text>
            </TouchableOpacity>

          </View>
        </>
      )}

      {/* ── App Info ────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>ℹ️ App Info</Text>
      <View style={styles.card}>
        {[
          { label: 'App Version',   value: '1.0.0' },
          { label: 'Firmware Info', value: 'ESP32 Arduino' },
          { label: 'MQTT Protocol', value: 'v3.1.1 over TLS' },
          { label: 'Developer',     value: 'SmartLock Team' },
        ].map((row) => (
          <View key={row.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{row.label}</Text>
            <Text style={styles.detailValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* ── Logout ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() =>
          Alert.alert('Logout', 'Do you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ])
        }>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },

  // Section Title
  sectionTitle: {
    ...typography.label, color: colors.textSecondary,
    marginBottom: 10, marginTop: 24, paddingLeft: 4,
  },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
  },
  dangerCard: {
    borderWidth: 1.5, borderColor: colors.error + '30',
  },

  // Inputs
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  // Save Button
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 18,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  saveBtnText: { ...typography.btnMedium, color: colors.textWhite },

  // Detail Rows
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  detailLabel: { ...typography.bodyMedium, color: colors.textSecondary },
  detailValue: {
    ...typography.bodyMedium, color: colors.textPrimary,
    fontWeight: '600', maxWidth: '55%', textAlign: 'right',
  },

  // Danger Zone
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  dangerBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dangerBtnIcon: { fontSize: 26 },
  dangerBtnTitle: { ...typography.h4, color: colors.textPrimary },
  dangerBtnDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  dangerArrow: { fontSize: 24, color: colors.textLight },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },

  // Logout
  logoutBtn: {
    marginTop: 28, backgroundColor: colors.error + '15',
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.error + '30',
  },
  logoutText: { ...typography.btnMedium, color: colors.error },
});