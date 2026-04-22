import { Router } from 'express';
import * as donationsController from './donations.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { donationLimiter } from '../../middleware/rateLimiter.js';
import { createDonationSchema, verifyPaymentSchema } from './donations.schema.js';

const router = Router();

/**
 * @swagger
 * /api/donations:
 *   get:
 *     summary: List all donations (paginated)
 *     tags: [Donations]
 */
router.get('/', donationsController.listDonations);

/**
 * @swagger
 * /api/donations/me:
 *   get:
 *     summary: Get my donation history
 *     tags: [Donations]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', protect, donationsController.getMyDonations);

/**
 * @swagger
 * /api/donations/create-order:
 *   post:
 *     summary: Create a Razorpay donation order
 *     tags: [Donations]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/create-order', protect, donationLimiter, validate(createDonationSchema), donationsController.createDonation);

/**
 * @swagger
 * /api/donations/verify:
 *   post:
 *     summary: Verify Razorpay payment signature
 *     tags: [Donations]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/verify', protect, validate(verifyPaymentSchema), donationsController.verifyPayment);

/**
 * @swagger
 * /api/donations/webhook:
 *   post:
 *     summary: Razorpay webhook endpoint (no auth)
 *     tags: [Donations]
 */
router.post('/webhook', donationsController.webhook);

/**
 * @swagger
 * /api/donations/{id}:
 *   get:
 *     summary: Get donation details
 *     tags: [Donations]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', protect, donationsController.getDonation);

/**
 * @swagger
 * /api/donations/{id}/receipt:
 *   get:
 *     summary: Get donation receipt
 *     tags: [Donations]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/receipt', protect, donationsController.getReceipt);

export default router;
