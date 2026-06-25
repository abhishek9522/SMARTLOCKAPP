import React, { createContext, useContext, useState } from 'react';

const DeviceContext = createContext(null);

export const DeviceProvider = ({ children }) => {
  const [selectedDevice, setSelectedDevice] = useState(null); // current open device
  const [devices, setDevices] = useState([]);                  // list of all devices

  const selectDevice = (device) => setSelectedDevice(device);
  const clearDevice  = ()       => setSelectedDevice(null);
  const updateDevices = (list)  => setDevices(list);

  // Update device status locally (will come from MQTT)
  const updateDeviceStatus = (deviceId, status) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, ...status } : d))
    );
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