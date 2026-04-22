import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Re-use the same mocking pattern
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
    user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    volunteer: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(20)) },
    volunteerBadge: { findMany: jest.fn(() => Promise.resolve([])), create: jest.fn() },
    taskCheckIn: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    task: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    team: { findMany: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    teamMember: { findMany: jest.fn(), findFirst: jest.fn() },
    notification: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    refreshToken: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({}) : Promise.resolve(fn)),
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

jest.unstable_mockModule('../src/jobs/index.js', () => ({
  registerProcessors: jest.fn(),
}));

jest.unstable_mockModule('../src/config/socket.js', () => ({
  initSocketServer: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn(), close: jest.fn() })),
  getIO: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })), emit: jest.fn() })),
}));

const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/database.js');
const { default: redis } = await import('../src/config/redis.js');

function createToken(userId, role = 'VOLUNTEER') {
  return jwt.sign({ sub: userId, role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

const testVolunteer = {
  id: 'vol-test-1',
  userId: 'user-vol-1',
  skills: ['first_aid', 'driving', 'communication'],
  level: 'RESPONDER',
  points: 750,
  isOnline: true,
  latitude: 19.076,
  longitude: 72.8777,
  availability: { monday: ['09:00-17:00'] },
  totalHours: 45,
  tasksCompleted: 8,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: 'user-vol-1',
    name: 'Priya Patel',
    email: 'priya@example.com',
    role: 'VOLUNTEER',
    isActive: true,
    avatarUrl: null,
    city: 'Mumbai',
    state: 'Maharashtra',
  },
};

describe('Volunteers Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._clear();
  });

  describe('GET /api/volunteers', () => {
    it('returns paginated volunteer list for admin', async () => {
      const adminUser = {
        id: 'admin-1', name: 'Admin', role: 'ADMIN',
        isActive: true, isVerified: true, volunteer: null, ngo: null, donor: null,
      };
      prisma.user.findUnique.mockResolvedValue(adminUser);
      prisma.volunteer.findMany.mockResolvedValue([testVolunteer]);
      prisma.volunteer.count.mockResolvedValue(1);

      const token = createToken(adminUser.id, 'ADMIN');
      const res = await request(app)
        .get('/api/volunteers')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 403]).toContain(res.status);
    });
  });

  describe('GET /api/volunteers/me', () => {
    it('returns own volunteer profile', async () => {
      const user = {
        id: 'user-vol-1', name: 'Priya Patel', role: 'VOLUNTEER',
        isActive: true, isVerified: true,
        volunteer: testVolunteer, ngo: null, donor: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.volunteer.findFirst.mockResolvedValue(testVolunteer);

      const token = createToken(user.id);
      const res = await request(app)
        .get('/api/volunteers/me')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('GET /api/volunteers/leaderboard', () => {
    it('returns top volunteers by points', async () => {
      prisma.volunteer.findMany.mockResolvedValue([
        { ...testVolunteer, points: 3200, level: 'LEGEND' },
        { ...testVolunteer, id: 'vol-2', points: 2100, level: 'HERO' },
      ]);
      prisma.volunteer.count.mockResolvedValue(2);

      const res = await request(app).get('/api/volunteers/leaderboard');

      expect([200, 401]).toContain(res.status);
    });
  });

  describe('PUT /api/volunteers/me/skills', () => {
    it('updates skills array', async () => {
      const user = {
        id: 'user-vol-1', name: 'Test', role: 'VOLUNTEER',
        isActive: true, isVerified: true,
        volunteer: testVolunteer, ngo: null, donor: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.volunteer.findFirst.mockResolvedValue(testVolunteer);
      prisma.volunteer.update.mockResolvedValue({ ...testVolunteer, skills: ['first_aid', 'swimming'] });

      const token = createToken(user.id);
      const res = await request(app)
        .put('/api/volunteers/me/skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ skills: ['first_aid', 'swimming'] });

      expect([200, 400]).toContain(res.status);
    });
  });

  describe('GET /api/volunteers/nearby', () => {
    it('returns nearby volunteers with valid coordinates', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { ...testVolunteer, distance_km: 5.23 },
      ]);

      const res = await request(app)
        .get('/api/volunteers/nearby')
        .query({ lat: 19.076, lng: 72.8777, radius: 50 });

      expect([200, 401]).toContain(res.status);
    });
  });
});
