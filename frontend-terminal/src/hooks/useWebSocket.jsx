import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return 'http://localhost:3001';

  return `${window.location.protocol}//${window.location.hostname}:3001`;
};

const API_URL = getApiUrl();

let sharedSocket = null; // single connection shared across all hook instances

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 20,
      });
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    sharedSocket.on('connect', onConnect);
    sharedSocket.on('disconnect', onDisconnect);

    if (sharedSocket.connected) setIsConnected(true);

    return () => {
      sharedSocket.off('connect', onConnect);
      sharedSocket.off('disconnect', onDisconnect);
    };
  }, []);

  const emit = useCallback((event, data, callback) => {
    if (sharedSocket?.connected) {
      sharedSocket.emit(event, data, callback);
    }
  }, []);

  const on = useCallback((event, callback) => {
    sharedSocket?.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    sharedSocket?.off(event, callback);
  }, []);

  return { emit, on, off, isConnected };
};

export default useWebSocket;
