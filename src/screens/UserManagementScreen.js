import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  TextInput, Modal,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { ROLES } from '../utils/constants';
import { getRoleLabel, getRoleColor } from '../utils/roleHelper';

export default function UserManagementScreen({ route }) {
  const { device } = route.params;
  const { user } = useAuth();

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalVisible, setModal]    = useState(false);
  const [newEmail, setNewEmail]     = useState('');
  const [newRole, setNewRole]       = useState(ROLES.USER);
  const [adding, setAdding]         = useState(false);

  // Fetch users in real-time
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('devices')
      .doc(device.id)
      .collection('users')
      .onSnapshot(async (snapshot) => {
        const list = await Promise.all(
          snapshot.docs.map(async (doc) => {
            // Get user name/email from Firestore users collection
            const userDoc = await firestore()
              .collection('users')
              .doc(doc.id)
              .get();
            return {
              uid: doc.id,
              role: doc.data().role,
              scheduleStart: doc.data().scheduleStart || null,
              scheduleEnd:   doc.data().scheduleEnd   || null,
              name:  userDoc.exists ? userDoc.data().name  : 'Unknown',
              email: userDoc.exists ? userDoc.data().email : doc.id,
            };
          })
        );
        setUsers(list);
        setLoading(false);
      });

    return unsubscribe;
  }, []);

  // ─── Add User ────────────────────────────────────────────
  const handleAddUser = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter email!');
      return;
    }

    setAdding(true);
    try {
      // Find user by email
      const snapshot = await firestore()
        .collection('users')
        .where('email', '==', newEmail.trim().toLowerCase())
        .limit(1)
        .get();

      if (snapshot.empty) {
        Alert.alert('User Not Found', 'No account registered with this email!');
        return;
      }

      const foundUid = snapshot.docs[0].id;

      // Prevent adding self
      if (foundUid === user.uid) {
        Alert.alert('Error', 'You cannot add yourself!');
        return;
      }

      // Add to device users
      await firestore()
        .collection('devices')
        .doc(device.id)
        .collection('users')
        .doc(foundUid)
        .set({ role: newRole });

      setModal(false);
      setNewEmail('');
      setNewRole(ROLES.USER);
      Alert.alert('Success', 'User added successfully! ✅');
    } catch (e) {
      Alert.alert('Error', 'Problem adding user!');
    } finally {
      setAdding(false);
    }
  };

  // ─── Change Role ─────────────────────────────────────────
  const handleChangeRole = (uid, currentRole) => {
    if (uid === user.uid) {
      Alert.alert('Error', 'You cannot change your own role!');
      return;
    }

    const roles = [ROLES.ADMIN, ROLES.USER, ROLES.GUEST];
    Alert.alert(
      'Change Role',
      'Select new role:',
      [
        ...roles.map((r) => ({
          text: `${getRoleLabel(r)} ${currentRole === r ? '✓' : ''}`,
          onPress: async () => {
            await firestore()
              .collection('devices')
              .doc(device.id)
              .collection('users')
              .doc(uid)
              .update({ role: r });
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Remove User ─────────────────────────────────────────
  const handleRemoveUser = (uid, name) => {
    if (uid === user.uid) {
      Alert.alert('Error', 'You cannot remove yourself!');
      return;
    }

    Alert.alert(
      'Remove User',
      `Do you want to remove ${name} from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await firestore()
              .collection('devices')
              .doc(device.id)
              .collection('users')
              .doc(uid)
              .delete();
          },
        },
      ]
    );
  };

  // ─── User Card ────────────────────────────────────────────────
  const renderUser = ({ item }) => {
    const isCurrentUser = item.uid === user.uid;
    const roleColor = getRoleColor(item.role);

    return (
      <View style={styles.userCard}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: roleColor + '20' }]}>
          <Text style={[styles.avatarText, { color: roleColor }]}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>

          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
            <Text style={[styles.roleText, { color: roleColor }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
        </View>

        {/* Actions — Don't show for owner */}
        {!isCurrentUser && item.role !== ROLES.OWNER && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleChangeRole(item.uid, item.role)}>
              <Text style={styles.actionIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.removeBtn]}
              onPress={() => handleRemoveUser(item.uid, item.name)}>
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── Add User Modal ───────────────────────────────────────────
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Add New User</Text>

          <Text style={styles.label}>User Email</Text>
          <TextInput
            style={styles.input}
            placeholder="user@example.com"
            placeholderTextColor={colors.textLight}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Select Role</Text>
          <View style={styles.roleSelector}>
            {[ROLES.ADMIN, ROLES.USER, ROLES.GUEST].map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleOption,
                  newRole === r && { backgroundColor: getRoleColor(r), borderColor: getRoleColor(r) },
                ]}
                onPress={() => setNewRole(r)}>
                <Text style={[
                  styles.roleOptionText,
                  newRole === r && { color: colors.textWhite },
                ]}>
                  {getRoleLabel(r)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role Description */}
          <View style={styles.roleDesc}>
            <Text style={styles.roleDescText}>
              {newRole === ROLES.ADMIN && '👮 Admin: Can unlock + manage RFID/PIN'}
              {newRole === ROLES.USER  && '👤 User: Can only unlock'}
              {newRole === ROLES.GUEST && '🕐 Guest: Limited time unlock access'}
            </Text>
          </View>

          <View style={styles.modalBtns}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, adding && styles.btnDisabled]}
              onPress={handleAddUser}
              disabled={adding}>
              {adding
                ? <ActivityIndicator color={colors.textWhite} />
                : <Text style={styles.addBtnText}>Add User</Text>}
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

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerText}>
          👥  {users.length} User{users.length !== 1 ? 's' : ''}  —  {device.name}
        </Text>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Users</Text>
            <Text style={styles.emptySubtitle}>Press + button to add user</Text>
          </View>
        }
      />

      {/* FAB — Add User */}
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

  // User Card
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 14, marginBottom: 10, elevation: 2,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '700' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { ...typography.h4, color: colors.textPrimary },
  youBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  youText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  userEmail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10,
    paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },
  roleText: { ...typography.caption, fontWeight: '700' },

  // Actions
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  removeBtn: { borderColor: colors.error + '40', backgroundColor: colors.error + '10' },
  actionIcon: { fontSize: 16 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 14, ...typography.bodyLarge, color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  roleSelector: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roleOption: {
    flex: 1, padding: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  roleOptionText: { ...typography.btnSmall, color: colors.textSecondary },
  roleDesc: {
    backgroundColor: colors.background, borderRadius: 10,
    padding: 12, marginTop: 12,
  },
  roleDescText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
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