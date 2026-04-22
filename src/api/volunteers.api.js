// ─────────────────────────────────────────────────────────
// NG😊NE — Volunteers API Service
// ─────────────────────────────────────────────────────────
import api from './client.js';

export const getMyProfile    = ()      => api.get('/volunteers/me');
export const getNearby       = (p)     => api.get('/volunteers/nearby', { params: p });
export const getLeaderboard  = ()      => api.get('/volunteers/leaderboard');
export const updateSkills    = (s)     => api.put('/volunteers/me/skills', { skills: s });
export const updateLocation  = (p)     => api.put('/volunteers/me/location', p);
export const setOnline       = (s)     => api.put('/volunteers/me/online', { isOnline: s });
export const checkIn         = (id, data) => api.post('/volunteers/check-in', { taskId: id, ...data });
export const checkOut        = (d)     => api.post('/volunteers/check-out', d);
export const getMyBadges     = ()      => api.get('/volunteers/me/badges');
export const getMyStats      = ()      => api.get('/volunteers/me/stats');
