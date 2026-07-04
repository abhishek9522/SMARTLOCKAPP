import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DeviceContext = createContext(null);

const STORAGE_KEY = 'smartlock_devices';

export const DeviceProvider = ({ children }) => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices]               = useState([]);

  // App start pe local se load karo
  useEffect(() => {
    loadLocalDevices();
  }, []);

  const loadLocalDevices = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDevices(parsed);
      }
    } catch (e) {
      console.error('Local devices load error:', e);
    }
  };

  const saveLocalDevices = async (list) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Local devices save error:', e);
    }
  };

  const selectDevice  = (device) => setSelectedDevice(device);
  const clearDevice   = ()       => setSelectedDevice(null);

  const updateDevices = (list) => {
    setDevices(list);
    saveLocalDevices(list);
  };

  const updateDeviceStatus = (deviceId, status) => {
    setDevices((prev) => {
      const updated = prev.map((d) =>
        d.id === deviceId ? { ...d, ...status } : d
      );
      saveLocalDevices(updated);
      return updated;
    });
    if (selectedDevice?.id === deviceId) {
      setSelectedDevice((prev) => ({ ...prev, ...status }));
    }
  };

  return (
    <DeviceContext.Provider
      value={{
        selectedDevice,
        devices,
        selectDevice,
        clearDevice,
        updateDevices,
        updateDeviceStatus,
      }}>
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevice = () => useContext(DeviceContext);