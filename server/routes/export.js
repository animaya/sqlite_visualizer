/**
 * Export Route Handler
 * 
 * Handles all API endpoints related to exporting data
 */

const express = require('express');
const router = express.Router();
const exportService = require('../services/exportService');

/**
 * GET /api/export/csv/:vizId
 * Export visualization as CSV
 */
router.get('/csv/:vizId', async (req, res, next) => {
  try {
    const { vizId } = req.params;
    
    const { data, filename } = await exportService.exportVisualizationAsCsv(vizId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/csv/table/:connectionId/:tableName
 * Export table as CSV
 */
router.get('/csv/table/:connectionId/:tableName', async (req, res, next) => {
  try {
    const { connectionId, tableName } = req.params;
    const { limit, filter, sort } = req.query;
    
    // Parse export options
    const options = {
      limit: limit ? parseInt(limit) : undefined,
      filter: filter ? JSON.parse(filter) : undefined,
      sort: sort ? JSON.parse(sort) : undefined
    };
    
    const { data, filename } = await exportService.exportTableAsCsv(connectionId, tableName, options);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
