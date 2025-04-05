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
  console.error('Error handling request:', {
    url: req.url,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;
  let errorDetails = null; // For detailed validation errors, etc.
  
  // Handle specific error types
  // TODO: Add more specific custom error classes/codes from services (e.g., DatabaseConnectionError, QueryExecutionError)
  if (err.name === 'DatabaseConnectionError') { // Example specific error
    statusCode = 503; // Service Unavailable
    message = 'Database connection failed. Please try again later.';
  } else if (err.name === 'QueryExecutionError') { // Example specific error
    statusCode = 400; // Bad Request (likely user query issue)
    message = 'Failed to execute the database query. Check syntax or parameters.';
  } else if (err.name === 'ValidationError') {
    // Handle validation library errors (like Mongoose)
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'Error' && err.isJoi === true) {
    // Handle Joi validation errors
    statusCode = 400;
    message = 'Validation Error';
    
    // Format Joi validation errors
    errorDetails = err.details.map(detail => ({
      message: detail.message,
      path: detail.path,
      type: detail.type
    }));
    
    // Extract only the messages for a simplified error response
    errors = err.details.map(detail => detail.message);
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 400;
    message = 'Database Constraint Error';
    
    // Try to extract a more helpful message from the error
    if (err.message.includes('UNIQUE constraint failed')) {
      const matches = err.message.match(/UNIQUE constraint failed: (.+)/);
      if (matches && matches[1]) {
        const field = matches[1].split('.').pop();
        message = `The provided ${field} already exists`;
      }
    }
  } else if (err.code === 'SQLITE_ERROR') {
    statusCode = 400;
    message = 'Database Error';
    
    // Check if it's a syntax error that might expose schema details
    if (err.message.includes('syntax error')) {
      message = 'Invalid SQL query syntax';
      // Don't expose the actual error in production
      if (process.env.NODE_ENV !== 'development') {
        err.message = message;
      }
    }
  } else if (err.code === 'ENOENT' && err.message.includes('no such file or directory')) {
    statusCode = 404; 
    message = 'File not found: ' + (err.path || 'Unknown path');
  } else if (err.message === 'Connection not found') {
    statusCode = 404;
    message = 'Database connection not found';
  } else if (err.message === 'Table not found') {
    statusCode = 404;
    message = 'The requested table does not exist';
  } else if (err.message === 'Visualization not found') {
    statusCode = 404;
    message = 'The requested visualization does not exist';
  }
  
  // In production, limit detailed error information
  if (process.env.NODE_ENV === 'production') {
    // For 500 errors, use a generic message
    if (statusCode === 500) {
      message = 'Internal Server Error';
      err.message = message; // Don't expose detailed internal error messages
    }
    
    // Don't include stack traces in production
    err.stack = undefined;
    
    // Still allow validation errors to be shown to users
    if (statusCode !== 400) {
      errorDetails = null;
    }
  }
  
  // Send error response
  const errorResponse = {
    success: false,
    status: statusCode,
    message,
  };
  
  // Include errors array if it exists
  if (errors) {
    errorResponse.errors = errors;
  }
  
  // Include detailed error information in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
    
    if (errorDetails) {
      errorResponse.errorDetails = errorDetails;
    }
  }
  
  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
