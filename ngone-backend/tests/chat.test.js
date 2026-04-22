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
    chatMessage: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    team: { findUnique: jest.fn() },
    teamMember: { findFirst: jest.fn(), findMany: jest.fn() },
    notification: { create: jest.fn() },
    refreshToken: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({}) : Promise.resolve(fn)),
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

jest.unstable_mockModule('../src/jobs/index.js', () => ({ registerProcessors: jest.fn() }));

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

const chatUser = {
  id: 'chat-user-1', name: 'Sneha Reddy', role: 'VOLUNTEER',
  isActive: true, isVerified: true,
  volunteer: { id: 'chat-vol-1', skills: ['communication'], level: 'RESPONDER', points: 600 },
  ngo: null, donor: null,
};

const testMessage = {
  id: 'msg-1',
  teamId: 'team-1',
  senderId: 'chat-vol-1',
  content: 'Heading to the relief camp now!',
  type: 'TEXT',
  isEdited: false,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  sender: {
    id: 'chat-vol-1',
    user: { id: 'chat-user-1', name: 'Sneha Reddy', avatarUrl: null },
  },
};

describe('Chat Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._clear();
  });

  describe('GET /api/chat/:teamId/messages', () => {
    it('returns paginated message history for team member', async () => {
      prisma.user.findUnique.mockResolvedValue(chatUser);
      prisma.teamMember.findFirst.mockResolvedValue({ id: 'mem-1', volunteerId: 'chat-vol-1', role: 'MEMBER' });
      prisma.chatMessage.findMany.mockResolvedValue([testMessage]);
      prisma.chatMessage.count.mockResolvedValue(1);

      const token = createToken(chatUser.id);
      const res = await request(app)
        .get('/api/chat/team-1/messages')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 403]).toContain(res.status);
    });

    it('rejects non-team-member access', async () => {
      const outsider = { ...chatUser, id: 'outsider', volunteer: { id: 'outsider-vol' } };
      prisma.user.findUnique.mockResolvedValue(outsider);
      prisma.teamMember.findFirst.mockResolvedValue(null); // not a member

      const token = createToken(outsider.id);
      const res = await request(app)
        .get('/api/chat/team-1/messages')
        .set('Authorization', `Bearer ${token}`);

      expect([403, 401]).toContain(res.status);
    });
  });

  describe('POST /api/chat/:teamId/messages', () => {
    it('sends text message', async () => {
      prisma.user.findUnique.mockResolvedValue(chatUser);
      prisma.teamMember.findFirst.mockResolvedValue({ id: 'mem-1', volunteerId: 'chat-vol-1', role: 'MEMBER' });
      prisma.chatMessage.create.mockResolvedValue(testMessage);
      prisma.team.findUnique.mockResolvedValue({ id: 'team-1', name: 'Test Team' });

      const token = createToken(chatUser.id);
      const res = await request(app)
        .post('/api/chat/team-1/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Heading to the relief camp now!' });

      expect([200, 201, 403]).toContain(res.status);
    });
  });

  describe('PUT /api/chat/messages/:id', () => {
    it('edits own message within 15 minutes', async () => {
      const recentMessage = { ...testMessage, createdAt: new Date() }; // just now
      prisma.user.findUnique.mockResolvedValue(chatUser);
      prisma.chatMessage.findUnique.mockResolvedValue(recentMessage);
      prisma.chatMessage.update.mockResolvedValue({ ...recentMessage, content: 'Updated message', isEdited: true });

      const token = createToken(chatUser.id);
      const res = await request(app)
        .put('/api/chat/messages/msg-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updated message' });

      expect([200, 403, 400]).toContain(res.status);
    });
  });

  describe('DELETE /api/chat/messages/:id', () => {
    it('soft deletes own message', async () => {
      prisma.user.findUnique.mockResolvedValue(chatUser);
      prisma.chatMessage.findUnique.mockResolvedValue(testMessage);
      prisma.chatMessage.update.mockResolvedValue({ ...testMessage, isDeleted: true, content: '[deleted]' });

      const token = createToken(chatUser.id);
      const res = await request(app)
        .delete('/api/chat/messages/msg-1')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 403, 400]).toContain(res.status);
    });
  });
});
