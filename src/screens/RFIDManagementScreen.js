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

export default function RFIDManagementScreen({ route }) {
  const { device } = route.params;

  const [cards, setCards]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalVisible, setModal]  = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [cardLabel, setCardLabel] = useState('');
  const [scannedUID, setScannedUID] = useState('');
  const [adding, setAdding]       = useState(false);

  // Fetch RFID cards from Firestore
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('devices')
      .doc(device.id)
      .collection('rfidCards')
      .orderBy('addedAt', 'desc')
      .onSnapshot((snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCards(list);
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  // ─── Start RFID Scan Mode ─────────────────────────────────────
  const handleStartScan = async () => {
    setScanning(true);
    setScannedUID('');

    // Send ESP32 to scan mode
    sendCommand(device.id, 'RFID_SCAN_MODE');

    // Wait for scanned UID via MQTT (15 sec timeout)
    // In real implementation, UID will come from MQTT listener
    // Simulating for now
    Alert.alert(
      '📡 Scan Mode Active',
      'Place card near the ESP32 RFID reader.\n\nUID will be detected automatically.',
      [{ text: 'Cancel', onPress: () => setScanning(false) }],
    );

    // TODO: Receive UID from MQTT topic smartlock/{id}/rfid_scan
    // And call setScannedUID(uid)
  };

  // ─── Add Card ─────────────────────────────────────────────────
  const handleAddCard = async () => {
    if (!cardLabel.trim()) {
      Alert.alert('Error', 'Please enter a name for the card!');
      return;
    }
    if (!scannedUID.trim()) {
      Alert.alert('Error', 'Please scan the card first!');
      return;
    }

    setAdding(true);
    try {
      // Save to Firestore
      await firestore()
        .collection('devices')
        .doc(device.id)
        .collection('rfidCards')
        .doc(scannedUID)
        .set({
          label:   cardLabel.trim(),
          uid:     scannedUID,
          enabled: true,
          addedAt: firestore.FieldValue.serverTimestamp(),
        });

      // Send new card UID to ESP32
      sendCommand(device.id, `RFID_ADD:${scannedUID}`);

      setModal(false);
      setCardLabel('');
      setScannedUID('');
      Alert.alert('Success', 'RFID Card added successfully! ✅');
    } catch (e) {
      Alert.alert('Error', 'Problem adding card!');
    } finally {
      setAdding(false);
    }
  };

  // ─── Toggle Card Enable/Disable ───────────────────────────────
  const handleToggleCard = async (card) => {
    const newState = !card.enabled;
    try {
      await firestore()
        .collection('devices')
        .doc(device.id)
        .collection('rfidCards')
        .doc(card.id)
        .update({ enabled: newState });

      // Update ESP32 as well
      sendCommand(
        device.id,
        newState ? `RFID_ENABLE:${card.uid}` : `RFID_DISABLE:${card.uid}`,
      );
    } catch (e) {
      Alert.alert('Error', 'Problem updating card!');
    }
  };

  // ─── Delete Card ──────────────────────────────────────────────
  const handleDeleteCard = (card) => {
    Alert.alert(
      'Delete Card',
      `Do you want to remove "${card.label}" card?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await firestore()
              .collection('devices')
              .doc(device.id)
              .collection('rfidCards')
              .doc(card.id)
              .delete();

            // Remove from ESP32 as well
            sendCommand(device.id, `RFID_REMOVE:${card.uid}`);
          },
        },
      ],
    );
  };

  // ─── Card Item ────────────────────────────────────────────────
  const renderCard = ({ item }) => (
    <View style={styles.cardItem}>
      {/* Left */}
      <View style={[styles.cardIcon, { backgroundColor: item.enabled ? colors.primary + '15' : colors.border }]}>
        <Text style={styles.cardIconText}>💳</Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardLabel}>{item.label}</Text>
        <Text style={styles.cardUID}>UID: {item.uid}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.enabled ? colors.success + '20' : colors.error + '20' },
        ]}>
          <Text style={[
            styles.statusBadgeText,
            { color: item.enabled ? colors.success : colors.error },
          ]}>
            {item.enabled ? '✓ Active' : '✗ Disabled'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: item.enabled ? colors.error + '15' : colors.success + '15' }]}
          onPress={() => handleToggleCard(item)}>
          <Text style={styles.toggleIcon}>{item.enabled ? '⏸' : '▶️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteCard(item)}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Add Card Modal ───────────────────────────────────────────
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>💳 Add New RFID Card</Text>

          {/* Scan Area */}
          <View style={styles.scanArea}>
            {scanning ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.scanningText}>Scanning...</Text>
                <Text style={styles.scanHint}>Place card near reader</Text>
              </>
            ) : scannedUID ? (
              <>
                <Text style={styles.scanSuccessIcon}>✅</Text>
                <Text style={styles.scannedUID}>UID: {scannedUID}</Text>
                <Text style={styles.scanHint}>Card scanned successfully!</Text>
              </>
            ) : (
              <>
                <Text style={styles.scanIcon}>📡</Text>
                <Text style={styles.scanHint}>Press button below and scan card</Text>
              </>
            )}
          </View>

          {/* Scan Button */}
          {!scannedUID && (
            <TouchableOpacity
              style={[styles.scanBtn, scanning && styles.btnDisabled]}
              onPress={handleStartScan}
              disabled={scanning}>
              <Text style={styles.scanBtnText}>
                {scanning ? 'Scanning...' : '📡 Scan Card'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Manual UID Entry */}
          <Text style={styles.orText}>— or enter UID manually —</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. A1B2C3D4"
            placeholderTextColor={colors.textLight}
            value={scannedUID}
            onChangeText={setScannedUID}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Card Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Main Door Key, Guest Card"
            placeholderTextColor={colors.textLight}
            value={cardLabel}
            onChangeText={setCardLabel}
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setModal(false); setScanning(false); setScannedUID(''); setCardLabel(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, adding && styles.btnDisabled]}
              onPress={handleAddCard}
              disabled={adding}>
              {adding
                ? <ActivityIndicator color={colors.textWhite} />
                : <Text style={styles.addBtnText}>Add Card</Text>}
            </TouchableOpacity>
          </View>
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
          💳  {cards.length} Card{cards.length !== 1 ? 's' : ''}  —  {device.name}
        </Text>
      </View>

      {/* Cards List */}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyTitle}>No RFID Cards</Text>
            <Text style={styles.emptySubtitle}>
              Press + button to add new card
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

  // Card Item
  cardItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIconText: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardLabel: { ...typography.h4, color: colors.textPrimary },
  cardUID: { ...typography.caption, color: colors.textSecondary, marginTop: 2, fontFamily: 'monospace' },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },
  statusBadgeText: { ...typography.caption, fontWeight: '700' },

  // Actions
  actions: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  toggleIcon: { fontSize: 16 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.error + '10',
    justifyContent: 'center', alignItems: 'center',
  },
  deleteIcon: { fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 16 },

  // Scan Area
  scanArea: {
    backgroundColor: colors.background, borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    minHeight: 120, justifyContent: 'center',
  },
  scanIcon: { fontSize: 40, marginBottom: 8 },
  scanSuccessIcon: { fontSize: 40, marginBottom: 8 },
  scanningText: { ...typography.h4, color: colors.primary, marginTop: 12 },
  scannedUID: { ...typography.bodyMedium, color: colors.primary, fontWeight: '700', fontFamily: 'monospace' },
  scanHint: { ...typography.caption, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  // Scan Button
  scanBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    padding: 12, alignItems: 'center', marginBottom: 8,
  },
  scanBtnText: { ...typography.btnMedium, color: colors.textWhite },

  orText: { ...typography.caption, color: colors.textLight, textAlign: 'center', marginVertical: 10 },

  // Inputs
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  // Modal Buttons
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelBtnText: { ...typography.btnMedium, color: colors.textSecondary },
  addBtn: {
    flex: 2, padding: 14, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.unlockBtnDisabled },
  addBtnText: { ...typography.btnMedium, color: colors.textWhite },

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