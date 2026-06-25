import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { sendCommand } from '../api/mqttService';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function AdminPanelScreen({ route, navigation }) {
  const { device } = route.params;

  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Access logs count
        const logsSnap = await firestore()
          .collection('accessLogs')
          .where('deviceId', '==', device.id)
          .get();

        // Users count
        const usersSnap = await firestore()
          .collection('devices')
          .doc(device.id)
          .collection('users')
          .get();

        // RFID count
        const rfidSnap = await firestore()
          .collection('devices')
          .doc(device.id)
          .collection('rfidCards')
          .get();

        // Fingerprint count
        const fpSnap = await firestore()
          .collection('devices')
          .doc(device.id)
          .collection('fingerprints')
          .get();

        // Last 24hr unlock count
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const recentSnap = await firestore()
          .collection('accessLogs')
          .where('deviceId', '==', device.id)
          .where('timestamp', '>=', yesterday)
          .get();

        setStats({
          totalLogs:    logsSnap.size,
          totalUsers:   usersSnap.size,
          totalRFID:    rfidSnap.size,
          totalFP:      fpSnap.size,
          last24hr:     recentSnap.size,
          deviceStatus: device.status   || 'OFFLINE',
          lockState:    device.lockState || 'LOCKED',
        });
      } catch (e) {
        console.error('Stats fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ─── Force Lock ───────────────────────────────────────────────
  const handleForceLock = () => {
    Alert.alert(
      '🔒 Force Lock',
      'Do you want to force lock the device now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock',
          onPress: () => {
            sendCommand(device.id, 'FORCE_LOCK');
            Alert.alert('Done', 'Force lock command sent!');
          },
        },
      ],
    );
  };

  // ─── Restart Device ───────────────────────────────────────────
  const handleRestart = () => {
    Alert.alert(
      '🔄 Device Restart',
      'Do you want to restart ESP32? Device will go offline for a while.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          onPress: () => {
            sendCommand(device.id, 'RESTART');
            Alert.alert('Done', 'Restart command sent!');
          },
        },
      ],
    );
  };

  // ─── Clear All Logs ───────────────────────────────────────────
  const handleClearLogs = () => {
    Alert.alert(
      '🗑️ Clear Logs',
      'All access logs will be permanently deleted!\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const snap = await firestore()
                .collection('accessLogs')
                .where('deviceId', '==', device.id)
                .get();

              const batch = firestore().batch();
              snap.docs.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();

              setStats((prev) => ({ ...prev, totalLogs: 0, last24hr: 0 }));
              Alert.alert('Done', 'All logs cleared!');
            } catch (e) {
              Alert.alert('Error', 'Problem clearing logs!');
            }
          },
        },
      ],
    );
  };

  // ─── Factory Reset ────────────────────────────────────────────
  const handleFactoryReset = () => {
    Alert.alert(
      '⚠️ Factory Reset',
      'This will delete all device data:\n\n• All RFID cards\n• All fingerprints\n• All access logs\n• WiFi configuration\n\nThis action CANNOT be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              sendCommand(device.id, 'FACTORY_RESET');

              // Delete everything from Firestore as well
              const collections = ['rfidCards', 'fingerprints'];
              for (const col of collections) {
                const snap = await firestore()
                  .collection('devices')
                  .doc(device.id)
                  .collection(col)
                  .get();
                const batch = firestore().batch();
                snap.docs.forEach((doc) => batch.delete(doc.ref));
                await batch.commit();
              }

              Alert.alert(
                'Factory Reset',
                'Reset command sent! Device will restart and enter setup mode.',
                [{ text: 'OK', onPress: () => navigation.navigate('Home') }],
              );
            } catch (e) {
              Alert.alert('Error', 'Problem with factory reset!');
            }
          },
        },
      ],
    );
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

      {/* ── Device Status Card ──────────────────────────────── */}
      <View style={styles.statusCard}>
        <View style={styles.statusCardLeft}>
          <Text style={styles.statusCardTitle}>{device.name}</Text>
          <Text style={styles.statusCardSub}>{device.id}</Text>
        </View>
        <View style={styles.statusCardRight}>
          <View style={[
            styles.onlineBadge,
            { backgroundColor: stats.deviceStatus === 'ONLINE' ? colors.online + '20' : colors.offline + '20' },
          ]}>
            <View style={[
              styles.onlineDot,
              { backgroundColor: stats.deviceStatus === 'ONLINE' ? colors.online : colors.offline },
            ]} />
            <Text style={[
              styles.onlineText,
              { color: stats.deviceStatus === 'ONLINE' ? colors.online : colors.offline },
            ]}>
              {stats.deviceStatus}
            </Text>
          </View>
          <Text style={styles.lockStateText}>
            {stats.lockState === 'LOCKED' ? '🔒' : '🔓'} {stats.lockState}
          </Text>
        </View>
      </View>

      {/* ── Stats Grid ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>📊 Statistics</Text>
      <View style={styles.statsGrid}>
        {[
          { label: 'Total Logs',    value: stats.totalLogs,  icon: '📋', color: colors.primary },
          { label: 'Last 24 Hours', value: stats.last24hr,   icon: '⏱️', color: colors.warning },
          { label: 'Users',         value: stats.totalUsers, icon: '👥', color: '#7C3AED' },
          { label: 'RFID Cards',    value: stats.totalRFID,  icon: '💳', color: '#059669' },
          { label: 'Fingerprints',  value: stats.totalFP,    icon: '👆', color: '#D97706' },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { borderTopColor: stat.color }]}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
      <View style={styles.actionsCard}>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('AccessHistory', { device })}>
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.actionEmoji}>📋</Text>
            </View>
            <View>
              <Text style={styles.actionTitle}>Access History</Text>
              <Text style={styles.actionDesc}>View all logs</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('UserManagement', { device })}>
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: '#7C3AED' + '15' }]}>
              <Text style={styles.actionEmoji}>👥</Text>
            </View>
            <View>
              <Text style={styles.actionTitle}>User Management</Text>
              <Text style={styles.actionDesc}>Add/remove users</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('RFIDManagement', { device })}>
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: '#059669' + '15' }]}>
              <Text style={styles.actionEmoji}>💳</Text>
            </View>
            <View>
              <Text style={styles.actionTitle}>RFID Cards</Text>
              <Text style={styles.actionDesc}>Manage cards</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => navigation.navigate('FingerprintMgmt', { device })}>
          <View style={styles.actionLeft}>
            <View style={[styles.actionIcon, { backgroundColor: '#D97706' + '15' }]}>
              <Text style={styles.actionEmoji}>👆</Text>
            </View>
            <View>
              <Text style={styles.actionTitle}>Fingerprints</Text>
              <Text style={styles.actionDesc}>Manage fingerprints</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

      </View>

      {/* ── Device Commands ──────────────────────────────────── */}
      <Text style={styles.sectionTitle}>🎮 Device Commands</Text>
      <View style={styles.commandsCard}>

        <TouchableOpacity style={styles.commandRow} onPress={handleForceLock}>
          <View style={styles.commandLeft}>
            <Text style={styles.commandIcon}>🔒</Text>
            <View>
              <Text style={styles.commandTitle}>Force Lock</Text>
              <Text style={styles.commandDesc}>Lock now</Text>
            </View>
          </View>
          <Text style={styles.commandArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.commandRow} onPress={handleRestart}>
          <View style={styles.commandLeft}>
            <Text style={styles.commandIcon}>🔄</Text>
            <View>
              <Text style={styles.commandTitle}>Device Restart</Text>
              <Text style={styles.commandDesc}>Reboot ESP32</Text>
            </View>
          </View>
          <Text style={styles.commandArrow}>›</Text>
        </TouchableOpacity>

      </View>

      {/* ── Danger Zone ──────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
      <View style={[styles.commandsCard, styles.dangerCard]}>

        <TouchableOpacity style={styles.commandRow} onPress={handleClearLogs}>
          <View style={styles.commandLeft}>
            <Text style={styles.commandIcon}>🗑️</Text>
            <View>
              <Text style={[styles.commandTitle, { color: colors.warning }]}>
                Clear All Logs
              </Text>
              <Text style={styles.commandDesc}>Delete all access logs</Text>
            </View>
          </View>
          <Text style={styles.commandArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.commandRow} onPress={handleFactoryReset}>
          <View style={styles.commandLeft}>
            <Text style={styles.commandIcon}>⚠️</Text>
            <View>
              <Text style={[styles.commandTitle, { color: colors.error }]}>
                Factory Reset
              </Text>
              <Text style={styles.commandDesc}>Wipe all data</Text>
            </View>
          </View>
          <Text style={styles.commandArrow}>›</Text>
        </TouchableOpacity>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Status Card
  statusCard: {
    backgroundColor: colors.primary, borderRadius: 16,
    padding: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, elevation: 3,
  },
  statusCardLeft: {},
  statusCardTitle: { ...typography.h3, color: colors.textWhite },
  statusCardSub: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statusCardRight: { alignItems: 'flex-end', gap: 8 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  onlineText: { ...typography.caption, fontWeight: '700' },
  lockStateText: { ...typography.bodySmall, color: colors.textWhite, fontWeight: '600' },

  // Section Title
  sectionTitle: {
    ...typography.label, color: colors.textSecondary,
    marginBottom: 10, marginTop: 24, paddingLeft: 4,
  },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, width: '47%', alignItems: 'center',
    elevation: 2, borderTopWidth: 3,
  },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  // Actions Card
  actionsCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 4, elevation: 2,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  actionEmoji: { fontSize: 22 },
  actionTitle: { ...typography.h4, color: colors.textPrimary },
  actionDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  actionArrow: { fontSize: 24, color: colors.textLight },

  // Commands Card
  commandsCard: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 4, elevation: 2,
  },
  dangerCard: { borderWidth: 1.5, borderColor: colors.error + '30' },
  commandRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14,
  },
  commandLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  commandIcon: { fontSize: 28 },
  commandTitle: { ...typography.h4, color: colors.textPrimary },
  commandDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  commandArrow: { fontSize: 24, color: colors.textLight },

  // Divider
  divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
});