// ─── ESP Local API ────────────────────────────────────────────
export const ESP32_BASE_URL      = 'http://192.168.4.1';
export const ESP32_HOTSPOT_PREFIX = 'SMART_LOCK_SETUP_';

// ─── MQTT ─────────────────────────────────────────────────────
export const MQTT_HOST     = 'broker.hivemq.com';
export const MQTT_PORT     = 1883;
export const MQTT_PORT_DEV = 1883;

export const MQTT_TOPICS = {
  CMD:    (deviceId) => `umlock/${deviceId}/cmd`,
  STATUS: (deviceId) => `umlock/${deviceId}/status`,
  LOG:    (deviceId) => `umlock/${deviceId}/log`,
};

export const MQTT_COMMANDS = {
  UNLOCK:     'unlock',
  LOCK:       'lock',
  RESTART:    'restart',
  GET_STATUS: 'get_status',
};

// ─── User Roles ───────────────────────────────────────────────
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  USER:  'user',
  GUEST: 'guest',
};

// ─── Device Status ────────────────────────────────────────────
export const DEVICE_STATUS = {
  ONLINE:         'ONLINE',
  OFFLINE:        'OFFLINE',
  LOCKED:         'LOCKED',
  UNLOCKED:       'UNLOCKED',
  UNLOCKING:      'UNLOCKING',
  AP_MODE:        'ap_mode',
  WIFI_CONNECTED: 'wifi_connected',
  WIFI_FAILED:    'wifi_failed',
};

// ─── Access Sources ───────────────────────────────────────────
export const ACCESS_SOURCE = {
  APP:         'APP',
  RFID:        'RFID',
  FINGERPRINT: 'FINGER',
  PIN:         'PIN',
};

// ─── Timeouts ─────────────────────────────────────────────────
export const UNLOCK_TIMEOUT_MS = 5000;
export const PAIR_CODE_LENGTH  = 6;