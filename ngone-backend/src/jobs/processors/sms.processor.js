import logger from '../../utils/logger.js';

/**
 * Send SMS via MSG91 (primary — India)
 */
async function sendViaMSG91(phone, templateId, variables) {
  if (!process.env.MSG91_AUTH_KEY) {
    logger.warn('MSG91 not configured — SMS skipped');
    return null;
  }

  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': process.env.MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId || process.env.MSG91_OTP_TEMPLATE_ID,
        sender: process.env.MSG91_SENDER_ID || 'NGONE',
        short_url: '0',
        mobiles: `91${phone}`,
        ...variables,
      }),
    });
    const data = await response.json();
    logger.info(`MSG91 SMS sent to ${phone}: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    logger.error(`MSG91 SMS failed: ${error.message}`);
    throw error;
  }
}

/**
 * Send SMS via Twilio (fallback)
 */
async function sendViaTwilio(phone, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.warn('Twilio not configured — SMS skipped');
    return null;
  }

  try {
    const { default: twilio } = await import('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: `+91${phone}`,
    });

    logger.info(`Twilio SMS sent to ${phone}: ${result.sid}`);
    return result;
  } catch (error) {
    logger.error(`Twilio SMS failed: ${error.message}`);
    throw error;
  }
}

/**
 * Process SMS jobs from Bull queue
 */
export default function processSMSJobs(smsQueue) {
  smsQueue.process(async (job) => {
    const { type, phone, code, message } = job.data.phone ? job.data : { type: job.name, ...job.data };
    const smsType = type || job.name;

    if (process.env.ENABLE_SMS === 'false') {
      logger.info(`SMS disabled — would send ${smsType} to ${phone}`);
      return;
    }

    logger.info(`Processing SMS job: ${smsType} → ${phone}`);

    let smsMessage;

    switch (smsType) {
      case 'otp_sms':
        smsMessage = `Your NGone OTP is ${code}. Valid for 5 mins. Do not share. -NGONE`;
        break;
      case 'team_invite_sms':
        smsMessage = message || `You've been invited to join a team on NGone! -NGONE`;
        break;
      case 'crisis_alert_sms':
        smsMessage = message || 'URGENT: Volunteers needed. Open NGone app. -NGONE';
        break;
      case 'team_complete':
        smsMessage = message || 'Your NGone team is complete! -NGONE';
        break;
      case 'checkin_confirm':
        smsMessage = message || 'Checked in successfully. Keep it up! -NGONE';
        break;
      default:
        smsMessage = message || 'You have a new notification from NGone. -NGONE';
    }

    // Try MSG91 first (primary), then Twilio (fallback)
    try {
      if (smsType === 'otp_sms') {
        await sendViaMSG91(phone, process.env.MSG91_OTP_TEMPLATE_ID, { otp: code });
      } else {
        await sendViaMSG91(phone, null, { message: smsMessage });
      }
    } catch (msg91Error) {
      logger.warn(`MSG91 failed, falling back to Twilio: ${msg91Error.message}`);
      try {
        await sendViaTwilio(phone, smsMessage);
      } catch (twilioError) {
        logger.error(`Both SMS providers failed for ${phone}: ${twilioError.message}`);
        throw twilioError;
      }
    }
  });

  logger.info('✅ SMS processor registered');
}
