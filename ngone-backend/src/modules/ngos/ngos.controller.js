import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as ngosService from './ngos.service.js';

export const listNGOs = catchAsync(async (req, res) => {
  const result = await ngosService.listNGOs(req.query);
  successResponse(res, 200, 'NGOs fetched', { ngos: result.ngos }, result.meta);
});

export const getLeaderboard = catchAsync(async (req, res) => {
  const result = await ngosService.getLeaderboard(req.query);
  successResponse(res, 200, 'NGO leaderboard fetched', { ngos: result.ngos }, result.meta);
});

export const getMyNGO = catchAsync(async (req, res) => {
  const ngo = await ngosService.getMyNGO(req.user.id);
  successResponse(res, 200, 'NGO profile fetched', { ngo });
});

export const getNGO = catchAsync(async (req, res) => {
  const ngo = await ngosService.getNGOById(req.params.id);
  successResponse(res, 200, 'NGO fetched', { ngo });
});

export const createNGO = catchAsync(async (req, res) => {
  const ngo = await ngosService.createNGO(req.user.id, req.body);
  successResponse(res, 201, 'NGO created', { ngo });
});

export const updateNGO = catchAsync(async (req, res) => {
  const ngo = await ngosService.updateNGO(req.user.id, req.body);
  successResponse(res, 200, 'NGO updated', { ngo });
});

export const uploadLogo = catchAsync(async (req, res) => {
  const ngo = await ngosService.updateLogo(req.user.id, req.uploadedFile.url);
  successResponse(res, 200, 'Logo updated', { ngo });
});

export const getImpact = catchAsync(async (req, res) => {
  const impact = await ngosService.getImpact(req.params.id);
  successResponse(res, 200, 'Impact stats fetched', { impact });
});

export const getNGOCrises = catchAsync(async (req, res) => {
  const result = await ngosService.getNGOCrises(req.params.id, req.query);
  successResponse(res, 200, 'NGO crises fetched', { crises: result.crises }, result.meta);
});

export const getNGOProgrammes = catchAsync(async (req, res) => {
  const result = await ngosService.getNGOProgrammes(req.params.id, req.query);
  successResponse(res, 200, 'NGO programmes fetched', { programmes: result.programmes }, result.meta);
});

export const verifyDarpan = catchAsync(async (req, res) => {
  const ngo = await ngosService.getMyNGO(req.user.id);
  const result = await ngosService.verifyDarpan(ngo.id, req.body.darpanId);
  successResponse(res, 200, 'DARPAN verification submitted', result);
});

export const recalculateImpact = catchAsync(async (req, res) => {
  const ngo = await ngosService.getMyNGO(req.user.id);
  const result = await ngosService.recalculateImpactScore(ngo.id);
  successResponse(res, 200, 'Impact score recalculated', result);
});

export default {
  listNGOs, getLeaderboard, getMyNGO, getNGO, createNGO, updateNGO,
  uploadLogo, getImpact, getNGOCrises, getNGOProgrammes, verifyDarpan, recalculateImpact,
};
