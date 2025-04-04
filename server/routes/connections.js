/**
 * Connections Route Handler
 * 
 * Handles all API endpoints related to database connections
 */

const express = require('express');
const router = express.Router();
const connectionService = require('../services/connectionService');
const { validateBody, validateParams, schemas } = require('../middleware/dataValidator');

/**
 * GET /api/connections
 * List all saved connections
 */
router.get('/', async (req, res, next) => {
  try {
    const connections = await connectionService.getAllConnections();
    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/connections
 * Create a new connection
 */
router.post('/', 
  validateBody(schemas.connection.create),
  async (req, res, next) => {
    try {
      const newConnection = await connectionService.createConnection(req.body);
      res.status(201).json({
        success: true,
        message: 'Connection created successfully',
        data: newConnection
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/connections/:id
 * Get connection details
 */
router.get('/:id', 
  validateParams(schemas.connection.id),
  async (req, res, next) => {
    try {
      const connection = await connectionService.getConnectionById(req.params.id);
      if (!connection) {
        return res.status(404).json({ 
          success: false,
          message: 'Connection not found' 
        });
      }
      res.json({
        success: true,
        data: connection
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/connections/:id
 * Remove a connection
 */
router.delete('/:id', 
  validateParams(schemas.connection.id),
  async (req, res, next) => {
    try {
      const result = await connectionService.deleteConnection(req.params.id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Connection not found'
        });
      }
      res.status(200).json({
        success: true,
        message: 'Connection deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/connections/:id/health
 * Check database health/size
 */
router.get('/:id/health', 
  validateParams(schemas.connection.id),
  async (req, res, next) => {
    try {
      const health = await connectionService.checkDatabaseHealth(req.params.id);
      if (!health) {
        return res.status(404).json({
          success: false,
          message: 'Connection not found'
        });
      }
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
