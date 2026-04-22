import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse } from '../../utils/apiResponse.js';
import * as donationsService from './donations.service.js';

export const createDonation = catchAsync(async (req, res) => {
  const result = await donationsService.createDonation(req.user.id, req.body);
  successResponse(res, 201, 'Donation order created', result);
});

export const verifyPayment = catchAsync(async (req, res) => {
  const result = await donationsService.verifyPayment(req.user.id, req.body);
  successResponse(res, 200, 'Payment verified successfully', { donation: result });
});

export const webhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const result = await donationsService.handleWebhook(JSON.stringify(req.body), signature);
  successResponse(res, 200, 'Webhook processed', result);
});

export const listDonations = catchAsync(async (req, res) => {
  const result = await donationsService.listDonations(req.query);
  successResponse(res, 200, 'Donations fetched successfully', { donations: result.donations }, result.meta);
});

export const getMyDonations = catchAsync(async (req, res) => {
  const result = await donationsService.getMyDonations(req.user.id);
  successResponse(res, 200, 'My donations fetched', result);
});

export const getDonation = catchAsync(async (req, res) => {
  const donation = await donationsService.getDonationById(req.params.id);
  successResponse(res, 200, 'Donation fetched', { donation });
});

export const getReceipt = catchAsync(async (req, res) => {
  const donation = await donationsService.getDonationById(req.params.id);

  // Ensure the requester is the donor or an admin
  if (donation.donor?.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to view this receipt',
      code: 'FORBIDDEN',
    });
  }

  successResponse(res, 200, 'Receipt fetched', {
    receipt: {
      receiptNo: donation.receiptNo,
      amount: donation.amount,
      currency: 'INR',
      date: donation.completedAt || donation.createdAt,
      status: donation.status,
      donor: {
        name: donation.donor?.user?.name,
        pan: donation.pan,
      },
      ngo: {
        name: donation.ngo?.name,
      },
      transactionId: donation.razorpayPaymentId,
      type: donation.type,
    },
  });
});

export default { createDonation, verifyPayment, webhook, listDonations, getMyDonations, getDonation, getReceipt };
