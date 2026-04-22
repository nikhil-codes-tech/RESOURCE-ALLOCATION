/**
 * Haversine formula — calculate distance between two lat/lng points in km
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 * @param {number} deg
 * @returns {number}
 */
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Build raw SQL fragment for Haversine distance calculation (PostgreSQL)
 * Used in Prisma $queryRawUnsafe for nearby queries
 * @param {string} latColumn - Column name for latitude
 * @param {string} lngColumn - Column name for longitude
 * @param {number} paramLatIdx - Parameter index for center latitude ($1, $2, etc.)
 * @param {number} paramLngIdx - Parameter index for center longitude
 * @returns {string} SQL fragment
 */
export function haversineSQL(latColumn, lngColumn, paramLatIdx, paramLngIdx) {
  return `
    ROUND(
      (${EARTH_RADIUS_KM} * acos(
        LEAST(1.0,
          cos(radians($${paramLatIdx})) * cos(radians(${latColumn}))
          * cos(radians(${lngColumn}) - radians($${paramLngIdx}))
          + sin(radians($${paramLatIdx})) * sin(radians(${latColumn}))
        )
      ))::numeric, 2
    )
  `.trim();
}

/**
 * Check if a point is within a radius of another point
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} pointLat
 * @param {number} pointLng
 * @param {number} radiusKm
 * @returns {boolean}
 */
export function isWithinRadius(centerLat, centerLng, pointLat, pointLng, radiusKm) {
  return haversineDistance(centerLat, centerLng, pointLat, pointLng) <= radiusKm;
}

export default { haversineDistance, haversineSQL, isWithinRadius };
