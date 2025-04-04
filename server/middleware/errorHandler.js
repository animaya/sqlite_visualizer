/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the API
 */

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error for server-side debugging
  console.error('Error:', err);
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || {};
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Database Constraint Error';
  } else if (err.code === 'SQLITE_ERROR') {
    statusCode = 400;
    message = 'Database Error';
  }
  
  // In production, don't expose detailed error information
  if (process.env.NODE_ENV === 'production') {
    errors = {}; // Don't expose detailed errors
    
    // For 500 errors, use a generic message
    if (statusCode === 500) {
      message = 'Internal Server Error';
    }
  }
  
  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
