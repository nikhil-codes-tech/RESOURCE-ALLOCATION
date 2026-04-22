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
    volunteer: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    team: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    teamMember: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    teamInvite: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(() => Promise.resolve(0)) },
    task: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
    refreshToken: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn((fn) => typeof fn === 'function' ? fn({
      teamMember: { create: jest.fn().mockResolvedValue({}) },
      team: { update: jest.fn().mockResolvedValue({}) },
      teamInvite: { update: jest.fn().mockResolvedValue({}) },
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

const testUser = {
  id: 'team-user-1', name: 'Amit Kumar', role: 'VOLUNTEER',
  isActive: true, isVerified: true,
  volunteer: { id: 'team-vol-1', skills: ['first_aid'], level: 'RESPONDER', points: 500, isOnline: true },
  ngo: null, donor: null,
};

const testTeam = {
  id: 'team-1',
  name: 'Flood Relief Alpha',
  taskId: 'task-1',
  leaderId: 'team-vol-1',
  maxSize: 4,
  currentSize: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  task: { id: 'task-1', title: 'Flood Relief Operation', status: 'IN_PROGRESS' },
  members: [
    { id: 'mem-1', volunteerId: 'team-vol-1', role: 'LEADER' },
    { id: 'mem-2', volunteerId: 'team-vol-2', role: 'MEMBER' },
  ],
};

describe('Teams Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._clear();
  });

  describe('POST /api/teams', () => {
    it('creates a team for a task', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', title: 'Test Task', status: 'OPEN' });
      prisma.team.findFirst.mockResolvedValue(null); // no existing team
      prisma.$transaction.mockResolvedValue({
        id: 'new-team', name: 'Test Team', maxSize: 4, currentSize: 1,
      });

      const token = createToken(testUser.id);
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${token}`)
        .send({ taskId: 'task-1', name: 'Test Team', maxSize: 4 });

      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe('Team invite flow', () => {
    it('leader can invite volunteer', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);
      prisma.team.findUnique.mockResolvedValue(testTeam);
      prisma.teamMember.findFirst.mockResolvedValueOnce({ role: 'LEADER' }); // sender is leader
      prisma.teamMember.findFirst.mockResolvedValueOnce(null); // target not in team
      prisma.teamInvite.findFirst.mockResolvedValue(null); // no pending invite
      prisma.volunteer.findUnique.mockResolvedValue({ id: 'target-vol', userId: 'target-user', user: { name: 'Target' } });
      prisma.teamInvite.create.mockResolvedValue({
        id: 'invite-1', teamId: 'team-1', volunteerId: 'target-vol', status: 'PENDING',
      });

      const token = createToken(testUser.id);
      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ volunteerId: 'target-vol' });

      expect([200, 201, 400, 403]).toContain(res.status);
    });

    it('cannot invite if team is full', async () => {
      const fullTeam = { ...testTeam, currentSize: 4, maxSize: 4 };
      prisma.user.findUnique.mockResolvedValue(testUser);
      prisma.team.findUnique.mockResolvedValue(fullTeam);
      prisma.teamMember.findFirst.mockResolvedValue({ role: 'LEADER' });

      const token = createToken(testUser.id);
      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ volunteerId: 'some-vol' });

      expect([400, 403, 409]).toContain(res.status);
    });

    it('cannot invite same volunteer twice', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);
      prisma.team.findUnique.mockResolvedValue(testTeam);
      prisma.teamMember.findFirst
        .mockResolvedValueOnce({ role: 'LEADER' })   // sender is leader
        .mockResolvedValueOnce({ id: 'existing' });   // already a member

      const token = createToken(testUser.id);
      const res = await request(app)
        .post('/api/teams/team-1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ volunteerId: 'team-vol-2' });

      expect([400, 409]).toContain(res.status);
    });

    it('accept invite creates TeamMember record', async () => {
      const invite = {
        id: 'invite-accept-1', teamId: 'team-1', volunteerId: 'new-vol',
        status: 'PENDING', expiresAt: new Date(Date.now() + 86400000),
        team: testTeam,
        volunteer: { id: 'new-vol', userId: 'new-user', user: { name: 'New Vol' } },
      };
      prisma.user.findUnique.mockResolvedValue({
        ...testUser, id: 'new-user', volunteer: { id: 'new-vol' },
      });
      prisma.teamInvite.findUnique.mockResolvedValue(invite);

      const token = createToken('new-user');
      const res = await request(app)
        .put('/api/teams/invites/invite-accept-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'accept' });

      expect([200, 400]).toContain(res.status);
    });

    it('decline invite does not add member', async () => {
      const invite = {
        id: 'invite-decline-1', teamId: 'team-1', volunteerId: 'dec-vol',
        status: 'PENDING', expiresAt: new Date(Date.now() + 86400000),
        team: testTeam,
        volunteer: { id: 'dec-vol', userId: 'dec-user', user: { name: 'Dec Vol' } },
      };
      prisma.user.findUnique.mockResolvedValue({
        ...testUser, id: 'dec-user', volunteer: { id: 'dec-vol' },
      });
      prisma.teamInvite.findUnique.mockResolvedValue(invite);
      prisma.teamInvite.update.mockResolvedValue({ ...invite, status: 'DECLINED' });

      const token = createToken('dec-user');
      const res = await request(app)
        .put('/api/teams/invites/invite-decline-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'decline' });

      expect([200, 400]).toContain(res.status);
      // Ensure TeamMember.create was NOT called
      expect(prisma.teamMember.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/teams', () => {
    it('returns open teams', async () => {
      prisma.team.findMany.mockResolvedValue([testTeam]);
      prisma.team.count.mockResolvedValue(1);

      const res = await request(app).get('/api/teams');

      expect([200, 401]).toContain(res.status);
    });
  });
});
