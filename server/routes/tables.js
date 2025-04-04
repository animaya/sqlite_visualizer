/**
 * Tables Route Handler
 * 
 * Handles all API endpoints related to database tables
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const databaseService = require('../services/databaseService');

/**
 * GET /api/connections/:id/tables
 * List all tables in the database
 */
router.get('/', async (req, res, next) => {
  try {
    // TODO: Implement getting all tables for a connection
    const connectionId = req.params.id;
    const tables = await databaseService.getAllTables(connectionId);
    res.json(tables);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:id/tables/:table/schema
 * Get table schema
 */
router.get('/:table/schema', async (req, res, next) => {
  try {
    // TODO: Implement getting table schema
    const { id, table } = req.params;
    const schema = await databaseService.getTableSchema(id, table);
    res.json(schema);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:id/tables/:table/data
 * Get table data (with pagination)
 */
router.get('/:table/data', async (req, res, next) => {
  try {
    const { id, table } = req.params;
    const { page = 1, limit = 100, sort: sortParam, filter: filterParam } = req.query;
    
    // Parse sort parameter if it's a JSON string
    let sort = sortParam;
    if (typeof sortParam === 'string') {
      try {
        sort = JSON.parse(sortParam);
      } catch (e) {
        // If parsing fails, leave as is (string column name)
      }
    }
    
    // Parse filter parameter if it's a JSON string
    let filter = filterParam;
    if (typeof filterParam === 'string') {
      try {
        filter = JSON.parse(filterParam);
      } catch (e) {
        // If parsing fails, use an empty filter
        filter = {};
      }
    }
    
    const data = await databaseService.getTableData(id, table, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      filter
    });
    
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/connections/:id/tables/:table/data/sample
 * Get a sample of table data
 */
router.get('/:table/data/sample', async (req, res, next) => {
  try {
    const { id, table } = req.params;
    const { limit = 10 } = req.query;
    
    const sample = await databaseService.getTableSample(id, table, parseInt(limit));
    res.json(sample);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
