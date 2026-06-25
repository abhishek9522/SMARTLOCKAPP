import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  TextInput, Modal,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { sendCommand } from '../api/mqttService';
import colors from '../theme/colors';
import typography from '../theme/typography';

export default function FingerprintMgmtScreen({ route }) {
  const { device } = route.params;

  const [fingerprints, setFingerprints] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modalVisible, setModal]        = useState(false);
  const [enrolling, setEnrolling]       = useState(false);
  const [enrollStep, setEnrollStep]     = useState(0); // 0,1,2 = steps
  const [fingerLabel, setFingerLabel]   = useState('');
  const [fingerId, setFingerId]         = useState(null);
  const [adding, setAdding]             = useState(false);

  // Fetch fingerprints from Firestore
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('devices')
      .doc(device.id)
      .collection('fingerprints')
      .orderBy('addedAt', 'desc')
      .onSnapshot((snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFingerprints(list);
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  // Get next available finger ID (1-127)
  const getNextFingerId = () => {
    const usedIds = fingerprints.map((f) => f.fingerId);
    for (let i = 1; i <= 127; i++) {
      if (!usedIds.includes(i)) return i;
    }
    return null;
  };

  // ─── Enroll Start ─────────────────────────────────────────────
  const handleStartEnroll = () => {
    const nextId = getNextFingerId();
    if (!nextId) {
      Alert.alert('Full', 'Maximum 127 fingerprints can be stored!');
      return;
    }
    setFingerId(nextId);
    setEnrollStep(1);
    setEnrolling(true);

    // Send enroll command to ESP32
    sendCommand(device.id, `FP_ENROLL_START:${nextId}`);
  };

  // ─── Enroll Step 2 ────────────────────────────────────────────
  const handleEnrollStep2 = () => {
    setEnrollStep(2);
    sendCommand(device.id, `FP_ENROLL_STEP2:${fingerId}`);
  };

  // ─── Enroll Complete ──────────────────────────────────────────
  const handleEnrollComplete = async () => {
    if (!fingerLabel.trim()) {
      Alert.alert('Error', 'Please enter a name for the fingerprint!');
      return;
    }

    setAdding(true);
    try {
      await firestore()
        .collection('devices')
        .doc(device.id)
        .collection('fingerprints')
        .add({
          fingerId:  fingerId,
          label:     fingerLabel.trim(),
          enabled:   true,
          addedAt:   firestore.FieldValue.serverTimestamp(),
        });

      sendCommand(device.id, `FP_ENROLL_DONE:${fingerId}`);

      setModal(false);
      setEnrolling(false);
      setEnrollStep(0);
      setFingerLabel('');
      setFingerId(null);
      Alert.alert('Success', 'Fingerprint enrolled successfully! ✅');
    } catch (e) {
      Alert.alert('Error', 'Problem saving fingerprint!');
    } finally {
      setAdding(false);
    }
  };

  // ─── Cancel Enroll ────────────────────────────────────────────
  const handleCancelEnroll = () => {
    sendCommand(device.id, 'FP_ENROLL_CANCEL');
    setModal(false);
    setEnrolling(false);
    setEnrollStep(0);
    setFingerLabel('');
    setFingerId(null);
  };

  // ─── Toggle Enable/Disable ────────────────────────────────────
  const handleToggle = async (fp) => {
    const newState = !fp.enabled;
    try {
      await firestore()
        .collection('devices')
        .doc(device.id)
        .collection('fingerprints')
        .doc(fp.id)
        .update({ enabled: newState });

      sendCommand(
        device.id,
        newState ? `FP_ENABLE:${fp.fingerId}` : `FP_DISABLE:${fp.fingerId}`,
      );
    } catch (e) {
      Alert.alert('Error', 'Problem updating!');
    }
  };

  // ─── Delete ───────────────────────────────────────────────────
  const handleDelete = (fp) => {
    Alert.alert(
      'Delete',
      `Do you want to remove "${fp.label}" fingerprint?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await firestore()
              .collection('devices')
              .doc(device.id)
              .collection('fingerprints')
              .doc(fp.id)
              .delete();

            sendCommand(device.id, `FP_REMOVE:${fp.fingerId}`);
          },
        },
      ],
    );
  };

  // ─── Fingerprint Item ─────────────────────────────────────────
  const renderFingerprint = ({ item }) => (
    <View style={styles.fpCard}>
      {/* Icon */}
      <View style={[
        styles.fpIcon,
        { backgroundColor: item.enabled ? colors.primary + '15' : colors.border },
      ]}>
        <Text style={styles.fpIconText}>👆</Text>
      </View>

      {/* Info */}
      <View style={styles.fpInfo}>
        <Text style={styles.fpLabel}>{item.label}</Text>
        <Text style={styles.fpId}>ID: {item.fingerId}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.enabled ? colors.success + '20' : colors.error + '20' },
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.enabled ? colors.success : colors.error },
          ]}>
            {item.enabled ? '✓ Active' : '✗ Disabled'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: item.enabled ? colors.error + '15' : colors.success + '15' },
          ]}
          onPress={() => handleToggle(item)}>
          <Text style={styles.actionIcon}>{item.enabled ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}>
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Enroll Modal ─────────────────────────────────────────────
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={handleCancelEnroll}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>👆 Enroll Fingerprint</Text>

          {/* Step Indicator */}
          <View style={styles.stepRow}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.stepItem}>
                <View style={[
                  styles.stepCircle,
                  enrollStep >= s && styles.stepCircleActive,
                ]}>
                  <Text style={[
                    styles.stepNum,
                    enrollStep >= s && styles.stepNumActive,
                  ]}>
                    {s}
                  </Text>
                </View>
                <Text style={styles.stepLabel}>
                  {s === 1 ? 'First Time' : s === 2 ? 'Again' : 'Save'}
                </Text>
              </View>
            ))}
          </View>

          {/* Step 0 — Start */}
          {enrollStep === 0 && (
            <View style={styles.enrollContent}>
              <Text style={styles.enrollIcon}>👆</Text>
              <Text style={styles.enrollTitle}>Start Enroll</Text>
              <Text style={styles.enrollDesc}>
                Get ready to place your finger on the sensor.{'\n'}
                ID {getNextFingerId()} will be assigned.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleStartEnroll}>
                <Text style={styles.primaryBtnText}>Start 👆</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 1 — First time */}
          {enrollStep === 1 && (
            <View style={styles.enrollContent}>
              <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
              <Text style={styles.enrollTitle}>Place Finger First Time</Text>
              <Text style={styles.enrollDesc}>
                Place your finger on the fingerprint sensor and{'\n'}
                hold until the green light appears.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleEnrollStep2}>
                <Text style={styles.primaryBtnText}>Done → Place Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2 — Again */}
          {enrollStep === 2 && (
            <View style={styles.enrollContent}>
              <ActivityIndicator size="large" color={colors.success} style={{ marginBottom: 16 }} />
              <Text style={styles.enrollTitle}>Place Finger Again</Text>
              <Text style={styles.enrollDesc}>
                Place the same finger on the sensor again{'\n'}
                for confirmation.
              </Text>

              <Text style={styles.label}>Fingerprint Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Thumb, Index Finger, Guest"
                placeholderTextColor={colors.textLight}
                value={fingerLabel}
                onChangeText={setFingerLabel}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, adding && styles.btnDisabled]}
                onPress={handleEnrollComplete}
                disabled={adding}>
                {adding
                  ? <ActivityIndicator color={colors.textWhite} />
                  : <Text style={styles.primaryBtnText}>Save ✅</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancelEnroll}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderModal()}

      {/* Header */}
      <View style={styles.headerBar}>
        <Text style={styles.headerText}>
          👆  {fingerprints.length}/127 Fingerprints  —  {device.name}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={fingerprints}
        keyExtractor={(item) => item.id}
        renderItem={renderFingerprint}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👆</Text>
            <Text style={styles.emptyTitle}>No Fingerprints</Text>
            <Text style={styles.emptySubtitle}>
              Press + button to enroll fingerprint
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerBar: { backgroundColor: colors.primary, padding: 12, alignItems: 'center' },
  headerText: { ...typography.bodyMedium, color: colors.textWhite, fontWeight: '600' },

  // List
  list: { padding: 16, paddingBottom: 100 },

  // FP Card
  fpCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  fpIcon: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  fpIconText: { fontSize: 24 },
  fpInfo: { flex: 1 },
  fpLabel: { ...typography.h4, color: colors.textPrimary },
  fpId: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },
  statusText: { ...typography.caption, fontWeight: '700' },

  // Actions
  actions: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.error + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  actionIcon: { fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 20 },

  // Step Indicator
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 24 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: colors.primary },
  stepNum: { ...typography.btnSmall, color: colors.textSecondary },
  stepNumActive: { color: colors.textWhite },
  stepLabel: { ...typography.caption, color: colors.textSecondary },

  // Enroll Content
  enrollContent: { alignItems: 'center', marginBottom: 16 },
  enrollIcon: { fontSize: 56, marginBottom: 12 },
  enrollTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
  enrollDesc: {
    ...typography.bodyMedium, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 20,
  },

  // Input
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 6, marginTop: 12, alignSelf: 'flex-start', width: '100%' },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background, width: '100%', marginBottom: 8,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 14, alignItems: 'center', width: '100%', marginTop: 8,
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  primaryBtnText: { ...typography.btnMedium, color: colors.textWhite },
  cancelBtn: {
    padding: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, marginTop: 10,
  },
  cancelBtnText: { ...typography.btnMedium, color: colors.textSecondary },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary, justifyContent: 'center',
    alignItems: 'center', elevation: 6,
  },
  fabText: { fontSize: 32, color: colors.textWhite, lineHeight: 36 },

  // Empty
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptySubtitle: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 8 },
});