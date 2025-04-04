/**
 * Visualizations Route Handler
 * 
 * Handles all API endpoints related to visualizations
 */

const express = require('express');
const router = express.Router();
const visualizationService = require('../services/visualizationService');
const { validateBody, validateParams, schemas } = require('../middleware/dataValidator');

/**
 * POST /api/visualizations
 * Create a new visualization
 */
router.post('/', 
  validateBody(schemas.visualization.create),
  async (req, res, next) => {
    try {
      const newVisualization = await visualizationService.createVisualization(req.body);
      res.status(201).json({
        success: true,
        message: 'Visualization created successfully',
        data: newVisualization
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/visualizations
 * List all saved visualizations
 */
router.get('/', async (req, res, next) => {
  try {
    const visualizations = await visualizationService.getAllVisualizations();
    res.json({
      success: true,
      data: visualizations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/visualizations/:id
 * Get visualization details
 */
router.get('/:id', 
  validateParams(schemas.visualization.id),
  async (req, res, next) => {
    try {
      const visualization = await visualizationService.getVisualizationById(req.params.id);
      if (!visualization) {
        return res.status(404).json({ 
          success: false,
          message: 'Visualization not found' 
        });
      }
      res.json({
        success: true,
        data: visualization
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/visualizations/:id
 * Update a visualization
 */
router.put('/:id', 
  validateParams(schemas.visualization.id),
  validateBody(schemas.visualization.update),
  async (req, res, next) => {
    try {
      const updatedVisualization = await visualizationService.updateVisualization(
        req.params.id,
        req.body
      );
      
      if (!updatedVisualization) {
        return res.status(404).json({
          success: false,
          message: 'Visualization not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Visualization updated successfully',
        data: updatedVisualization
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/visualizations/:id
 * Delete a visualization
 */
router.delete('/:id', 
  validateParams(schemas.visualization.id),
  async (req, res, next) => {
    try {
      const result = await visualizationService.deleteVisualization(req.params.id);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Visualization not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Visualization deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/visualizations/:id
 * Partially update a visualization
 */
router.patch('/:id', 
  validateParams(schemas.visualization.id),
  validateBody(schemas.visualization.update),
  async (req, res, next) => {
    try {
      const updatedVisualization = await visualizationService.updateVisualization(
        req.params.id,
        req.body
      );
      
      if (!updatedVisualization) {
        return res.status(404).json({
          success: false,
          message: 'Visualization not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Visualization updated successfully',
        data: updatedVisualization
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
