/**
 * Pagination Utilities — Shared across all list pages.
 */

/**
 * Generate page number array for pagination UI.
 * Shows first, last, current, and neighbors with ellipses.
 *
 * @param {number} current  Current page (1-based)
 * @param {number} total    Total number of pages
 * @returns {Array<number|string>} e.g. [1, '...', 4, 5, 6, '...', 10]
 */
export const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  pages.push(1);

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');

  pages.push(total);

  return pages;
};

/**
 * Parse a positive integer from a value, with fallback.
 */
export const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Calculate pagination metadata.
 *
 * @param {number} totalItems  Total number of items
 * @param {number} page        Current page (1-based)
 * @param {number} limit       Items per page
 * @returns {{ totalPages, startIndex, endIndex, hasNext, hasPrev }}
 */
export const paginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);

  return {
    totalPages,
    currentPage: safePage,
    startIndex,
    endIndex,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
};
