/**
 * Prisma pagination helper — supports both offset and cursor pagination
 */

/**
 * Build offset-based pagination params for Prisma
 * @param {object} query - { page, limit }
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
export function getOffsetPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Build cursor-based pagination params for Prisma
 * @param {object} query - { cursor, limit }
 * @returns {{ take: number, skip?: number, cursor?: object }}
 */
export function getCursorPagination(query) {
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const result = { take: limit };

  if (query.cursor) {
    result.skip = 1; // Skip the cursor itself
    result.cursor = { id: query.cursor };
  }

  return result;
}

/**
 * Build pagination metadata for response
 * @param {number} total - Total record count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {{ page, limit, total, totalPages, hasMore }}
 */
export function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Build cursor pagination metadata
 * @param {Array} items - Result items
 * @param {number} limit - Items requested
 * @returns {{ nextCursor, hasMore }}
 */
export function buildCursorMeta(items, limit) {
  const hasMore = items.length === limit;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return {
    nextCursor,
    hasMore,
  };
}

/**
 * Apply sorting from query params
 * @param {object} query - { sortBy, sortOrder }
 * @param {string[]} allowedFields - Fields allowed for sorting
 * @param {string} [defaultField='createdAt']
 * @returns {{ [field]: 'asc' | 'desc' }}
 */
export function getSorting(query, allowedFields, defaultField = 'createdAt') {
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { [sortBy]: sortOrder };
}

export default {
  getOffsetPagination,
  getCursorPagination,
  buildPaginationMeta,
  buildCursorMeta,
  getSorting,
};
