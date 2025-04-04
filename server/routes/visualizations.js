/**
 * Visualizations Route Handler
 * 
 * Handles all API endpoints related to visualizations
 */

const express = require('express');
const router = express.Router();
const visualizationService = require('../services/visualizationService');

/**
 * POST /api/visualizations
 * Create a new visualization
 */
router.post('/', async (req, res, next) => {
  try {
    // TODO: Implement creating a new visualization
    const newVisualization = await visualizationService.createVisualization(req.body);
    res.status(201).json(newVisualization);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/visualizations
 * List all saved visualizations
 */
router.get('/', async (req, res, next) => {
  try {
    // TODO: Implement listing all visualizations
    const visualizations = await visualizationService.getAllVisualizations();
    res.json(visualizations);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/visualizations/:id
 * Get visualization details
 */
router.get('/:id', async (req, res, next) => {
  try {
    // TODO: Implement getting visualization by ID
    const visualization = await visualizationService.getVisualizationById(req.params.id);
    if (!visualization) {
      return res.status(404).json({ message: 'Visualization not found' });
    }
    res.json(visualization);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/visualizations/:id
 * Update a visualization
 */
router.put('/:id', async (req, res, next) => {
  try {
    // TODO: Implement updating a visualization
    const updatedVisualization = await visualizationService.updateVisualization(
      req.params.id,
      req.body
    );
    res.json(updatedVisualization);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/visualizations/:id
 * Delete a visualization
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // TODO: Implement deleting a visualization
    await visualizationService.deleteVisualization(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
