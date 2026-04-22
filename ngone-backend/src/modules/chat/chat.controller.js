import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as chatService from './chat.service.js';

export const getMessages = catchAsync(async (req, res) => {
  const result = await chatService.getMessages(req.params.teamId, req.user.id, req.query);
  successResponse(res, 200, 'Messages fetched', { messages: result.messages }, result.meta);
});

export const sendMessage = catchAsync(async (req, res) => {
  const message = await chatService.sendMessage(req.params.teamId, req.user.id, req.body);
  successResponse(res, 201, 'Message sent', { message });
});

export const uploadFile = catchAsync(async (req, res) => {
  const message = await chatService.uploadFile(
    req.params.teamId, req.user.id,
    req.uploadedFile.url, req.file.originalname
  );
  successResponse(res, 201, 'File uploaded', { message });
});

export const editMessage = catchAsync(async (req, res) => {
  const message = await chatService.editMessage(req.params.id, req.user.id, req.body.content);
  successResponse(res, 200, 'Message edited', { message });
});

export const deleteMessage = catchAsync(async (req, res) => {
  await chatService.deleteMessage(req.params.id, req.user.id);
  successResponse(res, 200, 'Message deleted');
});

export const getMembers = catchAsync(async (req, res) => {
  const members = await chatService.getOnlineMembers(req.params.teamId, req.user.id);
  successResponse(res, 200, 'Members fetched', { members });
});

export const markRead = catchAsync(async (req, res) => {
  await chatService.markRead(req.params.teamId, req.user.id, req.body.lastMessageId);
  successResponse(res, 200, 'Messages marked as read');
});

export default { getMessages, sendMessage, uploadFile, editMessage, deleteMessage, getMembers, markRead };
