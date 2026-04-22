import prisma from '../../config/database.js';
import { AppError, ErrorCodes } from '../../utils/apiResponse.js';
import { getOffsetPagination, buildPaginationMeta } from '../../utils/paginate.js';
import { uniqueSlug } from '../../utils/slugify.js';

export async function listProgrammes(query) {
  const { skip, take, page, limit } = getOffsetPagination(query);
  const where = { isActive: true };

  if (query.type) where.type = query.type;
  if (query.state) where.state = query.state;
  if (query.ngoId) where.ngoId = query.ngoId;

  const [programmes, total] = await Promise.all([
    prisma.programme.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { ngo: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    }),
    prisma.programme.count({ where }),
  ]);

  return { programmes, meta: buildPaginationMeta(total, page, limit) };
}

export async function getProgrammeById(id) {
  const programme = await prisma.programme.findUnique({
    where: { id },
    include: { ngo: { select: { id: true, name: true, slug: true, logoUrl: true, city: true, state: true } } },
  });
  if (!programme) throw new AppError(404, 'Programme not found', ErrorCodes.NOT_FOUND);
  return programme;
}

export async function createProgramme(userId, data) {
  const ngo = await prisma.nGO.findUnique({ where: { userId } });
  if (!ngo) throw new AppError(404, 'NGO profile not found');

  const slug = await uniqueSlug(data.title, async (s) => !!(await prisma.programme.findUnique({ where: { slug: s } })));

  return prisma.programme.create({
    data: { ...data, ngoId: ngo.id, slug, state: data.state || ngo.state },
  });
}

export async function updateProgramme(id, userId, data) {
  const programme = await prisma.programme.findUnique({ where: { id }, include: { ngo: true } });
  if (!programme) throw new AppError(404, 'Programme not found');
  if (programme.ngo.userId !== userId) throw new AppError(403, 'Not authorized');

  return prisma.programme.update({ where: { id }, data });
}

export async function deleteProgramme(id, userId) {
  const programme = await prisma.programme.findUnique({ where: { id }, include: { ngo: true } });
  if (!programme) throw new AppError(404, 'Programme not found');
  if (programme.ngo.userId !== userId) throw new AppError(403, 'Not authorized');

  return prisma.programme.update({ where: { id }, data: { isActive: false } });
}

export default { listProgrammes, getProgrammeById, createProgramme, updateProgramme, deleteProgramme };
