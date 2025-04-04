/**
 * Connections Route Handler
 * 
 * Handles all API endpoints related to database connections
 */

const express = require('express');
const router = express.Router();
const connectionService = require('../services/connectionService');

/**
 * GET /api/connections
 * List all saved connections
 */
router.get('/', async (req, res, next) => {
  try {
    // TODO: Implement getting all connections
    const connections = await connectionService.getAllConnections();
    res.json(connections);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/connections
 * Create a new connection
 */
router.post('/', async (req, res, next) => {
  try {
    // TODO: Implement creating a new connection
    const newConnection = await connectionService.createConnection(req.body);
    res.status(201).json(newConnection);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:id
 * Get connection details
 */
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: Implement getting connection by ID
    const connection = await connectionService.getConnectionById(req.params.id);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    res.json(connection);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/connections/:id
 * Remove a connection
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // TODO: Implement deleting a connection
    await connectionService.deleteConnection(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:id/health
 * Check database health/size
 */
router.get('/:id/health', async (req, res, next) => {
  try {
    // TODO: Implement database health check
    const health = await connectionService.checkDatabaseHealth(req.params.id);
    res.json(health);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
