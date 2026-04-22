import { emailQueue, smsQueue, matchQueue, notificationQueue } from '../config/queue.js';
import processEmailJobs from './processors/email.processor.js';
import processSMSJobs from './processors/sms.processor.js';
import processMatchJobs from './processors/match.processor.js';
import { pushNotification } from '../socket/notification.socket.js';
import logger from '../utils/logger.js';

/**
 * Register all Bull job processors
 * @param {import('socket.io').Server} io - Socket.io instance for real-time notifications
 */
export function registerProcessors(io) {
  // Email processor
  processEmailJobs(emailQueue);

  // SMS processor
  processSMSJobs(smsQueue);

  // Volunteer matching processor
  processMatchJobs(matchQueue, io);

  // Notification processor — handles crisis alerts and general notifications
  notificationQueue.process(async (job) => {
    const { type, userId, volunteerId, crisisId, crisisTitle, distance, urgency } = job.data;

    switch (type || job.name) {
      case 'crisis_alert': {
        if (userId && io) {
          await pushNotification(io, userId, {
            type: 'crisis_alert',
            title: `🆘 ${crisisTitle || 'Crisis Alert'}`,
            body: `Urgency: ${urgency}. Distance: ${distance} km. Your help is needed!`,
            data: { crisisId, distance, urgency },
          });
        }
        break;
      }

      default:
        logger.warn(`Unknown notification job type: ${type || job.name}`);
    }
  });

  logger.info('✅ All job processors registered');
}

export default { registerProcessors };
