// ─────────────────────────────────────────────────────────
// NG😊NE — Chat API Service
// ─────────────────────────────────────────────────────────
import api from './client.js';

export const getMessages = (id, p) => api.get(`/chat/${id}/messages`, { params: p });
export const sendMessage = (id, d) => api.post(`/chat/${id}/messages`, d);
export const uploadFile  = (id, f) => api.post(`/chat/${id}/upload`, f, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const markRead    = (id, m) => api.post(`/chat/${id}/read`, { lastMessageId: m });
