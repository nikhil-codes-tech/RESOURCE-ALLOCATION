import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as teamsService from './teams.service.js';

export const listOpen = catchAsync(async (req, res) => {
  const result = await teamsService.listOpenTeams(req.query);
  successResponse(res, 200, 'Open teams fetched', { teams: result.teams }, result.meta);
});

export const getMyTeams = catchAsync(async (req, res) => {
  const teams = await teamsService.getMyTeams(req.user.id);
  successResponse(res, 200, 'My teams fetched', { teams });
});

export const getTeam = catchAsync(async (req, res) => {
  const team = await teamsService.getTeamById(req.params.id);
  successResponse(res, 200, 'Team fetched', { team });
});

export const createTeam = catchAsync(async (req, res) => {
  const team = await teamsService.createTeam(req.user.id, req.body);
  successResponse(res, 201, 'Team created', { team });
});

export const joinTeam = catchAsync(async (req, res) => {
  const result = await teamsService.joinTeam(req.params.id, req.user.id);
  successResponse(res, 200, result.message);
});

export const leaveTeam = catchAsync(async (req, res) => {
  const result = await teamsService.leaveTeam(req.params.id, req.user.id);
  successResponse(res, 200, result.message);
});

export const invite = catchAsync(async (req, res) => {
  const invite = await teamsService.inviteVolunteer(req.params.id, req.user.id, req.body.volunteerId, req.body.message);
  successResponse(res, 201, 'Invite sent', { invite });
});

export const respondInvite = catchAsync(async (req, res) => {
  const result = await teamsService.respondToInvite(req.params.id, req.user.id, req.body.action);
  successResponse(res, 200, result.message);
});

export const getPendingInvites = catchAsync(async (req, res) => {
  const invites = await teamsService.getPendingInvites(req.user.id);
  successResponse(res, 200, 'Pending invites fetched', { invites });
});

export const getMembers = catchAsync(async (req, res) => {
  const members = await teamsService.getTeamMembers(req.params.id);
  successResponse(res, 200, 'Members fetched', { members });
});

export const kickMember = catchAsync(async (req, res) => {
  const result = await teamsService.kickMember(req.params.id, req.params.vid, req.user.id);
  successResponse(res, 200, result.message);
});

export const transferLeader = catchAsync(async (req, res) => {
  const result = await teamsService.transferLeadership(req.params.id, req.body.volunteerId, req.user.id);
  successResponse(res, 200, result.message);
});

export default {
  listOpen, getMyTeams, getTeam, createTeam, joinTeam, leaveTeam,
  invite, respondInvite, getPendingInvites, getMembers, kickMember, transferLeader,
};
