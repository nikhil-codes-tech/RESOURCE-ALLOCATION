import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as crisesService from './crises.service.js';

export const listCrises = catchAsync(async (req, res) => {
  const result = await crisesService.listCrises(req.query);
  successResponse(res, 200, 'Crises fetched', { crises: result.crises }, result.meta);
});

export const getMapPins = catchAsync(async (req, res) => {
  const pins = await crisesService.getMapPins();
  successResponse(res, 200, 'Map pins fetched', { pins });
});

export const getNearby = catchAsync(async (req, res) => {
  const { lat, lng, radius } = req.query;
  const crises = await crisesService.getNearby(parseFloat(lat), parseFloat(lng), parseFloat(radius || 100));
  successResponse(res, 200, 'Nearby crises fetched', { crises });
});

export const getCrisis = catchAsync(async (req, res) => {
  const crisis = await crisesService.getCrisisById(req.params.id);
  successResponse(res, 200, 'Crisis fetched', { crisis });
});

export const createCrisis = catchAsync(async (req, res) => {
  const crisis = await crisesService.createCrisis(req.user.id, req.body);
  successResponse(res, 201, 'Crisis created', { crisis });
});

export const updateCrisis = catchAsync(async (req, res) => {
  const crisis = await crisesService.updateCrisis(req.params.id, req.user.id, req.body);
  successResponse(res, 200, 'Crisis updated', { crisis });
});

export const updateStatus = catchAsync(async (req, res) => {
  const crisis = await crisesService.updateStatus(req.params.id, req.user.id, req.body.status);
  successResponse(res, 200, 'Crisis status updated', { crisis });
});

export const uploadImages = catchAsync(async (req, res) => {
  const urls = req.uploadedFiles.map((f) => f.url);
  const crisis = await crisesService.uploadImages(req.params.id, req.user.id, urls);
  successResponse(res, 200, 'Images uploaded', { crisis });
});

export const dispatch = catchAsync(async (req, res) => {
  const volunteers = await crisesService.dispatchVolunteers(req.params.id);
  successResponse(res, 200, `Dispatched ${volunteers.length} volunteers`, { volunteers });
});

export const getVolunteers = catchAsync(async (req, res) => {
  const volunteers = await crisesService.getCrisisVolunteers(req.params.id);
  successResponse(res, 200, 'Crisis volunteers fetched', { volunteers });
});

export const deleteCrisis = catchAsync(async (req, res) => {
  await crisesService.softDelete(req.params.id);
  successResponse(res, 200, 'Crisis deleted');
});

export default {
  listCrises, getMapPins, getNearby, getCrisis, createCrisis,
  updateCrisis, updateStatus, uploadImages, dispatch, getVolunteers, deleteCrisis,
};
