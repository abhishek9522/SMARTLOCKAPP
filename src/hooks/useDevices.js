import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export const useDevices = () => {
  const { user } = useAuth();
  const { updateDevices } = useDevice();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

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
      });

    return unsubscribe;
  }, [user]);

  return { devices, loading };
};