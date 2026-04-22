import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';

export async function listResources(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = { isActive: true };

  if (query.category) where.category = query.category;
  if (query.ngoId) where.ngoId = query.ngoId;
  if (query.search) {
    where.name = { contains: query.search, mode: 'insensitive' };
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { ngo: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.resource.count({ where }),
  ]);

  return { resources, meta: buildPaginationMeta(total, page, limit) };
}

export async function getResourceById(id) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: { ngo: { select: { id: true, name: true, slug: true, city: true, state: true } } },
  });
  if (!resource) throw new AppError(404, 'Resource not found', ErrorCodes.NOT_FOUND);
  return resource;
}

export async function createResource(userId, data) {
  const ngo = await prisma.nGO.findUnique({ where: { userId } });
  if (!ngo) throw new AppError(404, 'NGO profile not found');

  return prisma.resource.create({
    data: {
      ...data,
      ngoId: ngo.id,
      available: data.quantity,
    },
  });
}

export async function updateResource(id, userId, data) {
  const resource = await prisma.resource.findUnique({ where: { id }, include: { ngo: true } });
  if (!resource) throw new AppError(404, 'Resource not found');
  if (resource.ngo.userId !== userId) throw new AppError(403, 'Not authorized');

  const updated = await prisma.resource.update({ where: { id }, data });

  // Recalculate available
  if (data.quantity !== undefined) {
    await prisma.resource.update({
      where: { id },
      data: { available: (data.quantity || resource.quantity) - resource.allocated },
    });
  }

  return updated;
}

export async function allocateResource(id, userId, quantity) {
  const resource = await prisma.resource.findUnique({ where: { id }, include: { ngo: true } });
  if (!resource) throw new AppError(404, 'Resource not found');
  if (resource.ngo.userId !== userId) throw new AppError(403, 'Not authorized');
  if (resource.available < quantity) throw new AppError(400, `Only ${resource.available} ${resource.unit} available`);

  return prisma.resource.update({
    where: { id },
    data: {
      allocated: { increment: quantity },
      available: { decrement: quantity },
    },
  });
}

export async function deleteResource(id, userId) {
  const resource = await prisma.resource.findUnique({ where: { id }, include: { ngo: true } });
  if (!resource) throw new AppError(404, 'Resource not found');
  if (resource.ngo.userId !== userId) throw new AppError(403, 'Not authorized');

  return prisma.resource.update({ where: { id }, data: { isActive: false } });
}

export async function getResourceStats(ngoId) {
  const stats = await prisma.resource.groupBy({
    by: ['category'],
    where: { ngoId, isActive: true },
    _sum: { quantity: true, allocated: true, available: true },
    _count: true,
  });

  return stats.map((s) => ({
    category: s.category,
    totalQuantity: s._sum.quantity || 0,
    totalAllocated: s._sum.allocated || 0,
    totalAvailable: s._sum.available || 0,
    count: s._count,
  }));
}

export default { listResources, getResourceById, createResource, updateResource, allocateResource, deleteResource, getResourceStats };
