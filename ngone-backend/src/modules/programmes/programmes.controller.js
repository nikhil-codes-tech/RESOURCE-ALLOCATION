import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as programmesService from './programmes.service.js';

export const list = catchAsync(async (req, res) => {
  const result = await programmesService.listProgrammes(req.query);
  successResponse(res, 200, 'Programmes fetched', { programmes: result.programmes }, result.meta);
});

export const get = catchAsync(async (req, res) => {
  const programme = await programmesService.getProgrammeById(req.params.id);
  successResponse(res, 200, 'Programme fetched', { programme });
});

export const create = catchAsync(async (req, res) => {
  const programme = await programmesService.createProgramme(req.user.id, req.body);
  successResponse(res, 201, 'Programme created', { programme });
});

export const update = catchAsync(async (req, res) => {
  const programme = await programmesService.updateProgramme(req.params.id, req.user.id, req.body);
  successResponse(res, 200, 'Programme updated', { programme });
});

export const remove = catchAsync(async (req, res) => {
  await programmesService.deleteProgramme(req.params.id, req.user.id);
  successResponse(res, 200, 'Programme deactivated');
});

export default { list, get, create, update, remove };
