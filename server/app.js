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
const net = require('net');
const fs = require('fs');
const os = require('os');

// Import routes
const connectionsRoutes = require('./routes/connections');
const tablesRoutes = require('./routes/tables');
const visualizationsRoutes = require('./routes/visualizations');
const templatesRoutes = require('./routes/templates');
const exportRoutes = require('./routes/export');

// Import services needed for initialization
const appDbService = require('./services/appDbService');

// Import services needed for initialization
const appDbService = require('./services/appDbService');

// Import error handling middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const DEFAULT_PORT = process.env.PORT || 8765;
const PORT_INFO_FILE = path.join(os.tmpdir(), 'sqlite-visualizer-server-port.txt');

/**
 * Checks if a port is in use
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - True if the port is available, false if it's in use
 */
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
};

/**
 * Find an available port starting from the default port
 * @param {number} startPort - The port to start checking from
 * @returns {Promise<number>} - An available port
 */
const findAvailablePort = async (startPort) => {
  let port = startPort;
  const MAX_PORT = startPort + 50; // Don't check indefinitely
  
  while (port < MAX_PORT) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port++;
  }
  
  // If we can't find a free port, return the original port and let the system handle the error
  console.warn(`Could not find an available port. Will try using the default port: ${startPort}`);
  return startPort;
};

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    return callback(null, true); // Allow all origins in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Add additional debugging for requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body));
  }
  next();
});
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add a simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Start server with graceful handling
let server = null;

const startServer = async () => {
  try {
    // Initialize the application database explicitly before starting the server
    console.log('Initializing application database...');
    appDbService.initializeDatabase();
    console.log('Application database initialized.');

    const availablePort = await findAvailablePort(DEFAULT_PORT);

    server = app.listen(availablePort, () => {
      console.log(`Server running on port ${availablePort}`);
      
      // Save the port to a file that can be read by other processes
      try {
        fs.writeFileSync(PORT_INFO_FILE, availablePort.toString());
      } catch (err) {
        console.warn('Failed to write port info file:', err);
      }
      
      // Export the actual port for the client to use
      process.env.ACTUAL_SERVER_PORT = availablePort.toString();
    });
    
    // Handle graceful shutdown
    const gracefulShutdown = () => {
      console.log('Received shutdown signal, closing server...');
      
      // Remove the port info file
      try {
        if (fs.existsSync(PORT_INFO_FILE)) {
          fs.unlinkSync(PORT_INFO_FILE);
        }
      } catch (err) {
        console.warn('Failed to remove port info file:', err);
      }
      
      server.close(() => {
        console.log('Server closed successfully');
        // Close the application database connection on shutdown
        appDbService.closeDatabase();
        console.log('Application database connection closed.');
        process.exit(0);
      });

      // Force close after 10s if graceful shutdown fails
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Update the start-dev.js script to read the server port
const getServerPort = () => {
  try {
    if (fs.existsSync(PORT_INFO_FILE)) {
      const port = fs.readFileSync(PORT_INFO_FILE, 'utf8');
      return parseInt(port, 10);
    }
  } catch (err) {
    console.warn('Failed to read server port info file:', err);
  }
  
  return null;
};

// Export the getServerPort function for other modules to use
app.getServerPort = getServerPort;

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, getServerPort };
