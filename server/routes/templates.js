/**
 * Templates Route Handler
 * 
 * Handles all API endpoints related to insight templates
 */

const express = require('express');
const router = express.Router();
const templateService = require('../services/templateService');
const templateModel = require('../models/template');

/**
 * GET /api/templates/categories
 * Get all unique template categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await templateService.getTemplateCategories();
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates
 * List all insight templates
 */
router.get('/', async (req, res, next) => {
  try {
    // Get filters from query parameters
    const filters = {};
    
    if (req.query.category) {
      filters.category = req.query.category;
    }
    
    if (req.query.type) {
      filters.type = req.query.type;
    }
    
    if (req.query.isDefault !== undefined) {
      filters.isDefault = req.query.isDefault === 'true';
    }
    
    if (req.query.search) {
      filters.search = req.query.search;
    }
    
    const templates = await templateService.getAllTemplates(filters);
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
 * POST /api/templates
 * Create a new template
 */
router.post('/', async (req, res, next) => {
  try {
    const templateData = req.body;
    const createdTemplate = await templateModel.create(templateData);
    res.status(201).json(createdTemplate);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/templates/:id
 * Update an existing template
 */
router.put('/:id', async (req, res, next) => {
  try {
    const templateData = req.body;
    const updatedTemplate = await templateModel.update(req.params.id, templateData);
    
    if (!updatedTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json(updatedTemplate);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await templateModel.remove(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/templates/:id/requirements
 * Get template field requirements
 */
router.get('/:id/requirements', async (req, res, next) => {
  try {
    const requirements = await templateService.getTemplateRequirements(req.params.id);
    res.json(requirements);
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
