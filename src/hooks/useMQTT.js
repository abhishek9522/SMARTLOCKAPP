import { useEffect, useRef } from 'react';
import { connectMQTT, disconnectMQTT } from '../api/mqttService';

export const useMQTT = (deviceId, onMessage) => {
  const callbackRef = useRef(onMessage);

  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!deviceId) return;

    connectMQTT(deviceId, (topic, payload) => {
      if (callbackRef.current) callbackRef.current(topic, payload);
    });

    return () => disconnectMQTT();
  }, [deviceId]);
};