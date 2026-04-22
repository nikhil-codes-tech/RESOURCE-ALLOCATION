// ─────────────────────────────────────────────────────────
// NG😊NE — Socket.io Client
// ─────────────────────────────────────────────────────────
import { io } from 'socket.io-client';

let socket = null;

/**
 * Connect to Socket.io server with JWT auth
 * @param {string} token - JWT access token
 * @returns {Socket}
 */
export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  const socketURL = import.meta.env.VITE_SOCKET_URL || 
    (import.meta.env.VITE_API_URL || '').replace('/api', '') || 
    window.location.origin;

  socket = io(socketURL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ Socket error:', err.message);
  });

  // ── Real-time event listeners ────────────────────────
  socket.on('crisis:new', (data) => {
    console.log('🚨 New crisis alert:', data);
  });

  socket.on('team:invite', (data) => {
    console.log('📩 Team invite:', data);
  });

  socket.on('notification', (data) => {
    console.log('🔔 Notification:', data);
  });

  socket.on('chat:message', (data) => {
    console.log('💬 Chat message:', data);
  });

  return socket;
};

/**
 * Get the current socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Emit an event to the server
 * @param {string} event
 * @param {*} data
 */
export const emitEvent = (event, data) => {
  if (socket?.connected) {
    socket.emit(event, data);
  }
};
