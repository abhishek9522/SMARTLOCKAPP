import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import typography from '../theme/typography';
import { getRoleLabel, getRoleColor } from '../utils/roleHelper';

export default function UserRoleChip({ role }) {
  const color = getRoleColor(role);
  const label = getRoleLabel(role);

  return (
    <View style={[styles.chip, { backgroundColor: color + '15' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, alignSelf: 'flex-start',
  },
  text: { ...typography.caption, fontWeight: '700' },
});