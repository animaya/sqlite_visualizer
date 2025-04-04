/**
 * Validation Middleware Example
 * 
 * This file demonstrates how to use the dataValidator middleware in routes
 */

const express = require('express');
const router = express.Router();
const { validateBody, validateParams, validateQuery, schemas } = require('../middleware/dataValidator');

// Example 1: Validate request body when creating a connection
router.post('/connections', 
  validateBody(schemas.connection.create),
  (req, res) => {
    // By this point, req.body has been validated and sanitized
    const { name, path } = req.body;
    
    // Your connection creation logic here
    
    res.status(201).json({
      success: true,
      message: 'Connection created successfully',
      data: { id: 1, name, path }
    });
  }
);

// Example 2: Validate path parameters when getting a connection
router.get('/connections/:id', 
  validateParams(schemas.connection.id),
  (req, res) => {
    // By this point, req.params.id has been validated as a positive integer
    const { id } = req.params;
    
    // Your get connection logic here
    
    res.json({
      success: true,
      data: {
        id: Number(id),
        name: 'Sample Database',
        path: '/path/to/database.sqlite'
      }
    });
  }
);

// Example 3: Validate query parameters when listing table data
router.get('/connections/:id/tables/:table/data', 
  validateParams(schemas.connection.id),
  validateQuery(schemas.table.query),
  (req, res) => {
    const { id } = req.params;
    const { page, limit, sort, order } = req.query;
    
    // Your table data retrieval logic here
    
    res.json({
      success: true,
      data: {
        pagination: {
          page,
          limit,
          total: 100
        },
        sort: sort || null,
        order: order || 'asc',
        rows: []
      }
    });
  }
);

// Example 4: Validate request body when creating a visualization with nested objects
router.post('/visualizations', 
  validateBody(schemas.visualization.create),
  (req, res) => {
    // By this point, the complex nested objects in req.body have been validated
    const { connection_id, name, type, config, table_name } = req.body;
    
    // Your visualization creation logic here
    
    res.status(201).json({
      success: true,
      message: 'Visualization created successfully',
      data: {
        id: 1,
        connection_id,
        name,
        type,
        table_name
      }
    });
  }
);

// Example 5: Validate partial updates
router.patch('/visualizations/:id',
  validateParams(schemas.visualization.id),
  validateBody(schemas.visualization.update),
  (req, res) => {
    const { id } = req.params;
    
    // Any fields in req.body have been validated
    // This schema requires at least one field to be provided
    
    res.json({
      success: true,
      message: 'Visualization updated successfully',
      data: {
        id: Number(id),
        ...req.body
      }
    });
  }
);

module.exports = router;

// Usage in app.js:
/*
const app = express();
const validationExampleRoutes = require('./examples/validationExample');

app.use('/api/examples', validationExampleRoutes);
*/
