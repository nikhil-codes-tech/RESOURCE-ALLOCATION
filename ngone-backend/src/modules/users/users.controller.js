import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as usersService from './users.service.js';

export const getUser = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  successResponse(res, 200, 'User fetched', { user });
});

export const listUsers = catchAsync(async (req, res) => {
  const result = await usersService.listUsers(req.query);
  successResponse(res, 200, 'Users fetched', { users: result.users }, result.meta);
});

export const updateProfile = catchAsync(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  successResponse(res, 200, 'Profile updated', { user });
});

export const updateAvatar = catchAsync(async (req, res) => {
  const result = await usersService.updateAvatar(req.user.id, req.uploadedFile.url);
  successResponse(res, 200, 'Avatar updated', result);
});

export const deactivateAccount = catchAsync(async (req, res) => {
  const result = await usersService.deactivateAccount(req.user.id);
  successResponse(res, 200, result.message);
});

export default { getUser, listUsers, updateProfile, updateAvatar, deactivateAccount };
