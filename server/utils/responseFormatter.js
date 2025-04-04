/**
 * Response Formatter
 * 
 * Utilities for formatting API responses
 */

/**
 * Format successful response
 * @param {any} data - Response data
 * @param {string} message - Success message
 */
function success(data, message = '') {
  // TODO: Implement formatting successful response
  return {
    success: true,
    data,
    message
  };
}

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} errors - Additional error details
 */
function error(message, statusCode = 500, errors = {}) {
  // TODO: Implement formatting error response
  return {
    success: false,
    message,
    statusCode,
    errors
  };
}

/**
 * Format paginated response
 * @param {Array} data - Paginated data
 * @param {number} total - Total items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
function paginated(data, total, page, limit) {
  // TODO: Implement formatting paginated response
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

module.exports = {
  success,
  error,
  paginated
};
