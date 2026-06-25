import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import colors from '../theme/colors';
import typography from '../theme/typography';
import { ACCESS_SOURCE } from '../utils/constants';

// Icon and color based on source
const SOURCE_CONFIG = {
  [ACCESS_SOURCE.APP]:         { icon: '📱', label: 'App',         color: colors.primary },
  [ACCESS_SOURCE.RFID]:        { icon: '💳', label: 'RFID Card',   color: '#7C3AED' },
  [ACCESS_SOURCE.FINGERPRINT]: { icon: '👆', label: 'Fingerprint', color: '#059669' },
  [ACCESS_SOURCE.PIN]:         { icon: '🔢', label: 'PIN',         color: '#D97706' },
};

// Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

export default function AccessHistoryScreen({ route }) {
  const { device } = route.params;
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('ALL'); // ALL, APP, RFID, FINGER, PIN
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc]     = useState(null);
  const [hasMore, setHasMore]     = useState(true);

  const PAGE_SIZE = 20;

  // Fetch logs initially
  useEffect(() => {
    fetchLogs(true);
  }, [filter]);

  const fetchLogs = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
    } else {
      if (!hasMore) return;
      setLoadingMore(true);
    }

    try {
      let query = firestore()
        .collection('accessLogs')
        .where('deviceId', '==', device.id)
        .orderBy('timestamp', 'desc')
        .limit(PAGE_SIZE);

      // Apply filter
      if (filter !== 'ALL') {
        query = query.where('source', '==', filter);
      }

      // Pagination
      if (!reset && lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const newLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs((prev) => [...prev, ...newLogs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error('Logs fetch error:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // ─── Filter Tabs ─────────────────────────────────────────────
  const renderFilters = () => {
    const filters = ['ALL', 'APP', 'RFID', 'FINGER', 'PIN'];
    return (
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // ─── Log Item ─────────────────────────────────────────────────
  const renderLog = ({ item }) => {
    const config  = SOURCE_CONFIG[item.source] || { icon: '❓', label: item.source, color: colors.textSecondary };
    const isOk    = item.result === 'OK';

    return (
      <View style={styles.logCard}>
        {/* Left Icon */}
        <View style={[styles.logIconBox, { backgroundColor: config.color + '15' }]}>
          <Text style={styles.logIcon}>{config.icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.logInfo}>
          <Text style={styles.logSource}>{config.label}</Text>
          <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
        </View>

        {/* Result Badge */}
        <View style={[styles.resultBadge, { backgroundColor: isOk ? colors.success + '20' : colors.error + '20' }]}>
          <Text style={[styles.resultText, { color: isOk ? colors.success : colors.error }]}>
            {isOk ? '✓ OK' : '✗ FAIL'}
          </Text>
        </View>
      </View>
    );
  };

  // ─── Footer: Load More ────────────────────────────────────────
  const renderFooter = () => {
    if (!hasMore) return (
      <Text style={styles.noMoreText}>• All logs viewed •</Text>
    );
    if (loadingMore) return (
      <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
    );
    return (
      <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchLogs(false)}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          📋  {device.name}  —  {logs.length} records
        </Text>
      </View>

      {/* Filter Tabs */}
      {renderFilters()}

      {/* Logs List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          contentContainerStyle={styles.list}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No Logs Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'ALL'
                  ? 'No access records found for this device yet.'
                  : `No records found for the ${filter} filter.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Stats Bar
  statsBar: {
    backgroundColor: colors.primary, padding: 12, alignItems: 'center',
  },
  statsText: { ...typography.bodyMedium, color: colors.textWhite, fontWeight: '600' },

  // Filter Tabs
  filterRow: {
    flexDirection: 'row', backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.textWhite },

  // List
  list: { padding: 16, paddingBottom: 32 },

  // Log Card
  logCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  logIconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  logIcon: { fontSize: 22 },
  logInfo: { flex: 1 },
  logSource: { ...typography.h4, color: colors.textPrimary },
  logTime: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  resultBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  resultText: { ...typography.btnSmall, fontWeight: '700' },

  // Footer
  noMoreText: {
    ...typography.caption, color: colors.textLight,
    textAlign: 'center', marginVertical: 20,
  },
  loadMoreBtn: {
    backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, padding: 12, alignItems: 'center', marginVertical: 12,
  },
  loadMoreText: { ...typography.btnSmall, color: colors.primary },

  // Empty
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary },
  emptySubtitle: {
    ...typography.bodyMedium, color: colors.textSecondary,
    textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 20,
  },
});