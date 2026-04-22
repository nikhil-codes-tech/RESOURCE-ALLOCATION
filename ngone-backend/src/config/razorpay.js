import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '../utils/logger.js';

let razorpayInstance = null;

/**
 * Get Razorpay SDK instance (singleton)
 * @returns {Razorpay}
 */
export function getRazorpay() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      logger.warn('⚠️  Razorpay credentials not configured — payments disabled');
      return null;
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    logger.info('✅ Razorpay SDK initialized');
  }

  return razorpayInstance;
}

/**
 * Create a Razorpay order
 * @param {object} options
 * @param {number} options.amount - Amount in paise (₹100 = 10000)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.receipt - Receipt ID
 * @param {object} [options.notes] - Key-value notes
 * @returns {Promise<object>}
 */
export async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  const rp = getRazorpay();
  if (!rp) throw new Error('Razorpay not configured');

  const order = await rp.orders.create({
    amount: Math.round(amount * 100), // Convert to paise
    currency,
    receipt,
    notes,
    payment_capture: 1, // Auto-capture
  });

  logger.info(`Razorpay order created: ${order.id}, amount: ₹${amount}`);
  return order;
}

/**
 * Verify Razorpay payment signature (HMAC SHA256)
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature from callback
 * @returns {boolean}
 */
export function verifyPaymentSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * Verify Razorpay webhook signature
 * @param {string|Buffer} payload - Raw request body
 * @param {string} signature - X-Razorpay-Signature header
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : payload.toString())
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Fetch payment details
 * @param {string} paymentId
 * @returns {Promise<object>}
 */
export async function fetchPayment(paymentId) {
  const rp = getRazorpay();
  if (!rp) throw new Error('Razorpay not configured');
  return rp.payments.fetch(paymentId);
}

/**
 * Initiate a refund
 * @param {string} paymentId
 * @param {number} amount - Amount to refund in INR
 * @param {object} [notes]
 * @returns {Promise<object>}
 */
export async function initiateRefund(paymentId, amount, notes = {}) {
  const rp = getRazorpay();
  if (!rp) throw new Error('Razorpay not configured');

  const refund = await rp.payments.refund(paymentId, {
    amount: Math.round(amount * 100),
    notes,
  });

  logger.info(`Razorpay refund initiated: ${refund.id}, amount: ₹${amount}`);
  return refund;
}

export default { getRazorpay, createOrder, verifyPaymentSignature, verifyWebhookSignature, fetchPayment, initiateRefund };
