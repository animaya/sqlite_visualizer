/**
 * Export Route Handler
 * 
 * Handles all API endpoints related to exporting data in various formats (CSV, JSON)
 */

const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');
const { validateParams, validateQuery, schemas } = require('../middleware/dataValidator');
const Joi = require('joi');

// Export validation schemas
const vizExportParamsSchema = Joi.object({
  vizId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Visualization ID must be a number',
      'number.integer': 'Visualization ID must be an integer',
      'number.positive': 'Visualization ID must be positive'
    })
});

const tableExportParamsSchema = Joi.object({
  connectionId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Connection ID must be a number',
      'number.integer': 'Connection ID must be an integer',
      'number.positive': 'Connection ID must be positive'
    }),
  tableName: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).required()
    .messages({
      'string.pattern.base': 'Table name contains invalid characters'
    })
});

const tableExportQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100000).default(1000)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100,000'
    }),
  filter: Joi.string().custom((value, helpers) => {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return helpers.message('Filter must be a valid JSON string');
    }
  }).optional(),
  sort: Joi.string().custom((value, helpers) => {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      return helpers.message('Sort must be a valid JSON string');
    }
  }).optional(),
  includeSchema: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'includeSchema must be a boolean'
    })
});

/**
 * GET /api/export/formats
 * Get supported export formats
 */
router.get('/formats', async (req, res, next) => {
  try {
    const formats = exportService.getSupportedExportFormats();
    
    return res.json({
      success: true,
      formats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/csv/:vizId
 * Export visualization as CSV
 */
router.get('/csv/:vizId', 
  validateParams(vizExportParamsSchema),
  validateQuery(schemas.export.csv),
  async (req, res, next) => {
    try {
      const { vizId } = req.params;
      
      const result = await exportService.exportVisualizationAsCsv(vizId);
      
      if (!result || !result.data) {
        return res.status(404).json({
          success: false,
          error: 'Visualization not found',
          message: `No visualization found with ID: ${vizId}`
        });
      }
      
      const { data, filename, mimeType } = result;
      
      res.setHeader('Content-Type', mimeType || 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/export/json/:vizId
 * Export visualization as JSON
 */
router.get('/json/:vizId', 
  validateParams(vizExportParamsSchema),
  async (req, res, next) => {
    try {
      const { vizId } = req.params;
      
      const result = await exportService.exportVisualizationAsJson(vizId);
      
      if (!result || !result.data) {
        return res.status(404).json({
          success: false,
          error: 'Visualization not found',
          message: `No visualization found with ID: ${vizId}`
        });
      }
      
      const { data, filename, mimeType } = result;
      
      res.setHeader('Content-Type', mimeType || 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/export/csv/table/:connectionId/:tableName
 * Export table as CSV
 */
router.get('/csv/table/:connectionId/:tableName', 
  validateParams(tableExportParamsSchema),
  validateQuery(tableExportQuerySchema),
  async (req, res, next) => {
    try {
      const { connectionId, tableName } = req.params;
      const { limit, filter, sort } = req.query;
      
      // Parse export options
      const options = {
        limit: limit ? parseInt(limit) : 1000
      };
      
      // Safely parse JSON parameters if they exist
      if (filter) {
        try {
          options.filter = JSON.parse(filter);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid filter parameter',
            message: 'Filter must be a valid JSON object'
          });
        }
      }
      
      if (sort) {
        try {
          options.sort = JSON.parse(sort);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid sort parameter',
            message: 'Sort must be a valid JSON object'
          });
        }
      }
      
      const result = await exportService.exportTableAsCsv(connectionId, tableName, options);
      
      if (!result || !result.data) {
        return res.status(404).json({
          success: false,
          error: 'Export failed',
          message: 'The requested table or connection could not be found'
        });
      }
      
      const { data, filename, mimeType } = result;
      
      res.setHeader('Content-Type', mimeType || 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/export/json/table/:connectionId/:tableName
 * Export table as JSON
 */
router.get('/json/table/:connectionId/:tableName', 
  validateParams(tableExportParamsSchema),
  validateQuery(tableExportQuerySchema),
  async (req, res, next) => {
    try {
      const { connectionId, tableName } = req.params;
      const { limit, filter, sort, includeSchema } = req.query;
      
      // Parse export options
      const options = {
        limit: limit ? parseInt(limit) : 1000,
        includeSchema: includeSchema !== 'false' // Convert to boolean
      };
      
      // Safely parse JSON parameters if they exist
      if (filter) {
        try {
          options.filter = JSON.parse(filter);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid filter parameter',
            message: 'Filter must be a valid JSON object'
          });
        }
      }
      
      if (sort) {
        try {
          options.sort = JSON.parse(sort);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid sort parameter',
            message: 'Sort must be a valid JSON object'
          });
        }
      }
      
      const result = await exportService.exportTableAsJson(connectionId, tableName, options);
      
      if (!result || !result.data) {
        return res.status(404).json({
          success: false,
          error: 'Export failed',
          message: 'The requested table or connection could not be found'
        });
      }
      
      const { data, filename, mimeType } = result;
      
      res.setHeader('Content-Type', mimeType || 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
