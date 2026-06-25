import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { DEVICE_STATUS } from '../utils/constants';

export default function LockCard({ device, onPress }) {
  const isOnline = device.status === DEVICE_STATUS.ONLINE;
  const isLocked = device.lockState === DEVICE_STATUS.LOCKED;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>

      {/* Icon Box */}
      <View style={[styles.iconBox, {
        backgroundColor: isOnline ? colors.online + '20' : colors.offline + '20',
      }]}>
        <Text style={styles.lockIcon}>{isLocked ? '🔒' : '🔓'}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{device.name || 'Smart Lock'}</Text>
        <Text style={styles.room}>{device.roomName || 'Room'}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, {
            backgroundColor: isOnline ? colors.online : colors.offline,
          }]} />
          <Text style={[styles.statusText, {
            color: isOnline ? colors.online : colors.offline,
          }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.separator}>  •  </Text>
          <Text style={styles.lockState}>
            {isLocked ? 'Locked' : 'Unlocked'}
          </Text>
        </View>
      </View>

      {/* Arrow */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  lockIcon: { fontSize: 28 },
  info: { flex: 1 },
  name: { ...typography.h4, color: colors.textPrimary },
  room: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusText: { ...typography.bodySmall, fontWeight: '600' },
  separator: { color: colors.textLight },
  lockState: { ...typography.bodySmall, color: colors.textSecondary },
  arrow: { fontSize: 28, color: colors.textLight },
});