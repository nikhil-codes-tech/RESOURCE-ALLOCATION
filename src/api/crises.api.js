// ─────────────────────────────────────────────────────────
// NG😊NE — Crises API Service
// ─────────────────────────────────────────────────────────
import api from './client.js';

export const getCrises       = (p)      => api.get('/crises', { params: p });
export const getCrisisMap    = ()       => api.get('/crises/map');
export const getCrisis       = (id)     => api.get(`/crises/${id}`);
export const createCrisis    = (d)      => api.post('/crises', d);
export const updateCrisis    = (id, d)  => api.put(`/crises/${id}`, d);
export const updateStatus    = (id, s)  => api.put(`/crises/${id}/status`, { status: s });
export const dispatchVols    = (id)     => api.post(`/crises/${id}/dispatch`);
export const uploadImages    = (id, f)  => api.post(`/crises/${id}/images`, f, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
