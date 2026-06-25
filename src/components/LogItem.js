import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

const SOURCE_CONFIG = {
  APP:    { icon: '📱', label: 'App',         color: colors.primary },
  RFID:   { icon: '💳', label: 'RFID Card',   color: '#7C3AED' },
  FINGER: { icon: '👆', label: 'Fingerprint', color: '#059669' },
  PIN:    { icon: '🔢', label: 'PIN',         color: '#D97706' },
};

const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

export default function LogItem({ log }) {
  const config = SOURCE_CONFIG[log.source] || {
    icon: '❓', label: log.source, color: colors.textSecondary,
  };
  const isOk = log.result === 'OK';

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: config.color + '15' }]}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.source}>{config.label}</Text>
        <Text style={styles.time}>{formatTime(log.timestamp)}</Text>
      </View>
      <View style={[styles.badge, {
        backgroundColor: isOk ? colors.success + '20' : colors.error + '20',
      }]}>
        <Text style={[styles.result, {
          color: isOk ? colors.success : colors.error,
        }]}>
          {isOk ? '✓ OK' : '✗ FAIL'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, marginBottom: 10, elevation: 1,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  source: { ...typography.h4, color: colors.textPrimary },
  time: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  result: { ...typography.btnSmall, fontWeight: '700' },
});