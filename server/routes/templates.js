/**
 * Templates Route Handler
 * 
 * Handles all API endpoints related to insight templates
 */

const express = require('express');
const router = express.Router();
const templateService = require('../services/templateService');

/**
 * GET /api/templates
 * List all insight templates
 */
router.get('/', async (req, res, next) => {
  try {
    // TODO: Implement getting all templates
    const templates = await templateService.getAllTemplates();
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:id
 * Get template details
 */
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: Implement getting template by ID
    const template = await templateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates/:id/apply
 * Apply template to selected data
 */
router.post('/:id/apply', async (req, res, next) => {
  try {
    // TODO: Implement applying a template to data
    const { connectionId, tableNames, mappings } = req.body;
    
    const result = await templateService.applyTemplate(
      req.params.id,
      connectionId,
      tableNames,
      mappings
    );
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
