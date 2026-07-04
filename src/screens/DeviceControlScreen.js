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
import { MQTT_TOPICS, MQTT_COMMANDS, ROLES, DEVICE_STATUS } from '../utils/constants';
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
        if (device.ownerId === user.uid) {
          setUserRole(ROLES.OWNER);
        } else {
          const doc = await firestore()
            .collection('devices')
            .doc(device.id)
            .collection('users')
            .doc(user.uid)
            .get();
          if (doc.exists) setUserRole(doc.data().role);
        }
      } catch (e) {
        console.error('Role fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  // MQTT Connect
  useEffect(() => {
    connectMQTT(device.id, (topic, payload) => {
      try {
        // Payload string ya JSON dono handle karo
        let data;
        try {
          data = JSON.parse(payload);
        } catch {
          data = { lock: payload, status: 'ONLINE' };
        }

        if (topic === MQTT_TOPICS.STATUS(device.id)) {
          const status   = data.status || 'ONLINE';
          const lock     = data.lock   || payload;

          // Online/Offline set karo
          setIsOnline(status === 'ONLINE' || status === 'online');

          // Lock state handle karo
          const lockUpper = lock.toUpperCase();
          if (lockUpper === 'UNLOCKING') {
            setLockState('UNLOCKING');
            setUnlocking(true);
          } else if (lockUpper === 'LOCKED') {
            setLockState('LOCKED');
            setUnlocking(false);
          } else if (lockUpper === 'UNLOCKED') {
            setLockState('UNLOCKED');
            setUnlocking(false);
          }

          updateDeviceStatus(device.id, {
            status:    status,
            lockState: lockUpper,
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
      Alert.alert('Offline', 'Device offline hai, unlock nahi ho sakta!');
      return;
    }
    if (!canUnlock(userRole)) {
      Alert.alert('Permission Denied', 'Aapko unlock karne ki permission nahi!');
      return;
    }

    Alert.alert('Unlock?', 'Door unlock karna chahte ho?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock',
        onPress: async () => {
          setUnlocking(true);
          setLockState('UNLOCKING');
          try {
            sendCommand(device.id, MQTT_COMMANDS.UNLOCK);
            await firestore().collection('accessLogs').add({
              deviceId:  device.id,
              userId:    user.uid,
              source:    'APP',
              result:    'OK',
              timestamp: firestore.FieldValue.serverTimestamp(),
            });
          } catch (e) {
            Alert.alert('Error', 'Unlock command bhejne mein error!');
            setUnlocking(false);
            setLockState('LOCKED');
          }
        },
      },
    ]);
  };

  // Lock state ke hisab se icon aur color
  const getLockDisplay = () => {
    if (lockState === 'UNLOCKING') return { icon: '🔓', text: 'UNLOCKING...', color: colors.warning };
    if (lockState === 'UNLOCKED')  return { icon: '🔓', text: 'UNLOCKED',    color: colors.success };
    return                                { icon: '🔒', text: 'LOCKED',      color: colors.locked  };
  };

  const lockDisplay = getLockDisplay();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.deviceName}>{device.name || 'Smart Lock'}</Text>
        <Text style={styles.roomName}>{device.roomName || 'Room'}</Text>

        {/* Online Badge */}
        <View style={[styles.badge, {
          backgroundColor: isOnline ? colors.online + '20' : colors.offline + '20',
        }]}>
          <View style={[styles.dot, {
            backgroundColor: isOnline ? colors.online : colors.offline,
          }]} />
          <Text style={[styles.badgeText, {
            color: isOnline ? colors.online : colors.offline,
          }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>

        {/* Lock State */}
        <Text style={styles.lockStateIcon}>{lockDisplay.icon}</Text>
        <Text style={[styles.lockStateText, { color: lockDisplay.color }]}>
          {lockDisplay.text}
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
          {unlocking ? 'UNLOCKING...' : 'UNLOCK'}
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

      {/* Device Info */}
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

  statusCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 24, alignItems: 'center', elevation: 3, marginBottom: 24,
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

  unlockBtn: {
    backgroundColor: colors.primary, borderRadius: 100,
    width: 180, height: 180, alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8, shadowColor: colors.primary,
    shadowOpacity: 0.5, shadowRadius: 16, marginBottom: 32,
  },
  unlockBtnDisabled: {
    backgroundColor: colors.unlockBtnDisabled,
    elevation: 2, shadowOpacity: 0,
  },
  unlockBtnUnlocking: { backgroundColor: colors.warning },
  unlockBtnIcon: { fontSize: 48 },
  unlockBtnText: { ...typography.btnLarge, color: colors.textWhite, marginTop: 6 },

  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionBtn: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, alignItems: 'center', width: '47%', elevation: 2,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: {
    ...typography.bodySmall, color: colors.textPrimary,
    fontWeight: '600', textAlign: 'center',
  },

  infoBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, elevation: 1 },
  infoLabel: { ...typography.label, color: colors.textSecondary, marginTop: 8 },
  infoValue: { ...typography.bodyMedium, color: colors.textPrimary, marginTop: 2 },
});