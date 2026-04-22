import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as volunteersService from './volunteers.service.js';

export const listVolunteers = catchAsync(async (req, res) => {
  const result = await volunteersService.listVolunteers(req.query);
  successResponse(res, 200, 'Volunteers fetched', { volunteers: result.volunteers }, result.meta);
});

export const getNearby = catchAsync(async (req, res) => {
  const volunteers = await volunteersService.findNearbyVolunteers(req.query);
  successResponse(res, 200, 'Nearby volunteers fetched', { volunteers });
});

export const getLeaderboard = catchAsync(async (req, res) => {
  const result = await volunteersService.getLeaderboard(req.query);
  successResponse(res, 200, 'Leaderboard fetched', { volunteers: result.volunteers }, result.meta);
});

export const getMyProfile = catchAsync(async (req, res) => {
  const volunteer = await volunteersService.getMyProfile(req.user.id);
  successResponse(res, 200, 'Profile fetched', { volunteer });
});

export const getVolunteer = catchAsync(async (req, res) => {
  const volunteer = await volunteersService.getVolunteerById(req.params.id);
  successResponse(res, 200, 'Volunteer fetched', { volunteer });
});

export const updateSkills = catchAsync(async (req, res) => {
  const volunteer = await volunteersService.updateSkills(req.user.id, req.body.skills);
  successResponse(res, 200, 'Skills updated', { volunteer });
});

export const updateAvailability = catchAsync(async (req, res) => {
  const volunteer = await volunteersService.updateAvailability(req.user.id, req.body.availability);
  successResponse(res, 200, 'Availability updated', { volunteer });
});

export const updateLocation = catchAsync(async (req, res) => {
  const volunteer = await volunteersService.updateLocation(req.user.id, req.body.latitude, req.body.longitude);
  successResponse(res, 200, 'Location updated', { volunteer });
});

export const updateOnline = catchAsync(async (req, res) => {
  const volunteer = await volunteersService.updateOnlineStatus(req.user.id, req.body.isOnline);
  successResponse(res, 200, 'Online status updated', { volunteer });
});

export const getBadges = catchAsync(async (req, res) => {
  const badges = await volunteersService.getBadges(req.user.id);
  successResponse(res, 200, 'Badges fetched', { badges });
});

export const getMyTasks = catchAsync(async (req, res) => {
  const tasks = await volunteersService.getMyTasks(req.user.id);
  successResponse(res, 200, 'Tasks fetched', { tasks });
});

export const checkIn = catchAsync(async (req, res) => {
  const result = await volunteersService.checkIn(req.user.id, req.body.taskId, req.body.latitude, req.body.longitude);
  successResponse(res, 200, 'Checked in successfully', result);
});

export const checkOut = catchAsync(async (req, res) => {
  const result = await volunteersService.checkOut(req.user.id, req.body.taskId, req.body.notes);
  successResponse(res, 200, 'Checked out successfully', result);
});

export const getStats = catchAsync(async (req, res) => {
  const stats = await volunteersService.getStats(req.user.id);
  successResponse(res, 200, 'Stats fetched', { stats });
});

export default {
  listVolunteers, getNearby, getLeaderboard, getMyProfile, getVolunteer,
  updateSkills, updateAvailability, updateLocation, updateOnline,
  getBadges, getMyTasks, checkIn, checkOut, getStats,
};
