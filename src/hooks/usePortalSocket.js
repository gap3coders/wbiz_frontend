import { useEffect } from 'react';
import { io } from 'socket.io-client';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (API_BASE.startsWith('http')) {
    return API_BASE.replace(/\/api\/v1$/i, '').replace(/\/api$/i, '');
  }

  return window.location.origin;
};

export default function usePortalSocket({
  enabled = true,
  onConversationUpdated,
  onMessageStatus,
  onConnected,
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const token = localStorage.getItem('access_token');
    if (!token) return undefined;

    const socket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      auth: { token },
      withCredentials: true,
    });

    if (onConnected) {
      socket.on('portal:connected', onConnected);
    }

    if (onConversationUpdated) {
      socket.on('conversation:updated', onConversationUpdated);
    }

    if (onMessageStatus) {
      socket.on('message:status', onMessageStatus);
    }

    return () => {
      if (onConnected) socket.off('portal:connected', onConnected);
      if (onConversationUpdated) socket.off('conversation:updated', onConversationUpdated);
      if (onMessageStatus) socket.off('message:status', onMessageStatus);
      socket.disconnect();
    };
  }, [enabled, onConnected, onConversationUpdated, onMessageStatus]);
}
