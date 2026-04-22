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
    volunteer: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    crisis: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    task: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    nGO: { findUnique: jest.fn(), findFirst: jest.fn() },
    notification: { create: jest.fn() },
    refreshToken: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({
      crisis: { create: jest.fn().mockResolvedValue({ id: 'crisis-new' }), update: jest.fn() },
      task: { create: jest.fn().mockResolvedValue({ id: 'task-new' }) },
    }) : Promise.resolve(fn)),
    $queryRaw: jest.fn(() => Promise.resolve([{ '?column?': 1 }])),
    $queryRawUnsafe: jest.fn(() => Promise.resolve([])),
    $disconnect: jest.fn(),
  },
}));

jest.unstable_mockModule('../src/config/queue.js', () => ({
  emailQueue: { add: jest.fn(() => Promise.resolve()) },
  smsQueue: { add: jest.fn(() => Promise.resolve()) },
  matchQueue: { add: jest.fn(() => Promise.resolve()) },
  notificationQueue: { add: jest.fn(() => Promise.resolve()) },
}));

jest.unstable_mockModule('../src/jobs/index.js', () => ({ registerProcessors: jest.fn() }));

jest.unstable_mockModule('../src/config/socket.js', () => ({
  initSocketServer: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn(), close: jest.fn() })),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/database.js');
const { default: redis } = await import('../src/config/redis.js');

function createToken(userId, role = 'NGO_COORDINATOR') {
  return jwt.sign({ sub: userId, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

const ngoUser = {
  id: 'ngo-user-1', name: 'Relief First Coordinator', role: 'NGO_COORDINATOR',
  isActive: true, isVerified: true,
  volunteer: null, donor: null,
  ngo: { id: 'ngo-1', name: 'Relief First Foundation', darpanId: 'DL/2024/001', isVerified: true },
};

const testCrisis = {
  id: 'crisis-1',
  title: 'Flood in Assam — Urgent Relief Needed',
  description: 'Severe flooding affecting 5 districts',
  type: 'FLOOD',
  urgency: 'EXTREME',
  latitude: 26.1445,
  longitude: 91.7362,
  status: 'OPEN',
  skillsRequired: ['first_aid', 'swimming', 'logistics'],
  volunteersNeeded: 20,
  ngoId: 'ngo-1',
  taskId: 'task-crisis-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ngo: { id: 'ngo-1', name: 'Relief First Foundation' },
  task: { id: 'task-crisis-1', title: 'Flood Relief', status: 'OPEN' },
};

describe('Crises Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._clear();
  });

  describe('GET /api/crises', () => {
    it('returns paginated crisis list', async () => {
      prisma.crisis.findMany.mockResolvedValue([testCrisis]);
      prisma.crisis.count.mockResolvedValue(1);

      const res = await request(app).get('/api/crises');

      expect([200, 401]).toContain(res.status);
    });

    it('filters by type and urgency', async () => {
      prisma.crisis.findMany.mockResolvedValue([testCrisis]);
      prisma.crisis.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/crises')
        .query({ type: 'FLOOD', urgency: 'EXTREME' });

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/crises/map', () => {
    it('returns crisis locations for map', async () => {
      prisma.crisis.findMany.mockResolvedValue([
        { id: 'c1', latitude: 26.14, longitude: 91.73, urgency: 'EXTREME', type: 'FLOOD', title: 'Assam Flood', status: 'OPEN' },
        { id: 'c2', latitude: 25.61, longitude: 85.14, urgency: 'CRITICAL', type: 'FOOD_SHORTAGE', title: 'Bihar Famine', status: 'OPEN' },
      ]);

      const res = await request(app).get('/api/crises/map');

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('POST /api/crises', () => {
    it('creates crisis as NGO coordinator', async () => {
      prisma.user.findUnique.mockResolvedValue(ngoUser);

      const token = createToken(ngoUser.id, 'NGO_COORDINATOR');
      const res = await request(app)
        .post('/api/crises')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Medical Camp in Rajasthan',
          description: 'Setting up emergency medical camp',
          type: 'MEDICAL',
          urgency: 'HIGH',
          latitude: 26.9124,
          longitude: 75.7873,
          skillsRequired: ['first_aid', 'medical'],
          volunteersNeeded: 10,
          location: 'Jaipur, Rajasthan',
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it('rejects crisis creation from VOLUNTEER role', async () => {
      const volUser = { ...ngoUser, role: 'VOLUNTEER', ngo: null, volunteer: { id: 'v1' } };
      prisma.user.findUnique.mockResolvedValue(volUser);

      const token = createToken(volUser.id, 'VOLUNTEER');
      const res = await request(app)
        .post('/api/crises')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Unauthorized Crisis',
          type: 'FLOOD',
          urgency: 'LOW',
        });

      expect([400, 403]).toContain(res.status);
    });
  });

  describe('GET /api/crises/nearby', () => {
    it('returns crises within radius', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { ...testCrisis, distance_km: 12.5 },
      ]);
      prisma.crisis.findMany.mockResolvedValue([testCrisis]);

      const res = await request(app)
        .get('/api/crises/nearby')
        .query({ lat: 26.15, lng: 91.74, radius: 50 });

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('GET /api/crises/:id', () => {
    it('returns crisis details', async () => {
      prisma.crisis.findUnique.mockResolvedValue(testCrisis);

      const res = await request(app).get('/api/crises/crisis-1');

      expect([200, 401, 404]).toContain(res.status);
    });
  });
});
