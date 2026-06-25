import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function StatusBadge({ status }) {
  const isOnline = status === 'ONLINE';

  return (
    <View style={[styles.badge, {
      backgroundColor: isOnline ? colors.online + '20' : colors.offline + '20',
    }]}>
      <View style={[styles.dot, {
        backgroundColor: isOnline ? colors.online : colors.offline,
      }]} />
      <Text style={[styles.text, {
        color: isOnline ? colors.online : colors.offline,
      }]}>
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { ...typography.btnSmall },
});