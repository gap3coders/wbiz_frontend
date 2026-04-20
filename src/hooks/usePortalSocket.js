import { useEffect, useRef, useCallback } from 'react';
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

/**
 * Portal WebSocket hook.
 *
 * Authenticates via httpOnly cookie (withCredentials: true).
 * Supports all portal real-time events:
 *   - portal:connected
 *   - conversation:updated
 *   - message:status
 *   - campaign:progress
 *   - notification:new
 *   - inbox:unread
 */
export default function usePortalSocket({
  enabled = true,
  onConversationUpdated,
  onMessageStatus,
  onConnected,
  onCampaignProgress,
  onNotification,
  onInboxUnread,
}) {
  const socketRef = useRef(null);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return undefined;
    }

    const socket = io(resolveSocketUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true, // sends httpOnly cookies for auth
    });
    socketRef.current = socket;

    if (onConnected) socket.on('portal:connected', onConnected);
    if (onConversationUpdated) socket.on('conversation:updated', onConversationUpdated);
    if (onMessageStatus) socket.on('message:status', onMessageStatus);
    if (onCampaignProgress) socket.on('campaign:progress', onCampaignProgress);
    if (onNotification) socket.on('notification:new', onNotification);
    if (onInboxUnread) socket.on('inbox:unread', onInboxUnread);

    return () => {
      if (onConnected) socket.off('portal:connected', onConnected);
      if (onConversationUpdated) socket.off('conversation:updated', onConversationUpdated);
      if (onMessageStatus) socket.off('message:status', onMessageStatus);
      if (onCampaignProgress) socket.off('campaign:progress', onCampaignProgress);
      if (onNotification) socket.off('notification:new', onNotification);
      if (onInboxUnread) socket.off('inbox:unread', onInboxUnread);
      socket.disconnect();
    };
  }, [enabled, onConnected, onConversationUpdated, onMessageStatus, onCampaignProgress, onNotification, onInboxUnread, disconnect]);

  return { disconnect };
}
