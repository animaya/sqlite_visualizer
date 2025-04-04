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
 * @returns {Promise<Object>} Created connection with ID
 * @throws {Error} If required fields are missing or validation fails
 */
async function create(connectionData) {
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
    const existingByPath = await appDbService.get('SELECT id FROM connections WHERE path = ?', [connectionData.path]);
    if (existingByPath) {
      throw new Error(`A connection to '${connectionData.path}' already exists`);
    }
    
    // Prepare timestamp and defaults
    const timestamp = connectionData.last_accessed || new Date().toISOString();
    const size = connectionData.size_bytes || 0;
    const tableCount = connectionData.table_count || 0;
    const isValid = connectionData.is_valid !== undefined ? connectionData.is_valid : true;
    
    // Execute the insertion
    // Convert boolean to integer (0 or 1) for SQLite compatibility
    const info = await appDbService.run(`
      INSERT INTO connections (
        name, 
        path, 
        last_accessed, 
        size_bytes, 
        table_count, 
        is_valid
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      connectionData.name,
      connectionData.path,
      timestamp,
      size,
      tableCount,
      isValid ? 1 : 0
    ]);
    
    // Return the created connection with ID
    return {
      id: info.lastID,
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
 * @returns {Promise<Object|null>} Connection object or null if not found
 */
async function findById(id) {
  if (!id) {
    return null;
  }
  
  try {
    // Execute the query
    const connection = await appDbService.get('SELECT * FROM connections WHERE id = ?', [id]);
    return connection || null;
  } catch (error) {
    console.error(`Error finding connection with ID ${id}:`, error);
    throw new Error(`Failed to find connection: ${error.message}`);
  }
}

/**
 * Find a connection by path
 * @param {string} path - Path to the database file
 * @returns {Promise<Object|null>} Connection object or null if not found
 */
async function findByPath(path) {
  if (!path) {
    return null;
  }
  
  try {
    // Execute the query
    const connection = await appDbService.get('SELECT * FROM connections WHERE path = ?', [path]);
    return connection || null;
  } catch (error) {
    console.error(`Error finding connection with path ${path}:`, error);
    throw new Error(`Failed to find connection by path: ${error.message}`);
  }
}

/**
 * Update the last accessed timestamp for a connection
 * @param {number} id - Connection ID
 * @returns {Promise<boolean>} True if updated successfully
 */
async function updateLastAccessed(id) {
  if (!id) {
    return false;
  }
  
  try {
    const result = await appDbService.run(
      'UPDATE connections SET last_accessed = ? WHERE id = ?', 
      [new Date().toISOString(), id]
    );
    
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
 * @returns {Promise<Array>} Array of connection objects
 */
async function findAll(options = {}) {
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
      // Convert boolean to integer (0 or 1) for SQLite compatibility
      params.push(1);
    }
    
    query += ` ORDER BY ${safeSort} ${sortDir === 'asc' ? 'ASC' : 'DESC'}`;
    
    // Execute the query
    const connections = await appDbService.all(query, params);
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
 * @returns {Promise<Object>} Updated connection
 * @throws {Error} If connection not found or validation fails
 */
async function update(id, connectionData) {
  try {
    // Get current connection
    const currentConnection = await findById(id);
    
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
      // Convert boolean to integer (0 or 1) for SQLite compatibility
      params.push(connectionData.is_valid ? 1 : 0);
    }
    
    // If no updates, return the current connection
    if (updates.length === 0) {
      return currentConnection;
    }
    
    // Add ID to params
    params.push(id);
    
    // Execute the update
    await appDbService.run(`
      UPDATE connections 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
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
 * @returns {Promise<boolean>} True if deleted successfully, false if connection not found
 * @throws {Error} If an error occurs during deletion
 */
async function remove(id) {
  if (!id) {
    throw new Error('Connection ID is required for deletion');
  }
  
  try {
    // First check if the connection exists
    const connection = await findById(id);
    if (!connection) {
      return false;
    }
    
    // Perform the deletion
    const result = await appDbService.run('DELETE FROM connections WHERE id = ?', [id]);
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