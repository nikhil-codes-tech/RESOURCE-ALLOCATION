import nodemailer from 'nodemailer';
import { SESClient } from '@aws-sdk/client-ses';
import logger from '../utils/logger.js';

let transporter;

/**
 * Initialize the email transporter
 * Uses AWS SES in production, console log in development
 */
function createTransporter() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const ses = new SESClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    transporter = nodemailer.createTransport({
      SES: { ses, aws: { SESClient } },
      sendingRate: 14, // max 14/second SES limit
    });

    logger.info('✅ AWS SES email transporter initialized');
  } else {
    // Development fallback — log to console
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });

    logger.warn('⚠️  AWS SES not configured — emails will be logged to console');
  }

  return transporter;
}

/**
 * Send an email
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 * @param {string} [options.text] - Plain text fallback
 * @param {Array} [options.attachments] - Email attachments
 * @returns {Promise<object>}
 */
export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!transporter) {
    createTransporter();
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'NGone Platform'}" <${process.env.EMAIL_FROM || 'hello@ngone.in'}>`,
    to,
    subject,
    html,
    text: text || subject,
    attachments: attachments || [],
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    // In development, log the email content
    if (!process.env.AWS_ACCESS_KEY_ID) {
      logger.info(`📧 Email (dev mode):\n  To: ${to}\n  Subject: ${subject}`);
    } else {
      logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
    }

    return info;
  } catch (error) {
    logger.error(`❌ Email send failed to ${to}: ${error.message}`);
    throw error;
  }
}

/**
 * Verify SES connection
 * @returns {Promise<boolean>}
 */
export async function verifySESConnection() {
  if (!transporter) {
    createTransporter();
  }
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    logger.warn(`SES verification failed: ${error.message}`);
    return false;
  }
}

export { transporter, createTransporter };
export default { sendEmail, verifySESConnection, createTransporter };
