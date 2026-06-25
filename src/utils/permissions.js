import { Platform, PermissionsAndroid, Alert } from 'react-native';

// On Android, WiFi requires location permission
export const requestWifiPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      PermissionsAndroid.PERMISSIONS.CHANGE_NETWORK_STATE,
      PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
    ]);

    const allGranted = Object.values(granted).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        'Permission Required',
        'Please grant WiFi and Location permissions — required for device pairing.',
        [{ text: 'OK' }]
      );
    }

    return allGranted;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};