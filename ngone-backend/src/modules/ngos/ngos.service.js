import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import { uniqueSlug } from '../../utils/slugify.js';
import logger from '../../utils/logger.js';

export async function listNGOs(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = { isActive: true };

  if (query.state) where.state = query.state;
  if (query.focusArea) where.focusAreas = { has: query.focusArea };
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [ngos, total] = await Promise.all([
    prisma.nGO.findMany({
      where, skip, take,
      orderBy: { impactScore: 'desc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.nGO.count({ where }),
  ]);

  return { ngos, meta: buildPaginationMeta(total, page, limit) };
}

export async function getLeaderboard(query) {
  const { skip, take, page, limit } = getOffsetPagination({ ...query, limit: query.limit || 20 });
  const [ngos, total] = await Promise.all([
    prisma.nGO.findMany({
      where: { isActive: true },
      skip, take,
      orderBy: { impactScore: 'desc' },
      select: {
        id: true, name: true, slug: true, logoUrl: true, city: true, state: true,
        impactScore: true, beneficiaries: true, focusAreas: true,
      },
    }),
    prisma.nGO.count({ where: { isActive: true } }),
  ]);

  const ranked = ngos.map((n, i) => ({ rank: skip + i + 1, ...n }));
  return { ngos: ranked, meta: buildPaginationMeta(total, page, limit) };
}

export async function getMyNGO(userId) {
  const ngo = await prisma.nGO.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      crises: { where: { isDeleted: false }, take: 5, orderBy: { createdAt: 'desc' } },
      programmes: { where: { isActive: true }, take: 5 },
    },
  });
  if (!ngo) throw new AppError(404, 'NGO profile not found', ErrorCodes.NOT_FOUND);
  return ngo;
}

export async function getNGOById(id) {
  const ngo = await prisma.nGO.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { crises: true, programmes: true, donations: true } },
    },
  });
  if (!ngo) throw new AppError(404, 'NGO not found', ErrorCodes.NOT_FOUND);
  return ngo;
}

export async function createNGO(userId, data) {
  const existing = await prisma.nGO.findUnique({ where: { userId } });
  if (existing) throw new AppError(409, 'NGO already exists for this account', ErrorCodes.DUPLICATE_ENTRY);

  const slug = await uniqueSlug(data.name, async (s) => !!(await prisma.nGO.findUnique({ where: { slug: s } })));

  const ngo = await prisma.nGO.create({
    data: { ...data, userId, slug },
  });

  logger.info(`NGO created: ${ngo.id} by user ${userId}`);
  return ngo;
}

export async function updateNGO(userId, data) {
  const ngo = await prisma.nGO.findUnique({ where: { userId } });
  if (!ngo) throw new AppError(404, 'NGO not found', ErrorCodes.NOT_FOUND);

  return prisma.nGO.update({ where: { id: ngo.id }, data });
}

export async function updateLogo(userId, logoUrl) {
  const ngo = await prisma.nGO.findUnique({ where: { userId } });
  if (!ngo) throw new AppError(404, 'NGO not found');

  return prisma.nGO.update({ where: { id: ngo.id }, data: { logoUrl } });
}

export async function getImpact(ngoId) {
  const ngo = await prisma.nGO.findUnique({ where: { id: ngoId } });
  if (!ngo) throw new AppError(404, 'NGO not found');

  const [crisisCount, completedTasks, totalDonations, programmeCount] = await Promise.all([
    prisma.crisis.count({ where: { ngoId, isDeleted: false } }),
    prisma.crisis.count({ where: { ngoId, status: 'COMPLETED' } }),
    prisma.donation.aggregate({ where: { ngoId, status: 'COMPLETED' }, _sum: { amount: true }, _count: true }),
    prisma.programme.count({ where: { ngoId, isActive: true } }),
  ]);

  return {
    totalCrises: crisisCount,
    completedCrises: completedTasks,
    totalDonationsReceived: totalDonations._sum.amount || 0,
    donationCount: totalDonations._count,
    activeProgrammes: programmeCount,
    beneficiaries: ngo.beneficiaries,
    impactScore: ngo.impactScore,
    fundsUtilisedPercent: ngo.totalFunds > 0 ? Math.round((ngo.fundsUtilised / ngo.totalFunds) * 100) : 0,
  };
}

export async function getNGOCrises(ngoId, query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const [crises, total] = await Promise.all([
    prisma.crisis.findMany({ where: { ngoId, isDeleted: false }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.crisis.count({ where: { ngoId, isDeleted: false } }),
  ]);
  return { crises, meta: buildPaginationMeta(total, page, limit) };
}

export async function getNGOProgrammes(ngoId, query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const [programmes, total] = await Promise.all([
    prisma.programme.findMany({ where: { ngoId }, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.programme.count({ where: { ngoId } }),
  ]);
  return { programmes, meta: buildPaginationMeta(total, page, limit) };
}

export async function verifyDarpan(ngoId, darpanId) {
  // In production, this would call the actual DARPAN API
  // For now, simulate verification
  logger.info(`DARPAN verification requested for NGO ${ngoId}: ${darpanId}`);

  await prisma.nGO.update({
    where: { id: ngoId },
    data: { darpanId, isDarpanVerified: true },
  });

  return { verified: true, darpanId };
}

export async function recalculateImpactScore(ngoId) {
  const ngo = await prisma.nGO.findUnique({ where: { id: ngoId } });
  if (!ngo) throw new AppError(404, 'NGO not found');

  const [completedCrises, totalCrises] = await Promise.all([
    prisma.crisis.count({ where: { ngoId, status: 'COMPLETED' } }),
    prisma.crisis.count({ where: { ngoId, isDeleted: false } }),
  ]);

  const tasksScore = Math.min(completedCrises * 2, 40);
  const volunteersScore = Math.min(ngo.beneficiaries / 1000, 30);
  const fundsScore = ngo.totalFunds > 0 ? (ngo.fundsUtilised / ngo.totalFunds) * 20 : 0;
  const responseScore = totalCrises > 0 ? (completedCrises / totalCrises) * 10 : 0;
  const impactScore = Math.round((tasksScore + volunteersScore + fundsScore + responseScore) * 100) / 100;

  await prisma.nGO.update({ where: { id: ngoId }, data: { impactScore } });

  return { impactScore };
}

export default {
  listNGOs, getLeaderboard, getMyNGO, getNGOById, createNGO,
  updateNGO, updateLogo, getImpact, getNGOCrises, getNGOProgrammes,
  verifyDarpan, recalculateImpactScore,
};
