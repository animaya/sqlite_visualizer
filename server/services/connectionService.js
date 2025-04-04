/**
 * Connection Service
 * 
 * Handles database connection management, storage, and health checks
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const appDbService = require('./appDbService');
const dbUtils = require('../utils/dbUtils');
const connectionModel = require('../models/connection');

// Map of active connections to avoid creating duplicate connections
const activeConnections = new Map();

/**
 * Get all stored database connections
 * @returns {Promise<Array>} List of all database connections
 */
async function getAllConnections() {
  try {
    const connections = await connectionModel.findAll();
    return connections;
  } catch (error) {
    console.error('Error retrieving connections:', error);
    throw new Error('Failed to retrieve database connections');
  }
}

/**
 * Create a new database connection
 * @param {Object} connectionData - Connection details
 * @param {string} connectionData.name - Connection name
 * @param {string} connectionData.path - Path to SQLite database file
 * @returns {Promise<Object>} Created connection details
 * @throws {Error} If validation fails or connection cannot be established
 */
async function createConnection(connectionData) {
  try {
    console.log("Creating connection with data:", JSON.stringify(connectionData));
    
    // Validate connection parameters
    if (!connectionData.name) {
      const error = new Error('Connection name is required');
      error.statusCode = 400;
      throw error;
    }
    
    if (!connectionData.path) {
      const error = new Error('Database path is required');
      error.statusCode = 400;
      throw error;
    }
    
    // Normalize path to handle any OS-specific issues
    const normalizedPath = path.normalize(connectionData.path);
    console.log("Normalized path:", normalizedPath);
    
    // Check that the file exists
    try {
      const fileStats = fs.statSync(normalizedPath);
      if (!fileStats.isFile()) {
        const error = new Error(`Path exists but is not a file: ${normalizedPath}`);
        error.statusCode = 400;
        throw error;
      }
      console.log("File stats:", {
        size: fileStats.size,
        isFile: fileStats.isFile(),
        path: normalizedPath
      });
    } catch (fsError) {
      console.error("File system error:", fsError);
      if (fsError.code === 'ENOENT') {
        const error = new Error(`Database file not found at path: ${normalizedPath}`);
        error.statusCode = 404;
        error.code = 'ENOENT';
        error.path = normalizedPath;
        throw error;
      }
      // Rethrow with more context
      const error = new Error(`Error accessing database file: ${fsError.message}`);
      error.statusCode = 400;
      error.originalError = fsError;
      throw error;
    }
    
    // Validate that the file is a valid SQLite database
    console.log("Validating SQLite database...");
    const isValid = await dbUtils.validateDatabase(normalizedPath);
    if (!isValid) {
      const error = new Error(`Invalid SQLite database file: ${normalizedPath}`);
      error.statusCode = 400;
      throw error;
    }
    
    // Get database size and table count
    const sizeBytes = dbUtils.getDatabaseSize(normalizedPath);
    
    // Create a temporary connection to get table count
    console.log("Getting table count...");
    let tempDb;
    try {
      tempDb = new sqlite3.Database(normalizedPath, sqlite3.OPEN_READONLY);
      const tableCount = await dbUtils.getTableCount(tempDb);
      
      // Close the temporary connection
      tempDb.close();
      
      // Save connection to database
      console.log("Saving connection to app database...");
      const newConnection = await connectionModel.create({
        name: connectionData.name,
        path: normalizedPath,
        size_bytes: sizeBytes,
        table_count: tableCount,
        is_valid: true,
        last_accessed: new Date().toISOString()
      });
      
      console.log("Connection created successfully:", newConnection);
      return newConnection;
    } catch (dbError) {
      if (tempDb) {
        tempDb.close();
      }
      console.error("Database error during connection creation:", dbError);
      const error = new Error(`Database error: ${dbError.message}`);
      error.statusCode = 400;
      error.originalError = dbError;
      throw error;
    }
  } catch (error) {
    console.error('Error creating connection:', error);
    // Ensure the error has a status code
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
}

/**
 * Get a connection by ID
 * @param {string} id - Connection ID
 * @returns {Promise<Object>} Connection details
 * @throws {Error} If connection not found
 */
async function getConnectionById(id) {
  try {
    const connection = await connectionModel.findById(id);
    
    if (!connection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    // Update last accessed timestamp
    await connectionModel.update(id, {
      last_accessed: new Date().toISOString()
    });
    
    return connection;
  } catch (error) {
    console.error(`Error retrieving connection with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a connection
 * @param {string} id - Connection ID
 * @returns {Promise<boolean>} True if deletion was successful
 * @throws {Error} If deletion fails
 */
async function deleteConnection(id) {
  try {
    // Close active connection if it exists
    if (activeConnections.has(id)) {
      const conn = activeConnections.get(id);
      
      // Different close method for sqlite3
      conn.close((err) => {
        if (err) console.error(`Error closing connection ${id}:`, err);
      });
      
      activeConnections.delete(id);
    }
    
    const result = await connectionModel.remove(id);
    
    if (!result) {
      throw new Error(`Failed to delete connection with ID ${id}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting connection with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Check database health and statistics
 * @param {string} id - Connection ID
 * @returns {Promise<Object>} Health statistics
 * @throws {Error} If health check fails
 */
async function checkDatabaseHealth(id) {
  try {
    // Get connection details
    const connection = await getConnectionById(id);
    
    if (!connection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    // Check that the file still exists
    if (!fs.existsSync(connection.path)) {
      // Update connection status
      await connectionModel.update(id, { is_valid: false });
      
      return {
        size_bytes: 0,
        table_count: 0,
        is_valid: false,
        last_checked: new Date().toISOString()
      };
    }
    
    // Get current database size
    const sizeBytes = dbUtils.getDatabaseSize(connection.path);
    
    // Create a temporary connection to get table count
    let isValid = true;
    let tableCount = 0;
    
    try {
      // Create a temporary connection using sqlite3
      const tempDb = new sqlite3.Database(connection.path, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error(`Error opening database ${connection.path}:`, err);
          isValid = false;
        }
      });
      
      if (isValid) {
        tableCount = await dbUtils.getTableCount(tempDb);
        
        // Close the temporary connection
        tempDb.close();
      }
    } catch (error) {
      console.error(`Error connecting to database at ${connection.path}:`, error);
      isValid = false;
    }
    
    // Update connection in database
    await connectionModel.update(id, {
      size_bytes: sizeBytes,
      table_count: tableCount,
      is_valid: isValid
    });
    
    return {
      size_bytes: sizeBytes,
      table_count: tableCount,
      is_valid: isValid,
      last_checked: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error checking health for connection ${id}:`, error);
    throw error;
  }
}

/**
 * Get an active connection to a database
 * @param {string} id - Connection ID
 * @returns {Promise<Object>} SQLite database connection
 * @throws {Error} If connection cannot be established
 */
async function getConnection(id) {
  try {
    // Check if we already have an active connection
    if (activeConnections.has(id)) {
      return activeConnections.get(id);
    }
    
    // Get connection details
    const connection = await getConnectionById(id);
    
    if (!connection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    // Check if database file still exists
    if (!fs.existsSync(connection.path)) {
      // Update connection status
      await connectionModel.update(id, { is_valid: false });
      throw new Error(`Database file not found at path: ${connection.path}`);
    }
    
    // Create a simple database connection
    const db = new sqlite3.Database(connection.path, sqlite3.OPEN_READONLY);
    
    // Store in active connections map
    activeConnections.set(id, db);
    
    // Update last accessed timestamp
    await connectionModel.update(id, {
      last_accessed: new Date().toISOString()
    });
    
    return db;
  } catch (error) {
    console.error(`Error getting connection for ID ${id}:`, error);
    throw error;
  }
}

module.exports = {
  getAllConnections,
  createConnection,
  getConnectionById,
  deleteConnection,
  checkDatabaseHealth,
  getConnection
};