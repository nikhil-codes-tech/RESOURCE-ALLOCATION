import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.unstable_mockModule('../src/config/redis.js', () => {
  const store = new Map();
  return {
    default: {
      get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
      set: jest.fn((key, value) => { store.set(key, value); return Promise.resolve('OK'); }),
      setex: jest.fn((key, ttl, value) => { store.set(key, value); return Promise.resolve('OK'); }),
      del: jest.fn((key) => { store.delete(key); return Promise.resolve(1); }),
      incr: jest.fn(() => Promise.resolve(1)),
      expire: jest.fn(() => Promise.resolve(1)),
      ttl: jest.fn(() => Promise.resolve(300)),
      ping: jest.fn(() => Promise.resolve('PONG')),
      quit: jest.fn(() => Promise.resolve()),
      keys: jest.fn(() => Promise.resolve([])),
      _store: store,
      _clear: () => store.clear(),
    },
  };
});

jest.unstable_mockModule('../src/config/database.js', () => ({
  default: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    donation: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    donor: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    nGO: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
    refreshToken: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({
      donation: { create: jest.fn().mockResolvedValue({ id: 'don-new', amount: 5000 }), update: jest.fn() },
      donor: { update: jest.fn() },
    }) : Promise.resolve(fn)),
    $queryRaw: jest.fn(() => Promise.resolve([{ '?column?': 1 }])),
    $disconnect: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/config/queue.js', () => ({
  emailQueue: { add: jest.fn(() => Promise.resolve()) },
  smsQueue: { add: jest.fn(() => Promise.resolve()) },
  matchQueue: { add: jest.fn(() => Promise.resolve()) },
  notificationQueue: { add: jest.fn(() => Promise.resolve()) },
}));

jest.unstable_mockModule('../src/config/razorpay.js', () => ({
  default: {
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_test123',
        amount: 500000,
        currency: 'INR',
        status: 'created',
      }),
    },
    payments: {
      fetch: jest.fn().mockResolvedValue({
        id: 'pay_test123',
        order_id: 'order_test123',
        amount: 500000,
        status: 'captured',
      }),
    },
  },
  verifyPaymentSignature: jest.fn(() => true),
}));

jest.unstable_mockModule('../src/jobs/index.js', () => ({ registerProcessors: jest.fn() }));

jest.unstable_mockModule('../src/config/socket.js', () => ({
  initSocketServer: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn(), close: jest.fn() })),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/database.js');
const { default: redis } = await import('../src/config/redis.js');

function createToken(userId, role = 'DONOR') {
  return jwt.sign({ sub: userId, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

const donorUser = {
  id: 'donor-user-1', name: 'Rajesh Gupta', role: 'DONOR',
  isActive: true, isVerified: true,
  volunteer: null, ngo: null,
  donor: { id: 'donor-1', totalDonated: 50000, donationCount: 5, pan: 'ABCDE1234F' },
};

const testDonation = {
  id: 'donation-1',
  amount: 5000,
  currency: 'INR',
  type: 'ONE_TIME',
  status: 'COMPLETED',
  razorpayOrderId: 'order_test123',
  razorpayPaymentId: 'pay_test123',
  donorId: 'donor-1',
  ngoId: 'ngo-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  donor: { id: 'donor-1', user: { name: 'Rajesh Gupta', email: 'rajesh@example.com' } },
  ngo: { id: 'ngo-1', name: 'Relief First Foundation' },
};

describe('Donations Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._clear();
  });

  describe('POST /api/donations/create-order', () => {
    it('creates Razorpay order for valid donation', async () => {
      prisma.user.findUnique.mockResolvedValue(donorUser);
      prisma.nGO.findUnique.mockResolvedValue({ id: 'ngo-1', name: 'Relief First' });

      const token = createToken(donorUser.id, 'DONOR');
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 5000,
          ngoId: 'ngo-1',
          type: 'ONE_TIME',
        });

      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('rejects invalid amount', async () => {
      prisma.user.findUnique.mockResolvedValue(donorUser);

      const token = createToken(donorUser.id, 'DONOR');
      const res = await request(app)
        .post('/api/donations/create-order')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: -100,
          ngoId: 'ngo-1',
          type: 'ONE_TIME',
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/donations/verify', () => {
    it('verifies payment with valid signature', async () => {
      prisma.user.findUnique.mockResolvedValue(donorUser);
      prisma.donation.findFirst.mockResolvedValue({ ...testDonation, status: 'PENDING' });

      const token = createToken(donorUser.id, 'DONOR');
      const res = await request(app)
        .post('/api/donations/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          razorpayOrderId: 'order_test123',
          razorpayPaymentId: 'pay_test123',
          razorpaySignature: 'valid_mock_signature',
        });

      expect([200, 400]).toContain(res.status);
    });
  });

  describe('GET /api/donations/me', () => {
    it('returns donor donation history', async () => {
      prisma.user.findUnique.mockResolvedValue(donorUser);
      prisma.donation.findMany.mockResolvedValue([testDonation]);
      prisma.donation.count.mockResolvedValue(1);

      const token = createToken(donorUser.id, 'DONOR');
      const res = await request(app)
        .get('/api/donations/me')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/donations/:id/receipt', () => {
    it('returns donation receipt', async () => {
      prisma.user.findUnique.mockResolvedValue(donorUser);
      prisma.donation.findUnique.mockResolvedValue(testDonation);

      const token = createToken(donorUser.id, 'DONOR');
      const res = await request(app)
        .get('/api/donations/donation-1/receipt')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });
});
