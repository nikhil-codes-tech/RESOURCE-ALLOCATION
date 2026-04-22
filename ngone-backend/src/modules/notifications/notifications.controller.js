import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as notificationsService from './notifications.service.js';

export const list = catchAsync(async (req, res) => {
  const result = await notificationsService.listNotifications(req.user.id, req.query);
  successResponse(res, 200, 'Notifications fetched', {
    notifications: result.notifications,
    unreadCount: result.unreadCount,
  }, result.meta);
});

export const markRead = catchAsync(async (req, res) => {
  const result = await notificationsService.markAsRead(req.user.id, req.body.notificationIds);
  successResponse(res, 200, 'Notifications marked as read', result);
});

export const getUnreadCount = catchAsync(async (req, res) => {
  const result = await notificationsService.getUnreadCount(req.user.id);
  successResponse(res, 200, 'Unread count', result);
});

export const remove = catchAsync(async (req, res) => {
  await notificationsService.deleteNotification(req.params.id, req.user.id);
  successResponse(res, 200, 'Notification deleted');
});

export default { list, markRead, getUnreadCount, remove };
