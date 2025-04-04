# Data Validator Middleware Documentation

## Overview

The `dataValidator.js` middleware provides request validation for the SQLite Visualizer application. It uses the popular [Joi](https://joi.dev/) validation library to ensure that the data received by the API endpoints meets the expected format and constraints.

## Features

- Validates request body, query parameters, and path parameters
- Returns standardized error responses
- Sanitizes input data
- Includes pre-defined schemas for common application entities

## Usage

### Basic Usage

```javascript
const { validateBody, validateParams, validateQuery, schemas } = require('../middleware/dataValidator');

// Example route with body validation
router.post('/resource', 
  validateBody(someSchema),
  (req, res) => {
    // req.body is now validated and sanitized
    // ...
  }
);

// Example route with path parameter validation
router.get('/resource/:id', 
  validateParams(someParamSchema),
  (req, res) => {
    // req.params is now validated
    // ...
  }
);

// Example route with query validation
router.get('/resources', 
  validateQuery(someQuerySchema),
  (req, res) => {
    // req.query is now validated and sanitized
    // ...
  }
);
```

### Validation Options

The validator middleware uses the following Joi options:

- `abortEarly: false` - Returns all errors instead of stopping at the first error
- `stripUnknown: true` - Removes unknown keys from the validated object
- `errors.wrap.label: ''` - Improves error message readability

## Pre-defined Schemas

### Connection Schemas

- `schemas.connection.create` - For creating a new connection
  - Required fields: `name`, `path`
  
- `schemas.connection.id` - For validating connection IDs
  - Required fields: `id` (positive integer)

### Visualization Schemas

- `schemas.visualization.create` - For creating a new visualization
  - Required fields: `connection_id`, `name`, `type`, `config`, `table_name`
  - Valid visualization types: `bar`, `pie`, `line`, `scatter`, `area`
  
- `schemas.visualization.id` - For validating visualization IDs
  - Required fields: `id` (positive integer)
  
- `schemas.visualization.update` - For updating a visualization
  - Optional fields: `name`, `type`, `config`
  - At least one field must be provided

### Table Data Schemas

- `schemas.table.query` - For querying table data
  - Optional fields: `page`, `limit`, `sort`, `order`, `filter`
  - Default values: `page=1`, `limit=100`, `order='asc'`

### Export Schemas

- `schemas.export.csv` - For CSV export options
  - Optional fields: `format`
  - Default values: `format='csv'`

## Example Error Response

When validation fails, the middleware returns a response with status code 400 and a JSON body:

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    "Connection name is required",
    "Database path is required"
  ]
}
```

## Custom Validation Schemas

You can create custom validation schemas for specific routes:

```javascript
const Joi = require('joi');

const customSchema = Joi.object({
  field1: Joi.string().required()
    .messages({
      'string.empty': 'Field 1 is required'
    }),
  field2: Joi.number().min(1).max(100)
    .messages({
      'number.min': 'Field 2 must be at least 1',
      'number.max': 'Field 2 cannot exceed 100'
    })
});

router.post('/custom-endpoint', 
  validateBody(customSchema),
  (req, res) => {
    // Handle request
  }
);
```

## Best Practices

1. Use specific error messages that guide the user on how to fix the issue
2. Keep validation logic separate from business logic
3. Use schema composition to reuse common validation patterns
4. Consider performance implications of complex validations
5. Always validate and sanitize user input to prevent security issues

## Extending the Validator

To add new schemas, modify the `schemas` object in `dataValidator.js`:

```javascript
// Add new schema
schemas.newResource = {
  create: Joi.object({ /* ... */ }),
  update: Joi.object({ /* ... */ }),
  id: Joi.object({ /* ... */ })
};
```
