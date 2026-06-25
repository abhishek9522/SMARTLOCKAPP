import mqtt from 'mqtt';
import { MQTT_HOST, MQTT_PORT, MQTT_TOPICS } from '../utils/constants';

let client = null;
let messageCallback = null;

export const connectMQTT = (deviceId, onMessage) => {
  messageCallback = onMessage;

  const clientId = `smartlock_${deviceId}_${Date.now()}`;

  // Connect using WebSocket
  client = mqtt.connect(`ws://broker.hivemq.com:8000/mqtt`, {
    clientId,
    clean: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('MQTT Connected!');
    client.subscribe(MQTT_TOPICS.STATUS(deviceId));
    client.subscribe(MQTT_TOPICS.LOG(deviceId));
  });

  client.on('message', (topic, payload) => {
    if (messageCallback) messageCallback(topic, payload.toString());
  });

  client.on('error', (err) => {
    console.error('MQTT Error:', err);
  });

  client.on('close', () => {
    console.log('MQTT Disconnected');
  });
};

export const sendCommand = (deviceId, command) => {
  if (!client || !client.connected) {
    console.warn('MQTT not connected!');
    return false;
  }
  client.publish(MQTT_TOPICS.CMD(deviceId), command);
  return true;
};

export const disconnectMQTT = () => {
  if (client) {
    client.end();
    client = null;
  }
  messageCallback = null;
};

export const isMQTTConnected = () => {
  return client !== null && client.connected;
};