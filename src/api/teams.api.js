// ─────────────────────────────────────────────────────────
// NG😊NE — Teams API Service
// ─────────────────────────────────────────────────────────
import api from './client.js';

export const getOpenTeams     = ()       => api.get('/teams');
export const getMyTeams       = ()       => api.get('/teams/me');
export const getTeam          = (id)     => api.get(`/teams/${id}`);
export const createTeam       = (d)      => api.post('/teams', d);
export const joinTeam         = (id)     => api.post(`/teams/${id}/join`);
export const leaveTeam        = (id)     => api.post(`/teams/${id}/leave`);
export const inviteVolunteer  = (id, d)  => api.post(`/teams/${id}/invite`, d);
export const respondInvite    = (id, a)  => api.put(`/teams/invites/${id}`, { action: a });
export const getPendingInvites = ()      => api.get('/teams/invites/pending');
