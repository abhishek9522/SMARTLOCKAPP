import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function UnlockButton({ onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        disabled && styles.disabled,
        loading && styles.unlocking,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.textWhite} />
      ) : (
        <Text style={styles.icon}>🔓</Text>
      )}
      <Text style={styles.label}>
        {loading ? 'Unlocking...' : 'UNLOCK'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', elevation: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.5, shadowRadius: 16,
  },
  disabled: {
    backgroundColor: colors.unlockBtnDisabled,
    elevation: 2, shadowOpacity: 0,
  },
  unlocking: { backgroundColor: colors.success },
  icon: { fontSize: 48 },
  label: { ...typography.btnLarge, color: colors.textWhite, marginTop: 6 },
});