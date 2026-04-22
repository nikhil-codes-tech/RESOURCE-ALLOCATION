// ─────────────────────────────────────────────────────────
// NG😊NE — Razorpay Payment Integration
// ─────────────────────────────────────────────────────────
import { createOrder, verifyPayment } from '../api/donations.api.js';

/**
 * Dynamically load a script tag
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay checkout
 * @param {object} options
 * @param {number} options.amount - Amount in INR
 * @param {string} options.ngoId - NGO receiving the donation
 * @param {string} options.userName - Prefill name
 * @param {string} options.userEmail - Prefill email
 * @param {string} options.userPhone - Prefill phone
 * @param {string} options.type - ONE_TIME | MONTHLY
 * @returns {Promise<object>} - Verified payment data
 */
export const openRazorpay = async ({
  amount,
  ngoId,
  userName,
  userEmail,
  userPhone,
  type = 'ONE_TIME',
}) => {
  // 1. Create order on backend
  const { data } = await createOrder({ amount, ngoId, type });
  const orderId = data?.orderId || data?.order?.id;
  const orderAmount = data?.amount || amount * 100;

  // 2. Load Razorpay script
  await loadScript('https://checkout.razorpay.com/v1/checkout.js');

  // 3. Open checkout
  return new Promise((resolve, reject) => {
    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!rzpKey) {
      reject(new Error('Razorpay key not configured'));
      return;
    }

    const rzp = new window.Razorpay({
      key: rzpKey,
      amount: orderAmount,
      currency: 'INR',
      name: 'NG😊NE Platform',
      description: 'Donation for Community Impact',
      order_id: orderId,
      prefill: {
        name: userName || '',
        email: userEmail || '',
        contact: userPhone ? `+91${userPhone}` : '',
      },
      theme: { color: '#FF6B35' },
      handler: async (response) => {
        try {
          // 4. Verify payment on backend
          const { data: verified } = await verifyPayment({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          resolve(verified);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
    });

    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });

    rzp.open();
  });
};
