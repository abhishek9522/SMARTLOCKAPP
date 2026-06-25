import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { MQTT_TOPICS, MQTT_COMMANDS, ROLES } from '../utils/constants';
import { canUnlock, canManageUsers, canManageRFID, isOwner } from '../utils/roleHelper';
import { connectMQTT, sendCommand, disconnectMQTT } from '../api/mqttService';

export default function DeviceControlScreen({ route, navigation }) {
  const { device } = route.params;
  const { user } = useAuth();
  const { updateDeviceStatus } = useDevice();

  const [isOnline, setIsOnline]     = useState(false);
  const [lockState, setLockState]   = useState('LOCKED');
  const [unlocking, setUnlocking]   = useState(false);
  const [userRole, setUserRole]     = useState(null);
  const [loading, setLoading]       = useState(true);

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      try {
        // Check if user is owner
        if (device.ownerId === user.uid) {
          setUserRole(ROLES.OWNER);
        } else {
          // Get role from device's users subcollection
          const doc = await firestore()
            .collection('devices')
            .doc(device.id)
            .collection('users')
            .doc(user.uid)
            .get();
          if (doc.exists) {
            setUserRole(doc.data().role);
          }
        }
      } catch (e) {
        console.error('Role fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  // Connect MQTT
  useEffect(() => {
    connectMQTT(device.id, (topic, payload) => {
      try {
        const data = JSON.parse(payload);
        if (topic === MQTT_TOPICS.STATUS(device.id)) {
          setIsOnline(data.status === 'ONLINE');
          setLockState(data.lock || 'LOCKED');
          updateDeviceStatus(device.id, {
            status: data.status,
            lockState: data.lock,
          });
        }
      } catch (e) {
        console.error('MQTT parse error:', e);
      }
    });

    return () => disconnectMQTT();
  }, []);

  const handleUnlock = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Device is offline, cannot unlock!');
      return;
    }
    if (!canUnlock(userRole)) {
      Alert.alert('Permission Denied', 'You do not have permission to unlock!');
      return;
    }

    Alert.alert('Unlock?', 'Do you want to unlock the door?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock',
        onPress: async () => {
          setUnlocking(true);
          try {
            sendCommand(device.id, MQTT_COMMANDS.UNLOCK);
            // Save log in Firestore
            await firestore().collection('accessLogs').add({
              deviceId: device.id,
              userId: user.uid,
              source: 'APP',
              result: 'OK',
              timestamp: firestore.FieldValue.serverTimestamp(),
            });
          } catch (e) {
            Alert.alert('Error', 'Error sending unlock command!');
          } finally {
            setTimeout(() => setUnlocking(false), 3000);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Device Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.deviceName}>{device.name || 'Smart Lock'}</Text>
        <Text style={styles.roomName}>{device.roomName || 'Room'}</Text>

        {/* Online / Offline Badge */}
        <View style={[styles.badge, { backgroundColor: isOnline ? colors.online + '20' : colors.offline + '20' }]}>
          <View style={[styles.dot, { backgroundColor: isOnline ? colors.online : colors.offline }]} />
          <Text style={[styles.badgeText, { color: isOnline ? colors.online : colors.offline }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>

        {/* Lock State */}
        <Text style={styles.lockStateIcon}>
          {lockState === 'LOCKED' ? '🔒' : '🔓'}
        </Text>
        <Text style={[styles.lockStateText, {
          color: lockState === 'LOCKED' ? colors.locked : colors.unlocked,
        }]}>
          {lockState}
        </Text>
      </View>

      {/* Unlock Button */}
      <TouchableOpacity
        style={[
          styles.unlockBtn,
          !isOnline && styles.unlockBtnDisabled,
          unlocking && styles.unlockBtnUnlocking,
        ]}
        onPress={handleUnlock}
        disabled={!isOnline || unlocking}
        activeOpacity={0.8}>
        {unlocking
          ? <ActivityIndicator size="large" color={colors.textWhite} />
          : <Text style={styles.unlockBtnIcon}>🔓</Text>}
        <Text style={styles.unlockBtnText}>
          {unlocking ? 'Unlocking...' : 'UNLOCK'}
        </Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AccessHistory', { device })}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionLabel}>Access History</Text>
        </TouchableOpacity>

        {canManageUsers(userRole) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('UserManagement', { device })}>
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionLabel}>Users</Text>
          </TouchableOpacity>
        )}

        {canManageRFID(userRole) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('RFIDManagement', { device })}>
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionLabel}>RFID Cards</Text>
          </TouchableOpacity>
        )}

        {canManageRFID(userRole) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('FingerprintMgmt', { device })}>
            <Text style={styles.actionIcon}>👆</Text>
            <Text style={styles.actionLabel}>Fingerprints</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Settings', { device })}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionLabel}>Settings</Text>
        </TouchableOpacity>

        {isOwner(userRole) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('AdminPanel', { device })}>
            <Text style={styles.actionIcon}>🛡️</Text>
            <Text style={styles.actionLabel}>Admin Panel</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* Device ID Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Device ID</Text>
        <Text style={styles.infoValue}>{device.id}</Text>
        <Text style={styles.infoLabel}>Role</Text>
        <Text style={styles.infoValue}>{userRole?.toUpperCase() || 'UNKNOWN'}</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Status Card
  statusCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 24, alignItems: 'center', elevation: 3,
    marginBottom: 24,
  },
  deviceName: { ...typography.h2, color: colors.textPrimary },
  roomName: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 4 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginTop: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { ...typography.btnSmall },
  lockStateIcon: { fontSize: 64, marginTop: 20 },
  lockStateText: { ...typography.h3, marginTop: 8, fontWeight: '700' },

  // Unlock Button
  unlockBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    width: 180, height: 180, alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: colors.primary,
    shadowOpacity: 0.5, shadowRadius: 16,
    marginBottom: 32,
  },
  unlockBtnDisabled: { backgroundColor: colors.unlockBtnDisabled, elevation: 2, shadowOpacity: 0 },
  unlockBtnUnlocking: { backgroundColor: colors.success },
  unlockBtnIcon: { fontSize: 48 },
  unlockBtnText: { ...typography.btnLarge, color: colors.textWhite, marginTop: 6 },

  // Actions Grid
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionBtn: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, alignItems: 'center', width: '47%', elevation: 2,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' },

  // Info Box
  infoBox: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, elevation: 1,
  },
  infoLabel: { ...typography.label, color: colors.textSecondary, marginTop: 8 },
  infoValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 2 },
});