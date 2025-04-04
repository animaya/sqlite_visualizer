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
      throw new Error('Connection name is required');
    }
    
    if (!connectionData.path) {
      throw new Error('Database path is required');
    }
    
    // Check that the file exists
    if (!fs.existsSync(connectionData.path)) {
      throw new Error(`Database file not found at path: ${connectionData.path}`);
    }
    
    // Validate that the file is a valid SQLite database
    const isValid = await dbUtils.validateDatabase(connectionData.path);
    if (!isValid) {
      throw new Error('Invalid SQLite database file');
    }
    
    // Get database size and table count
    const sizeBytes = dbUtils.getDatabaseSize(connectionData.path);
    
    // Create a temporary connection to get table count
    const tempDb = new sqlite3.Database(connectionData.path, sqlite3.OPEN_READONLY);
    const tableCount = await dbUtils.getTableCount(tempDb);
    
    // Close the temporary connection
    tempDb.close();
    
    // Save connection to database
    const newConnection = await connectionModel.create({
      name: connectionData.name,
      path: connectionData.path,
      size_bytes: sizeBytes,
      table_count: tableCount,
      is_valid: true,
      last_accessed: new Date().toISOString()
    });
    
    return newConnection;
  } catch (error) {
    console.error('Error creating connection:', error);
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
    
    // Create a new connection (readonly for safety)
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(connection.path, sqlite3.OPEN_READONLY, async (err) => {
        if (err) {
          console.error(`Error opening database: ${err.message}`);
          reject(new Error(`Failed to connect to database: ${err.message}`));
          return;
        }
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
        
        // Add promise wrapper methods for convenience
        db.all = (sql, params = []) => {
          return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            });
          });
        };
        
        db.get = (sql, params = []) => {
          return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
        };
        
        db.run = (sql, params = []) => {
          return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
              if (err) reject(err);
              else resolve({ lastID: this.lastID, changes: this.changes });
            });
          });
        };
        
        // Store in active connections map
        activeConnections.set(id, db);
        
        // Update last accessed timestamp
        try {
          await connectionModel.update(id, {
            last_accessed: new Date().toISOString()
          });
        } catch (updateError) {
          console.warn(`Warning: Failed to update last_accessed: ${updateError.message}`);
          // Continue anyway - this is not critical
        }
        
        resolve(db);
      });
    });
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