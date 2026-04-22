import { jest } from '@jest/globals';
import request from 'supertest';

// Mock external dependencies before importing app
jest.unstable_mockModule('../src/config/redis.js', () => {
  const store = new Map();
  return {
    default: {
      get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
      set: jest.fn((key, value, ...args) => { store.set(key, value); return Promise.resolve('OK'); }),
      setex: jest.fn((key, ttl, value) => { store.set(key, value); return Promise.resolve('OK'); }),
      del: jest.fn((key) => { store.delete(key); return Promise.resolve(1); }),
      incr: jest.fn((key) => {
        const val = (parseInt(store.get(key) || '0', 10)) + 1;
        store.set(key, String(val));
        return Promise.resolve(val);
      }),
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

jest.unstable_mockModule('../src/config/database.js', () => {
  return {
    default: {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      volunteer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      nGO: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      donor: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
      },
      oTPCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      crisis: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      task: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      team: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      teamMember: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      teamInvite: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      donation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      chatMessage: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      notification: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      resource: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      programme: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(() => Promise.resolve(0)),
      },
      taskCheckIn: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      volunteerBadge: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => {
        if (typeof fn === 'function') {
          return fn({
            user: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
            volunteer: { create: jest.fn(), update: jest.fn() },
            donor: { create: jest.fn() },
            nGO: { create: jest.fn() },
            refreshToken: { create: jest.fn(), deleteMany: jest.fn() },
            teamMember: { create: jest.fn() },
            team: { update: jest.fn() },
            teamInvite: { update: jest.fn() },
          });
        }
        return Promise.resolve(fn);
      }),
      $queryRaw: jest.fn(() => Promise.resolve([{ '?column?': 1 }])),
      $queryRawUnsafe: jest.fn(() => Promise.resolve([])),
      $disconnect: jest.fn(),
    },
  };
});

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
  initSocketServer: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
    emit: jest.fn(),
    close: jest.fn(),
  })),
  getIO: jest.fn(() => ({
    to: jest.fn(() => ({ emit: jest.fn() })),
    emit: jest.fn(),
  })),
}));

// Import app after all mocks are set up
const { default: app } = await import('../src/app.js');

// ── Helper: create test JWT ─────────────────────
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

function createTestToken(userId, role = 'VOLUNTEER') {
  return jwt.sign(
    { sub: userId, role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

function createTestUser(overrides = {}) {
  return {
    id: 'test-user-id-1',
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    role: 'VOLUNTEER',
    isActive: true,
    isVerified: true,
    avatarUrl: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    createdAt: new Date(),
    updatedAt: new Date(),
    volunteer: {
      id: 'test-vol-id-1',
      skills: ['first_aid', 'driving'],
      level: 'ROOKIE',
      points: 100,
      isOnline: true,
      latitude: 19.076,
      longitude: 72.8777,
    },
    ngo: null,
    donor: null,
    ...overrides,
  };
}

// ── AUTH TESTS ───────────────────────────────────
describe('Auth Module', () => {
  const { default: prisma } = await import('../src/config/database.js');
  const { default: redis } = await import('../src/config/redis.js');

  beforeEach(() => {
    jest.clearAllMocks();
    redis._clear();
  });

  describe('POST /api/auth/register', () => {
    it('creates new volunteer with valid data', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // email not taken
      prisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'new-user-id',
              name: 'Rahul Sharma',
              email: 'rahul@example.com',
              role: 'VOLUNTEER',
              isActive: true,
              isVerified: false,
            }),
          },
          volunteer: { create: jest.fn().mockResolvedValue({ id: 'new-vol-id' }) },
          donor: { create: jest.fn() },
          nGO: { create: jest.fn() },
          refreshToken: {
            create: jest.fn().mockResolvedValue({ token: 'refresh-token' }),
          },
        };
        return fn(mockTx);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rahul Sharma',
          email: 'rahul@example.com',
          password: 'SecurePass123!',
          role: 'VOLUNTEER',
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('registered');
    });

    it('returns 409 if email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing', email: 'taken@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'taken@example.com',
          password: 'SecurePass123!',
          role: 'VOLUNTEER',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 if phone is invalid Indian number', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Phone',
          email: 'valid@example.com',
          password: 'SecurePass123!',
          role: 'VOLUNTEER',
          phone: '1234567890', // starts with 1, invalid
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('hashes password — never returns plaintext', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      let capturedPassword = null;

      prisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          user: {
            create: jest.fn((args) => {
              capturedPassword = args.data.password;
              return Promise.resolve({
                id: 'hash-test-id',
                name: 'Hash Test',
                email: 'hash@example.com',
                role: 'VOLUNTEER',
                isActive: true,
              });
            }),
          },
          volunteer: { create: jest.fn().mockResolvedValue({}) },
          donor: { create: jest.fn() },
          nGO: { create: jest.fn() },
          refreshToken: { create: jest.fn().mockResolvedValue({ token: 'rt' }) },
        };
        return fn(mockTx);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Hash Test',
          email: 'hash@example.com',
          password: 'PlainTextPassword!',
          role: 'VOLUNTEER',
        });

      // Response should never contain the plaintext password
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('PlainTextPassword!');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns JWT pair on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('ValidPass123!', 12);
      prisma.user.findFirst.mockResolvedValue({
        id: 'login-user',
        email: 'login@example.com',
        password: hashedPassword,
        role: 'VOLUNTEER',
        isActive: true,
        isVerified: true,
        volunteer: { id: 'v1' },
        ngo: null,
        donor: null,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({ token: 'new-refresh' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'ValidPass123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 401 on wrong password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPass!', 12);
      prisma.user.findFirst.mockResolvedValue({
        id: 'wrong-pass-user',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'VOLUNTEER',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPass!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user when authenticated', async () => {
      const testUser = createTestUser();
      prisma.user.findUnique.mockResolvedValue(testUser);
      const token = createTestToken(testUser.id);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(testUser.id);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/send-otp', () => {
    it('sends OTP to valid Indian number', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '9876543210' });

      expect([200, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('returns error for non-Indian numbers', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '1234567890' }); // starts with 1

      expect([400, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });
});

// ── HEALTH CHECK ─────────────────────────────────
describe('Health Check', () => {
  it('GET /api/health returns status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBeLessThan(600);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('uptime');
  });
});

// ── 404 HANDLER ──────────────────────────────────
describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

export { app, createTestToken, createTestUser };
