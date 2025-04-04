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
    // TODO: Implement exporting visualization as CSV
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
    // TODO: Implement exporting table as CSV
    const { connectionId, tableName } = req.params;
    
    const { data, filename } = await exportService.exportTableAsCsv(connectionId, tableName);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
