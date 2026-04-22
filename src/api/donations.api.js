// ─────────────────────────────────────────────────────────
// NG😊NE — Donations API Service
// ─────────────────────────────────────────────────────────
import api from './client.js';

export const createOrder     = (d)     => api.post('/donations/create-order', d);
export const verifyPayment   = (d)     => api.post('/donations/verify', d);
export const getHistory      = ()      => api.get('/donations/history');
export const getReceipt      = (id)    => api.get(`/donations/${id}/receipt`, {
  responseType: 'blob',
});
export const getDonorStats   = ()      => api.get('/donations/stats');
export const getLeaderboard  = ()      => api.get('/donations/leaderboard');
