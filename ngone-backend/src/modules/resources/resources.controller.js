import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as resourcesService from './resources.service.js';

export const listResources = catchAsync(async (req, res) => {
  const result = await resourcesService.listResources(req.query);
  successResponse(res, 200, 'Resources fetched', { resources: result.resources }, result.meta);
});

export const getResource = catchAsync(async (req, res) => {
  const resource = await resourcesService.getResourceById(req.params.id);
  successResponse(res, 200, 'Resource fetched', { resource });
});

export const createResource = catchAsync(async (req, res) => {
  const resource = await resourcesService.createResource(req.user.id, req.body);
  successResponse(res, 201, 'Resource created', { resource });
});

export const updateResource = catchAsync(async (req, res) => {
  const resource = await resourcesService.updateResource(req.params.id, req.user.id, req.body);
  successResponse(res, 200, 'Resource updated', { resource });
});

export const allocateResource = catchAsync(async (req, res) => {
  const resource = await resourcesService.allocateResource(req.params.id, req.user.id, req.body.quantity);
  successResponse(res, 200, 'Resource allocated', { resource });
});

export const deleteResource = catchAsync(async (req, res) => {
  await resourcesService.deleteResource(req.params.id, req.user.id);
  successResponse(res, 200, 'Resource deactivated');
});

export const getStats = catchAsync(async (req, res) => {
  const stats = await resourcesService.getResourceStats(req.params.ngoId);
  successResponse(res, 200, 'Resource stats fetched', { stats });
});

export default { listResources, getResource, createResource, updateResource, allocateResource, deleteResource, getStats };
