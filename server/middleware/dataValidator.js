/**
 * Data Validator Middleware
 * 
 * Validates request data against Joi schemas
 */

const Joi = require('joi');

/**
 * Validate request body against a schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateBody(schema) {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
}

/**
 * Validate request query parameters against a schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateQuery(schema) {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    // Replace request query with validated and sanitized data
    req.query = value;
    next();
  };
}

/**
 * Validate request parameters against a schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
function validateParams(schema) {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: false, // Don't strip unknown for route params
      errors: {
        wrap: {
          label: ''
        }
      }
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    // Replace request params with validated data
    req.params = value;
    next();
  };
}

/**
 * Create validation schemas for common data patterns
 */
const schemas = {
  // Database connection schemas
  connection: {
    create: Joi.object({
      name: Joi.string().trim().min(1).max(100).required()
        .messages({
          'string.empty': 'Connection name is required',
          'string.min': 'Connection name must be at least 1 character long',
          'string.max': 'Connection name cannot exceed 100 characters'
        }),
      path: Joi.string().trim().min(1).required()
        .messages({
          'string.empty': 'Database path is required'
        })
    }),
    
    id: Joi.object({
      id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Connection ID must be a number',
          'number.integer': 'Connection ID must be an integer',
          'number.positive': 'Connection ID must be positive'
        })
    })
  },
  
  // Visualization schemas
  visualization: {
    create: Joi.object({
      connection_id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Connection ID must be a number',
          'number.integer': 'Connection ID must be an integer',
          'number.positive': 'Connection ID must be positive'
        }),
      name: Joi.string().trim().min(1).max(100).required()
        .messages({
          'string.empty': 'Visualization name is required',
          'string.min': 'Visualization name must be at least 1 character long',
          'string.max': 'Visualization name cannot exceed 100 characters'
        }),
      type: Joi.string().valid('bar', 'pie', 'line', 'scatter', 'area').required()
        .messages({
          'any.only': 'Visualization type must be one of: bar, pie, line, scatter, area'
        }),
      config: Joi.alternatives().try(
        Joi.object().required(),
        Joi.string().custom((value, helpers) => {
          try {
            // If it's a string, try to parse it as JSON
            return JSON.parse(value);
          } catch (error) {
            return helpers.error('string.jsonParse');
          }
        })
      ).required().messages({
        'object.base': 'Chart configuration must be a valid object',
        'string.jsonParse': 'Chart configuration must be a valid JSON string or object'
      }),
      table_name: Joi.string().trim().min(1).required()
        .messages({
          'string.empty': 'Table name is required'
        })
    }),
    
    id: Joi.object({
      id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Visualization ID must be a number',
          'number.integer': 'Visualization ID must be an integer',
          'number.positive': 'Visualization ID must be positive'
        })
    }),
    
    update: Joi.object({
      name: Joi.string().trim().min(1).max(100)
        .messages({
          'string.empty': 'Visualization name cannot be empty',
          'string.min': 'Visualization name must be at least 1 character long',
          'string.max': 'Visualization name cannot exceed 100 characters'
        }),
      type: Joi.string().valid('bar', 'pie', 'line', 'scatter', 'area')
        .messages({
          'any.only': 'Visualization type must be one of: bar, pie, line, scatter, area'
        }),
      config: Joi.object()
        .messages({
          'object.base': 'Chart configuration must be a valid object'
        })
    }).min(1).messages({
      'object.min': 'At least one field must be provided for update'
    })
  },
  
  // Table data schemas
  table: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1)
        .messages({
          'number.base': 'Page must be a number',
          'number.integer': 'Page must be an integer',
          'number.min': 'Page must be at least 1'
        }),
      limit: Joi.number().integer().min(1).max(1000).default(100)
        .messages({
          'number.base': 'Limit must be a number',
          'number.integer': 'Limit must be an integer',
          'number.min': 'Limit must be at least 1',
          'number.max': 'Limit cannot exceed 1000'
        }),
      sort: Joi.string().pattern(/^[\w]+$/, { name: 'column name' })
        .messages({
          'string.pattern.name': 'Sort column must contain only alphanumeric characters and underscores'
        }),
      order: Joi.string().valid('asc', 'desc').default('asc')
        .messages({
          'any.only': 'Order must be either "asc" or "desc"'
        }),
      filter: Joi.string()
    })
  },
  
  // Export schemas
  export: {
    csv: Joi.object({
      format: Joi.string().valid('csv').default('csv')
    }),
    json: Joi.object({
      includeSchema: Joi.boolean().default(true),
      format: Joi.string().valid('json').default('json')
    }),
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(100000).default(1000),
      filter: Joi.string().optional(),
      sort: Joi.string().optional(),
      includeSchema: Joi.boolean().default(true)
    })
  }
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  schemas
};
