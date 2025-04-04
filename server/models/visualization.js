/**
 * Visualization Model
 * 
 * Represents a saved visualization in the application
 */

/**
 * Visualization schema:
 * {
 *   id: number,
 *   connection_id: number,
 *   name: string,
 *   type: string,
 *   config: JSON string,
 *   table_name: string,
 *   created_at: timestamp,
 *   updated_at: timestamp
 * }
 */

const appDbService = require('../services/appDbService');

/**
 * Create a new visualization record
 * @param {Object} visualizationData - Visualization details
 * @returns {Object} Created visualization with ID
 */
function create(visualizationData) {
  const db = appDbService.getDb();
  
  try {
    // Prepare SQL statement for insertion
    const stmt = db.prepare(`
      INSERT INTO saved_visualizations (
        connection_id,
        name,
        type,
        config,
        table_name,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    
    // Make sure config is a string if it's an object
    let configStr = visualizationData.config;
    if (typeof configStr === 'object') {
      configStr = JSON.stringify(configStr);
    }
    
    // Execute the insertion
    const info = stmt.run(
      visualizationData.connection_id || null,
      visualizationData.name,
      visualizationData.type,
      configStr,
      visualizationData.table_name || null,
      now,
      now
    );
    
    // Return the created visualization with ID
    return {
      id: info.lastInsertRowid,
      ...visualizationData,
      created_at: now,
      updated_at: now
    };
  } catch (error) {
    console.error('Error creating visualization record:', error);
    throw new Error('Failed to create visualization record');
  }
}

/**
 * Find a visualization by ID
 * @param {number} id - Visualization ID
 * @returns {Object|null} Visualization object or null if not found
 */
function findById(id) {
  const db = appDbService.getDb();
  
  try {
    // Prepare and execute the query
    const stmt = db.prepare('SELECT * FROM saved_visualizations WHERE id = ?');
    const visualization = stmt.get(id);
    
    if (!visualization) {
      return null;
    }
    
    // Parse config JSON
    try {
      visualization.config = JSON.parse(visualization.config);
    } catch (e) {
      console.warn(`Failed to parse config JSON for visualization ${id}:`, e);
      // Leave as-is if parsing fails
    }
    
    return visualization;
  } catch (error) {
    console.error(`Error finding visualization with ID ${id}:`, error);
    throw new Error('Failed to find visualization');
  }
}

/**
 * Find all visualizations
 * @param {Object} filters - Optional filters
 * @returns {Array} Array of visualization objects
 */
function findAll(filters = {}) {
  const db = appDbService.getDb();
  
  try {
    let query = 'SELECT * FROM saved_visualizations';
    const params = [];
    
    // Apply filters if provided
    if (filters && Object.keys(filters).length > 0) {
      const filterClauses = [];
      
      if (filters.connection_id) {
        filterClauses.push('connection_id = ?');
        params.push(filters.connection_id);
      }
      
      if (filters.type) {
        filterClauses.push('type = ?');
        params.push(filters.type);
      }
      
      if (filters.table_name) {
        filterClauses.push('table_name = ?');
        params.push(filters.table_name);
      }
      
      if (filterClauses.length > 0) {
        query += ' WHERE ' + filterClauses.join(' AND ');
      }
    }
    
    // Add default ordering
    query += ' ORDER BY updated_at DESC';
    
    // Execute the query
    const stmt = db.prepare(query);
    const visualizations = stmt.all(...params);
    
    // Parse config JSON for each visualization
    return visualizations.map(viz => {
      try {
        viz.config = JSON.parse(viz.config);
      } catch (e) {
        console.warn(`Failed to parse config JSON for visualization ${viz.id}:`, e);
        // Leave as-is if parsing fails
      }
      return viz;
    });
  } catch (error) {
    console.error('Error finding all visualizations:', error);
    throw new Error('Failed to retrieve visualizations');
  }
}

/**
 * Update a visualization
 * @param {number} id - Visualization ID
 * @param {Object} visualizationData - Updated visualization details
 * @returns {Object} Updated visualization
 */
function update(id, visualizationData) {
  const db = appDbService.getDb();
  
  try {
    // Get current visualization
    const currentVisualization = findById(id);
    
    if (!currentVisualization) {
      throw new Error(`Visualization with ID ${id} not found`);
    }
    
    // Build SET clause and parameters dynamically based on provided data
    const updates = [];
    const params = [];
    
    if (visualizationData.connection_id !== undefined) {
      updates.push('connection_id = ?');
      params.push(visualizationData.connection_id);
    }
    
    if (visualizationData.name !== undefined) {
      updates.push('name = ?');
      params.push(visualizationData.name);
    }
    
    if (visualizationData.type !== undefined) {
      updates.push('type = ?');
      params.push(visualizationData.type);
    }
    
    if (visualizationData.config !== undefined) {
      updates.push('config = ?');
      // Make sure config is a string if it's an object
      let configStr = visualizationData.config;
      if (typeof configStr === 'object') {
        configStr = JSON.stringify(configStr);
      }
      params.push(configStr);
    }
    
    if (visualizationData.table_name !== undefined) {
      updates.push('table_name = ?');
      params.push(visualizationData.table_name);
    }
    
    // Always update the updated_at timestamp
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    
    // If no updates, return the current visualization
    if (updates.length === 0) {
      return currentVisualization;
    }
    
    // Add ID to params
    params.push(id);
    
    // Prepare and execute the update
    const stmt = db.prepare(`
      UPDATE saved_visualizations 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...params);
    
    // Return updated visualization
    return findById(id);
  } catch (error) {
    console.error(`Error updating visualization with ID ${id}:`, error);
    throw new Error('Failed to update visualization');
  }
}

/**
 * Remove a visualization
 * @param {number} id - Visualization ID
 * @returns {boolean} True if deleted successfully
 */
function remove(id) {
  const db = appDbService.getDb();
  
  try {
    // Prepare and execute the deletion
    const stmt = db.prepare('DELETE FROM saved_visualizations WHERE id = ?');
    const result = stmt.run(id);
    
    return result.changes > 0;
  } catch (error) {
    console.error(`Error removing visualization with ID ${id}:`, error);
    throw new Error('Failed to remove visualization');
  }
}

module.exports = {
  create,
  findById,
  findAll,
  update,
  remove
};
