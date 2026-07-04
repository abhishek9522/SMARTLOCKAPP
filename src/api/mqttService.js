import mqtt from 'mqtt';
import { MQTT_TOPICS } from '../utils/constants';

let client          = null;
let messageCallback = null;
let currentDeviceId = null;

export const connectMQTT = (deviceId, onMessage) => {
  // Pehle se connected hai aur same device hai
  if (client && client.connected && currentDeviceId === deviceId) {
    messageCallback = onMessage;
    return;
  }

  // Purana connection band karo
  if (client) {
    client.end(true);
    client = null;
  }

  currentDeviceId = deviceId;
  messageCallback = onMessage;

  const clientId = `smartlock_${deviceId}_${Date.now()}`;

  // WSS port 8884 use karo — HiveMQ public broker
  client = mqtt.connect(`wss://broker.hivemq.com:8884/mqtt`, {
    clientId,
    clean:           true,
    reconnectPeriod: 3000,
    connectTimeout:  10000,
    protocol:        'wss',
  });

  client.on('connect', () => {
    console.log('✅ MQTT Connected!');
    client.subscribe(MQTT_TOPICS.STATUS(deviceId));
    client.subscribe(MQTT_TOPICS.LOG(deviceId));
  });

  client.on('message', (topic, payload) => {
    if (messageCallback) {
      messageCallback(topic, payload.toString());
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
  });

  client.on('close', () => {
    console.log('🔌 MQTT Disconnected');
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT Reconnecting...');
  });
};

export const sendCommand = (deviceId, command) => {
  if (!client || !client.connected) {
    console.warn('⚠️ MQTT not connected!');
    return false;
  }
  const topic = MQTT_TOPICS.CMD(deviceId);
  client.publish(topic, command);
  console.log(`📤 MQTT: ${topic} → ${command}`);
  return true;
};

export const disconnectMQTT = () => {
  if (client) {
    client.end(true);
    client = null;
  }
  messageCallback  = null;
  currentDeviceId  = null;
};

export const isMQTTConnected = () => {
  return client !== null && client.connected;
};