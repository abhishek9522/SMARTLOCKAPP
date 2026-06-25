import axios from 'axios';
import { ESP32_BASE_URL } from '../utils/constants';

// Axios instance with timeout
const esp32 = axios.create({
  baseURL: ESP32_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});

// ─── Device Info Fetch ────────────────────────────────────────
// Get device_id and pair_code from ESP32
export const getDeviceInfo = async () => {
  try {
    const response = await esp32.get('/');
    // Response: { device_id: "SL-A1B2C3", pair_code: "483921", api: "POST /config" }
    return response.data;
  } catch (error) {
    console.error('ESP32 getDeviceInfo error:', error.message);
    throw new Error('Cannot connect to ESP32. Check your hotspot!');
  }
};

// ─── Send WiFi + MQTT Config ──────────────────────────────────
// Send home WiFi and MQTT broker info to ESP32
export const sendConfig = async ({ ssid, pass }) => {
  try {
    const response = await esp32.get(
      `/setup?ssid=${encodeURIComponent(ssid)}&pass=${encodeURIComponent(pass)}`
    );
    return response.data;
  } catch (error) {
    console.error('ESP sendConfig error:', error.message);
    throw new Error('Error sending config! Are you connected to ESP hotspot?');
  }
};

// ─── Device Status Check ──────────────────────────────────────
// Check if ESP32 is still in AP mode or not
export const pingDevice = async () => {
  try {
    const response = await esp32.get('/ping');
    return response.status === 200;
  } catch {
    return false;
  }
};