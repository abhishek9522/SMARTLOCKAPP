import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

// ─── DEVICES ─────────────────────────────────────────────────

export const getUserDevices = (uid, callback) => {
  return firestore()
    .collection('devices')
    .where('ownerId', '==', uid)
    .onSnapshot((snap) => {
      const devices = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(devices);
    });
};

export const getDevice = async (deviceId) => {
  const doc = await firestore().collection('devices').doc(deviceId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateDevice = async (deviceId, data) => {
  await firestore().collection('devices').doc(deviceId).update(data);
};

export const deleteDevice = async (deviceId) => {
  await firestore().collection('devices').doc(deviceId).delete();
};

// ─── USERS ───────────────────────────────────────────────────

export const getUserProfile = async (uid) => {
  const doc = await firestore().collection('users').doc(uid).get();
  return doc.exists ? { uid: doc.id, ...doc.data() } : null;
};

export const updateUserProfile = async (uid, data) => {
  await firestore().collection('users').doc(uid).update(data);
};

export const findUserByEmail = async (email) => {
  const snap = await firestore()
    .collection('users')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();
  return snap.empty ? null : { uid: snap.docs[0].id, ...snap.docs[0].data() };
};

// ─── DEVICE USERS ─────────────────────────────────────────────

export const addDeviceUser = async (deviceId, uid, role) => {
  await firestore()
    .collection('devices')
    .doc(deviceId)
    .collection('users')
    .doc(uid)
    .set({ role });
};

export const removeDeviceUser = async (deviceId, uid) => {
  await firestore()
    .collection('devices')
    .doc(deviceId)
    .collection('users')
    .doc(uid)
    .delete();
};

export const updateDeviceUserRole = async (deviceId, uid, role) => {
  await firestore()
    .collection('devices')
    .doc(deviceId)
    .collection('users')
    .doc(uid)
    .update({ role });
};

// ─── ACCESS LOGS ─────────────────────────────────────────────

export const saveAccessLog = async ({ deviceId, userId, source, result }) => {
  await firestore().collection('accessLogs').add({
    deviceId,
    userId:    userId || null,
    source,
    result,
    timestamp: firestore.FieldValue.serverTimestamp(),
  });
};

export const getAccessLogs = async (deviceId, limit = 20, lastDoc = null) => {
  let query = firestore()
    .collection('accessLogs')
    .where('deviceId', '==', deviceId)
    .orderBy('timestamp', 'desc')
    .limit(limit);

  if (lastDoc) query = query.startAfter(lastDoc);

  const snap = await query.get();
  return {
    logs:    snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === limit,
  };
};

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────

export const saveFCMToken = async (uid) => {
  try {
    const token = await messaging().getToken();
    await firestore().collection('users').doc(uid).update({
      fcmToken: token,
      fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return token;
  } catch (e) {
    console.error('FCM token error:', e);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};