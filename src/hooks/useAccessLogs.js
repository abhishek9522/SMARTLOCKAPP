import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';

export const useAccessLogs = (deviceId, filter = 'ALL') => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchLogs(true);
  }, [deviceId, filter]);

  const fetchLogs = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setLastDoc(null);
      setHasMore(true);
    }

    try {
      let query = firestore()
        .collection('accessLogs')
        .where('deviceId', '==', deviceId)
        .orderBy('timestamp', 'desc')
        .limit(PAGE_SIZE);

      if (filter !== 'ALL') {
        query = query.where('source', '==', filter);
      }

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
    }
  };

  const loadMore = () => fetchLogs(false);

  return { logs, loading, hasMore, loadMore };
};