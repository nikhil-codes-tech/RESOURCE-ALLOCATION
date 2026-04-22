/**
 * Generate URL-safe slugs from strings
 */

/**
 * Convert a string to a URL-friendly slug
 * @param {string} text - Input text
 * @param {object} [options]
 * @param {boolean} [options.unique=true] - Append random suffix for uniqueness
 * @returns {string}
 */
export function slugify(text, options = {}) {
  const { unique = true } = options;

  let slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove non-word chars (except hyphens)
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end

  if (unique) {
    const suffix = Math.random().toString(36).substring(2, 8);
    slug = `${slug}-${suffix}`;
  }

  return slug;
}

/**
 * Generate a slug and ensure uniqueness against existing slugs
 * @param {string} text - Input text
 * @param {Function} checkExists - async (slug) => boolean
 * @returns {Promise<string>}
 */
export async function uniqueSlug(text, checkExists) {
  let slug = slugify(text, { unique: false });
  let candidate = slug;
  let counter = 0;

  while (await checkExists(candidate)) {
    counter++;
    candidate = `${slug}-${counter}`;
  }

  return candidate;
}

export default { slugify, uniqueSlug };
