/**
 * Connection Model
 * 
 * Represents a database connection in the application.
 * This model handles CRUD operations for SQLite database connections
 * that users create and access through the visualizer.
 */

/**
 * Connection schema:
 * {
 *   id: number,             // Unique identifier
 *   name: string,           // User-friendly connection name
 *   path: string,           // Absolute path to the SQLite database file
 *   last_accessed: timestamp, // When the connection was last used
 *   size_bytes: number,     // Size of the database file in bytes
 *   table_count: number,    // Number of tables in the database
 *   is_valid: boolean       // Whether the connection is still valid
 * }
 */

const appDbService = require('../services/appDbService');

/**
 * Create a new connection record
 * @param {Object} connectionData - Connection details
 * @returns {Object} Created connection with ID
 * @throws {Error} If required fields are missing or validation fails
 */
function create(connectionData) {
  // Validate required fields
  if (!connectionData.name) {
    throw new Error('Connection name is required');
  }
  
  if (!connectionData.path) {
    throw new Error('Database path is required');
  }
  
  const db = appDbService.getDb();
  
  try {
    // Check if a connection with the same path already exists
    const existingByPath = db.prepare('SELECT id FROM connections WHERE path = ?').get(connectionData.path);
    if (existingByPath) {
      throw new Error(`A connection to '${connectionData.path}' already exists`);
    }
    
    // Prepare timestamp and defaults
    const timestamp = connectionData.last_accessed || new Date().toISOString();
    const size = connectionData.size_bytes || 0;
    const tableCount = connectionData.table_count || 0;
    const isValid = connectionData.is_valid !== undefined ? connectionData.is_valid : true;
    
    // Prepare SQL statement for insertion
    const stmt = db.prepare(`
      INSERT INTO connections (
        name, 
        path, 
        last_accessed, 
        size_bytes, 
        table_count, 
        is_valid
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    // Execute the insertion
    const info = stmt.run(
      connectionData.name,
      connectionData.path,
      timestamp,
      size,
      tableCount,
      isValid
    );
    
    // Return the created connection with ID
    return {
      id: info.lastInsertRowid,
      name: connectionData.name,
      path: connectionData.path,
      last_accessed: timestamp,
      size_bytes: size,
      table_count: tableCount,
      is_valid: isValid
    };
  } catch (error) {
    console.error('Error creating connection record:', error);
    
    // More specific error message for SQLite constraint errors
    if (error.code === 'SQLITE_CONSTRAINT') {
      throw new Error('Connection could not be created due to a constraint violation');
    }
    
    throw new Error('Failed to create connection record: ' + error.message);
  }
}

/**
 * Find a connection by ID
 * @param {number} id - Connection ID
 * @returns {Object|null} Connection object or null if not found
 */
function findById(id) {
  if (!id) {
    return null;
  }
  
  const db = appDbService.getDb();
  
  try {
    // Prepare and execute the query
    const stmt = db.prepare('SELECT * FROM connections WHERE id = ?');
    const connection = stmt.get(id);
    
    return connection || null;
  } catch (error) {
    console.error(`Error finding connection with ID ${id}:`, error);
    throw new Error(`Failed to find connection: ${error.message}`);
  }
}

/**
 * Find a connection by path
 * @param {string} path - Path to the database file
 * @returns {Object|null} Connection object or null if not found
 */
function findByPath(path) {
  if (!path) {
    return null;
  }
  
  const db = appDbService.getDb();
  
  try {
    // Prepare and execute the query
    const stmt = db.prepare('SELECT * FROM connections WHERE path = ?');
    const connection = stmt.get(path);
    
    return connection || null;
  } catch (error) {
    console.error(`Error finding connection with path ${path}:`, error);
    throw new Error(`Failed to find connection by path: ${error.message}`);
  }
}

/**
 * Update the last accessed timestamp for a connection
 * @param {number} id - Connection ID
 * @returns {boolean} True if updated successfully
 */
function updateLastAccessed(id) {
  if (!id) {
    return false;
  }
  
  const db = appDbService.getDb();
  
  try {
    const stmt = db.prepare('UPDATE connections SET last_accessed = ? WHERE id = ?');
    const result = stmt.run(new Date().toISOString(), id);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`Error updating last accessed timestamp for connection ${id}:`, error);
    // We don't throw here as this is a non-critical update
    return false;
  }
}

/**
 * Find all connections
 * @param {Object} options - Optional query parameters
 * @param {string} options.sortBy - Field to sort by (default: 'last_accessed')
 * @param {string} options.sortDir - Sort direction: 'asc' or 'desc' (default: 'desc')
 * @param {boolean} options.validOnly - If true, only return valid connections
 * @returns {Array} Array of connection objects
 */
function findAll(options = {}) {
  const db = appDbService.getDb();
  
  try {
    // Default options
    const sortBy = options.sortBy || 'last_accessed';
    const sortDir = options.sortDir || 'desc';
    const validOnly = options.validOnly || false;
    
    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['id', 'name', 'path', 'last_accessed', 'size_bytes', 'table_count'];
    const safeSort = allowedSortFields.includes(sortBy) ? sortBy : 'last_accessed';
    
    // Build the query
    let query = 'SELECT * FROM connections';
    const params = [];
    
    if (validOnly) {
      query += ' WHERE is_valid = ?';
      params.push(true);
    }
    
    query += ` ORDER BY ${safeSort} ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    
    // Prepare and execute the query
    const stmt = db.prepare(query);
    const connections = params.length > 0 ? stmt.all(...params) : stmt.all();
    
    return connections || [];
  } catch (error) {
    console.error('Error finding connections:', error);
    throw new Error('Failed to retrieve connections');
  }
}

/**
 * Update a connection
 * @param {number} id - Connection ID
 * @param {Object} connectionData - Updated connection details
 * @returns {Object} Updated connection
 * @throws {Error} If connection not found or validation fails
 */
function update(id, connectionData) {
  const db = appDbService.getDb();
  
  try {
    // Get current connection
    const currentConnection = findById(id);
    
    if (!currentConnection) {
      throw new Error(`Connection with ID ${id} not found`);
    }
    
    // Build SET clause and parameters dynamically based on provided data
    const updates = [];
    const params = [];
    
    if (connectionData.name !== undefined) {
      updates.push('name = ?');
      params.push(connectionData.name);
    }
    
    if (connectionData.path !== undefined) {
      updates.push('path = ?');
      params.push(connectionData.path);
    }
    
    if (connectionData.last_accessed !== undefined) {
      updates.push('last_accessed = ?');
      params.push(connectionData.last_accessed);
    }
    
    if (connectionData.size_bytes !== undefined) {
      updates.push('size_bytes = ?');
      params.push(connectionData.size_bytes);
    }
    
    if (connectionData.table_count !== undefined) {
      updates.push('table_count = ?');
      params.push(connectionData.table_count);
    }
    
    if (connectionData.is_valid !== undefined) {
      updates.push('is_valid = ?');
      params.push(connectionData.is_valid);
    }
    
    // If no updates, return the current connection
    if (updates.length === 0) {
      return currentConnection;
    }
    
    // Add ID to params
    params.push(id);
    
    // Prepare and execute the update
    const stmt = db.prepare(`
      UPDATE connections 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...params);
    
    // Return updated connection
    return findById(id);
  } catch (error) {
    console.error(`Error updating connection with ID ${id}:`, error);
    throw new Error('Failed to update connection');
  }
}

/**
 * Remove a connection
 * @param {number} id - Connection ID
 * @returns {boolean} True if deleted successfully, false if connection not found
 * @throws {Error} If an error occurs during deletion
 */
function remove(id) {
  if (!id) {
    throw new Error('Connection ID is required for deletion');
  }
  
  const db = appDbService.getDb();
  
  try {
    // First check if the connection exists
    const connection = findById(id);
    if (!connection) {
      return false;
    }
    
    // Perform the deletion inside a transaction to ensure atomicity
    const deleteConnection = db.prepare('DELETE FROM connections WHERE id = ?');
    
    // For future reference: if there are related records to delete
    // we'd add those statements here
    
    // Execute as transaction
    const transaction = db.transaction(() => {
      return deleteConnection.run(id);
    });
    
    const result = transaction();
    return result.changes > 0;
  } catch (error) {
    console.error(`Error removing connection with ID ${id}:`, error);
    throw new Error(`Failed to remove connection: ${error.message}`);
  }
}

module.exports = {
  create,
  findById,
  findByPath,
  findAll,
  update,
  remove,
  updateLastAccessed
};
