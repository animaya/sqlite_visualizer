/**
 * SQLite Visualizer - Main Server Application
 * 
 * This is the entry point for the SQLite Visualizer backend application.
 * It sets up Express, middleware, and routes.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const connectionsRoutes = require('./routes/connections');
const tablesRoutes = require('./routes/tables');
const visualizationsRoutes = require('./routes/visualizations');
const templatesRoutes = require('./routes/templates');
const exportRoutes = require('./routes/export');

// Import error handling middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.use('/api/connections', connectionsRoutes);
app.use('/api/connections/:id/tables', tablesRoutes);
app.use('/api/visualizations', visualizationsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/export', exportRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
