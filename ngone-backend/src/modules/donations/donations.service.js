import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import { createOrder, verifyPaymentSignature, verifyWebhookSignature } from '../../config/razorpay.js';
import { emailQueue } from '../../config/queue.js';
import { getIO } from '../../config/socket.js';
import logger from '../../utils/logger.js';

export async function createDonation(userId, data) {
  const donor = await prisma.donor.findUnique({ where: { userId } });
  if (!donor) throw new AppError(404, 'Donor profile not found');

  const ngo = await prisma.nGO.findUnique({ where: { id: data.ngoId } });
  if (!ngo) throw new AppError(404, 'NGO not found');

  const receiptNo = `NGONE-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  // Create Razorpay order
  let razorpayOrder = null;
  try {
    razorpayOrder = await createOrder({
      amount: data.amount,
      currency: 'INR',
      receipt: receiptNo,
      notes: { donorId: donor.id, ngoId: ngo.id, userId },
    });
  } catch (e) {
    logger.warn(`Razorpay order creation failed: ${e.message}`);
  }

  const donation = await prisma.donation.create({
    data: {
      donorId: donor.id,
      ngoId: data.ngoId,
      amount: data.amount,
      type: data.type,
      status: 'PENDING',
      receiptNo,
      razorpayOrderId: razorpayOrder?.id,
      message: data.message,
      isAnonymous: data.isAnonymous,
      pan: data.pan,
    },
  });

  return {
    donation,
    razorpayOrder: razorpayOrder ? {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    } : null,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

export async function verifyPayment(userId, data) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;

  // Verify signature
  const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!isValid) {
    throw new AppError(400, 'Payment signature verification failed', ErrorCodes.SIGNATURE_MISMATCH);
  }

  const donation = await prisma.donation.findUnique({ where: { razorpayOrderId } });
  if (!donation) throw new AppError(404, 'Donation not found');

  // Update donation
  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: 'COMPLETED',
      razorpayPaymentId,
      razorpaySignature,
      completedAt: new Date(),
    },
    include: { ngo: { select: { name: true } } },
  });

  // Update donor totals
  await prisma.donor.update({
    where: { id: donation.donorId },
    data: {
      totalDonated: { increment: donation.amount },
      donationCount: { increment: 1 },
    },
  });

  // Update NGO funds
  await prisma.nGO.update({
    where: { id: donation.ngoId },
    data: { totalFunds: { increment: donation.amount } },
  });

  // Queue receipt email
  const donor = await prisma.donor.findUnique({
    where: { id: donation.donorId },
    include: { user: { select: { name: true, email: true } } },
  });

  if (donor.user.email) {
    await emailQueue.add('donation_receipt', {
      to: donor.user.email,
      data: {
        name: donor.user.name,
        amount: donation.amount,
        ngoName: updated.ngo.name,
        transactionId: razorpayPaymentId,
        date: new Date().toLocaleDateString('en-IN'),
      },
    });

    // 80G tax receipt if PAN provided
    if (donation.pan) {
      await emailQueue.add('tax_receipt_80g', {
        to: donor.user.email,
        data: {
          name: donor.user.name,
          pan: donation.pan,
          amount: donation.amount,
          receiptNo: donation.receiptNo,
          date: new Date().toLocaleDateString('en-IN'),
          ngoDetails: updated.ngo,
        },
      });
    }
  }

  // Socket notification
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('donation:confirmed', {
      amount: donation.amount,
      ngoName: updated.ngo.name,
      receiptUrl: `/donations/${donation.id}/receipt`,
    });
  } catch (e) { /* ignore */ }

  logger.info(`Donation verified: ${donation.id}, ₹${donation.amount}`);
  return updated;
}

export async function handleWebhook(payload, signature) {
  const isValid = verifyWebhookSignature(payload, signature);
  if (!isValid) {
    throw new AppError(400, 'Invalid webhook signature', ErrorCodes.SIGNATURE_MISMATCH);
  }

  const event = JSON.parse(payload);

  switch (event.event) {
    case 'payment.captured': {
      const payment = event.payload.payment.entity;
      await prisma.donation.updateMany({
        where: { razorpayOrderId: payment.order_id },
        data: { status: 'COMPLETED', razorpayPaymentId: payment.id, completedAt: new Date() },
      });
      break;
    }
    case 'payment.failed': {
      const payment = event.payload.payment.entity;
      await prisma.donation.updateMany({
        where: { razorpayOrderId: payment.order_id },
        data: { status: 'FAILED' },
      });
      break;
    }
    case 'refund.processed': {
      const refund = event.payload.refund.entity;
      await prisma.donation.updateMany({
        where: { razorpayPaymentId: refund.payment_id },
        data: { status: 'REFUNDED', refundedAt: new Date() },
      });
      break;
    }
  }

  return { received: true };
}

export async function listDonations(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = {};

  if (query.ngoId) where.ngoId = query.ngoId;
  if (query.status) where.status = query.status;

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: {
        donor: { include: { user: { select: { name: true, avatarUrl: true } } } },
        ngo: { select: { name: true, slug: true } },
      },
    }),
    prisma.donation.count({ where }),
  ]);

  // Hide donor info for anonymous donations
  const sanitized = donations.map((d) => ({
    ...d,
    donor: d.isAnonymous ? { user: { name: 'Anonymous', avatarUrl: null } } : d.donor,
  }));

  return { donations: sanitized, meta: buildPaginationMeta(total, page, limit) };
}

export async function getMyDonations(userId) {
  const donor = await prisma.donor.findUnique({ where: { userId } });
  if (!donor) throw new AppError(404, 'Donor profile not found');

  const donations = await prisma.donation.findMany({
    where: { donorId: donor.id },
    orderBy: { createdAt: 'desc' },
    include: { ngo: { select: { name: true, slug: true, logoUrl: true } } },
  });

  const stats = await prisma.donation.aggregate({
    where: { donorId: donor.id, status: 'COMPLETED' },
    _sum: { amount: true },
    _count: true,
  });

  return {
    donations,
    stats: { totalDonated: stats._sum.amount || 0, count: stats._count },
  };
}

export async function getDonationById(id) {
  const donation = await prisma.donation.findUnique({
    where: { id },
    include: {
      donor: { include: { user: { select: { name: true } } } },
      ngo: { select: { name: true, slug: true } },
    },
  });
  if (!donation) throw new AppError(404, 'Donation not found');
  return donation;
}

export default { createDonation, verifyPayment, handleWebhook, listDonations, getMyDonations, getDonationById };
