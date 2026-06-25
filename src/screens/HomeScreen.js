import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { DEVICE_STATUS } from '../utils/constants';

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { updateDevices } = useDevice();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real-time devices from Firestore
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('devices')
      .where('ownerId', '==', user.uid)
      .onSnapshot((snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDevices(list);
        updateDevices(list);
        setLoading(false);
        setRefreshing(false);
      });

    return unsubscribe;
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Do you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDevicePress = (device) => {
    navigation.navigate('DeviceControl', { device });
  };

  const renderDevice = ({ item }) => {
    const isOnline = item.status === DEVICE_STATUS.ONLINE;
    const isLocked = item.lockState === DEVICE_STATUS.LOCKED;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleDevicePress(item)}
        activeOpacity={0.8}>

        {/* Left Icon */}
        <View style={[styles.iconBox, { backgroundColor: isOnline ? colors.online + '20' : colors.offline + '20' }]}>
          <Text style={styles.lockIcon}>{isLocked ? '🔒' : '🔓'}</Text>
        </View>

        {/* Device Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.deviceName}>{item.name || 'Smart Lock'}</Text>
          <Text style={styles.roomName}>{item.roomName || 'Room'}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.online : colors.offline }]} />
            <Text style={[styles.statusText, { color: isOnline ? colors.online : colors.offline }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={styles.separator}>  •  </Text>
            <Text style={styles.lockStateText}>
              {isLocked ? 'Locked' : 'Unlocked'}
            </Text>
          </View>
        </View>

        {/* Arrow */}
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
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
    <View style={styles.container}>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Devices List */}
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={renderDevice}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => setRefreshing(true)}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔐</Text>
            <Text style={styles.emptyTitle}>No Locks Found</Text>
            <Text style={styles.emptySubtitle}>Add a new lock using the + button below</Text>
          </View>
        }
      />

      {/* Add Device FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDevice')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Top Bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary, padding: 20, paddingTop: 40,
  },
  greeting: { ...typography.h3, color: colors.textWhite },
  email: { ...typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  logoutText: { ...typography.btnSmall, color: colors.textWhite },

  // List
  list: { padding: 16, paddingBottom: 100 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  lockIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  deviceName: { ...typography.h4, color: colors.textPrimary },
  roomName: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusText: { ...typography.bodySmall, fontWeight: '600' },
  separator: { color: colors.textLight },
  lockStateText: { ...typography.bodySmall, color: colors.textSecondary },
  arrow: { fontSize: 28, color: colors.textLight, marginLeft: 8 },

  // Empty
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptySubtitle: { ...typography.bodyMedium, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8,
  },
  fabText: { fontSize: 32, color: colors.textWhite, lineHeight: 36 },
});