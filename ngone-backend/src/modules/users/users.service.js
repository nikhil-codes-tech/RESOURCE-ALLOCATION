import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import logger from '../../utils/logger.js';

/**
 * Get user profile by ID
 */
export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { volunteer: true, ngo: true, donor: true },
  });
  if (!user) throw new AppError(404, 'User not found', ErrorCodes.NOT_FOUND);

  const { passwordHash, failedLoginCount, lockedUntil, ...safeUser } = user;
  return safeUser;
}

/**
 * List all users (admin only, paginated)
 */
export async function listUsers(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = {};

  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        avatarUrl: true, city: true, state: true, isVerified: true,
        isActive: true, lastLoginAt: true, createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, meta: buildPaginationMeta(total, page, limit) };
}

/**
 * Update user profile
 */
export async function updateProfile(userId, data) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { volunteer: true, ngo: true, donor: true },
  });

  const { passwordHash, failedLoginCount, lockedUntil, ...safeUser } = user;
  return safeUser;
}

/**
 * Update user avatar
 */
export async function updateAvatar(userId, avatarUrl) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: { id: true, avatarUrl: true },
  });
}

/**
 * Deactivate user account (soft delete)
 */
export async function deactivateAccount(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { revoked: true, revokedAt: new Date() },
  });

  logger.info(`Account deactivated: ${userId}`);
  return { message: 'Account deactivated successfully' };
}

export default { getUserById, listUsers, updateProfile, updateAvatar, deactivateAccount };
