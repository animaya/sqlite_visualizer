/**
 * Visualization Service
 * 
 * Handles visualization creation, storage, and retrieval
 */

const appDbService = require('./appDbService');
const databaseService = require('./databaseService');

/**
 * Create a new visualization
 * @param {Object} visualizationData - Visualization details
 * @param {string} visualizationData.name - Visualization name
 * @param {string} visualizationData.type - Visualization type (bar, line, pie, etc.)
 * @param {Object} visualizationData.config - Visualization configuration
 * @param {string} visualizationData.connectionId - Connection ID
 * @param {string} visualizationData.tableName - Table name
 * @returns {Promise<Object>} Created visualization
 * @throws {Error} If visualization creation fails
 */
async function createVisualization(visualizationData) {
  try {
    // Validate required fields
    if (!visualizationData.name) {
      throw new Error('Visualization name is required');
    }
    
    if (!visualizationData.type) {
      throw new Error('Visualization type is required');
    }
    
    if (!visualizationData.config) {
      throw new Error('Visualization configuration is required');
    }
    
    // Get database
    const db = appDbService.getDb();
    
    // Insert visualization
    const result = db.prepare(`
      INSERT INTO saved_visualizations (
        connection_id,
        name,
        type,
        config,
        table_name
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      visualizationData.connectionId || null,
      visualizationData.name,
      visualizationData.type,
      JSON.stringify(visualizationData.config),
      visualizationData.tableName || null
    );
    
    // Get the created visualization
    const visualization = getVisualizationById(result.lastInsertRowid);
    
    return visualization;
  } catch (error) {
    console.error('Error creating visualization:', error);
    throw new Error(`Failed to create visualization: ${error.message}`);
  }
}

/**
 * Get all saved visualizations
 * @returns {Promise<Array>} List of all saved visualizations
 * @throws {Error} If retrieval fails
 */
async function getAllVisualizations() {
  try {
    // Get database
    const db = appDbService.getDb();
    
    // Query all visualizations
    const visualizations = db.prepare(`
      SELECT 
        id,
        connection_id AS connectionId,
        name,
        type,
        config,
        table_name AS tableName,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM saved_visualizations
      ORDER BY updated_at DESC
    `).all();
    
    // Parse the JSON config for each visualization
    return visualizations.map(visualization => ({
      ...visualization,
      config: JSON.parse(visualization.config)
    }));
  } catch (error) {
    console.error('Error retrieving visualizations:', error);
    throw new Error(`Failed to retrieve visualizations: ${error.message}`);
  }
}

/**
 * Get a visualization by ID
 * @param {string|number} id - Visualization ID
 * @returns {Promise<Object>} Visualization details
 * @throws {Error} If visualization not found or retrieval fails
 */
async function getVisualizationById(id) {
  try {
    // Get database
    const db = appDbService.getDb();
    
    // Query visualization by ID
    const visualization = db.prepare(`
      SELECT 
        id,
        connection_id AS connectionId,
        name,
        type,
        config,
        table_name AS tableName,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM saved_visualizations
      WHERE id = ?
    `).get(id);
    
    // If visualization not found
    if (!visualization) {
      throw new Error(`Visualization with ID ${id} not found`);
    }
    
    // Parse the JSON config
    return {
      ...visualization,
      config: JSON.parse(visualization.config)
    };
  } catch (error) {
    console.error(`Error retrieving visualization with ID ${id}:`, error);
    throw new Error(`Failed to retrieve visualization: ${error.message}`);
  }
}

/**
 * Update a visualization
 * @param {string|number} id - Visualization ID
 * @param {Object} visualizationData - Updated visualization details
 * @returns {Promise<Object>} Updated visualization
 * @throws {Error} If visualization not found or update fails
 */
async function updateVisualization(id, visualizationData) {
  try {
    // Check if visualization exists
    const existingViz = await getVisualizationById(id);
    
    if (!existingViz) {
      throw new Error(`Visualization with ID ${id} not found`);
    }
    
    // Get database
    const db = appDbService.getDb();
    
    // Prepare update data
    const updates = {
      name: visualizationData.name || existingViz.name,
      type: visualizationData.type || existingViz.type,
      config: visualizationData.config ? JSON.stringify(visualizationData.config) : existingViz.config,
      table_name: visualizationData.tableName || existingViz.tableName,
      connection_id: visualizationData.connectionId || existingViz.connectionId,
      updated_at: new Date().toISOString()
    };
    
    // Update visualization
    db.prepare(`
      UPDATE saved_visualizations
      SET name = ?,
          type = ?,
          config = ?,
          table_name = ?,
          connection_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      updates.name,
      updates.type,
      updates.config,
      updates.table_name,
      updates.connection_id,
      updates.updated_at,
      id
    );
    
    // Get the updated visualization
    return await getVisualizationById(id);
  } catch (error) {
    console.error(`Error updating visualization with ID ${id}:`, error);
    throw new Error(`Failed to update visualization: ${error.message}`);
  }
}

/**
 * Delete a visualization
 * @param {string|number} id - Visualization ID
 * @returns {Promise<boolean>} True if visualization was deleted
 * @throws {Error} If visualization not found or deletion fails
 */
async function deleteVisualization(id) {
  try {
    // Check if visualization exists
    const visualization = await getVisualizationById(id);
    
    // Get database
    const db = appDbService.getDb();
    
    // Delete visualization
    const result = db.prepare(`
      DELETE FROM saved_visualizations
      WHERE id = ?
    `).run(id);
    
    // Return true if a row was deleted
    return result.changes > 0;
  } catch (error) {
    // If the error is that the visualization was not found, rethrow it
    if (error.message.includes('not found')) {
      throw error;
    }
    
    console.error(`Error deleting visualization with ID ${id}:`, error);
    throw new Error(`Failed to delete visualization: ${error.message}`);
  }
}

/**
 * Generate data for visualization
 * @param {string|number} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} config - Visualization configuration
 * @returns {Promise<Object>} Visualization data
 * @throws {Error} If data generation fails
 */
async function generateVisualizationData(connectionId, tableName, config) {
  try {
    // Validate inputs
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }
    
    if (!tableName) {
      throw new Error('Table name is required');
    }
    
    if (!config) {
      throw new Error('Visualization configuration is required');
    }
    
    // Get chart type and field mappings
    const chartType = config.type || 'bar';
    const mappings = config.mappings || {};
    
    // Query the database based on chart type and mappings
    let result;
    
    switch (chartType) {
      case 'bar':
      case 'line':
        result = await generateBarOrLineChartData(connectionId, tableName, mappings);
        break;
      case 'pie':
      case 'doughnut':
        result = await generatePieChartData(connectionId, tableName, mappings);
        break;
      case 'scatter':
        result = await generateScatterChartData(connectionId, tableName, mappings);
        break;
      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
    
    return {
      ...result,
      type: chartType
    };
  } catch (error) {
    console.error('Error generating visualization data:', error);
    throw new Error(`Failed to generate visualization data: ${error.message}`);
  }
}

/**
 * Generate data for bar or line charts
 * @private
 */
async function generateBarOrLineChartData(connectionId, tableName, mappings) {
  // Get X and Y field mappings
  const xField = mappings.x;
  const yField = mappings.y;
  
  if (!xField || !yField) {
    throw new Error('X-axis and Y-axis field mappings are required');
  }
  
  // Get database connection
  const connection = await databaseService.getConnection(connectionId);
  
  // Build and execute query
  let query = `SELECT ${xField}, ${yField} FROM ${tableName}`;
  
  // Add sorting if specified
  if (mappings.sort) {
    const direction = mappings.sort === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${yField} ${direction}`;
  } else {
    query += ` ORDER BY ${xField} ASC`;
  }
  
  // Add limit if specified
  if (mappings.limit && !isNaN(mappings.limit)) {
    query += ` LIMIT ${mappings.limit}`;
  }
  
  // Execute query
  const result = await databaseService.executeQuery(connectionId, query);
  
  // Format data for Chart.js
  const labels = result.data.map(row => row[xField]);
  const dataset = {
    label: yField,
    data: result.data.map(row => row[yField]),
    backgroundColor: 'rgba(37, 99, 235, 0.6)',
    borderColor: 'rgba(37, 99, 235, 1)',
    borderWidth: 1
  };
  
  return {
    labels,
    datasets: [dataset],
    data: result.data
  };
}

/**
 * Generate data for pie or doughnut charts
 * @private
 */
async function generatePieChartData(connectionId, tableName, mappings) {
  // Get labels and values field mappings
  const labelsField = mappings.labels;
  const valuesField = mappings.values;
  
  if (!labelsField || !valuesField) {
    throw new Error('Labels and values field mappings are required');
  }
  
  // Get database connection
  const connection = await databaseService.getConnection(connectionId);
  
  // Build and execute query
  let query = `SELECT ${labelsField}, ${valuesField} FROM ${tableName}`;
  
  // Add sorting if specified
  if (mappings.sort) {
    const direction = mappings.sort === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${valuesField} ${direction}`;
  }
  
  // Add limit if specified
  if (mappings.limit && !isNaN(mappings.limit)) {
    query += ` LIMIT ${mappings.limit}`;
  }
  
  // Execute query
  const result = await databaseService.executeQuery(connectionId, query);
  
  // Chart.js colors for pie/doughnut charts (from style guide)
  const backgroundColors = [
    '#2563EB', // blue-600
    '#D946EF', // fuchsia-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#6366F1', // indigo-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16'  // lime-500
  ];
  
  // Format data for Chart.js
  const labels = result.data.map(row => row[labelsField]);
  const dataset = {
    data: result.data.map(row => row[valuesField]),
    backgroundColor: labels.map((_, i) => backgroundColors[i % backgroundColors.length]),
    borderColor: '#FFFFFF',
    borderWidth: 1
  };
  
  return {
    labels,
    datasets: [dataset],
    data: result.data
  };
}

/**
 * Generate data for scatter charts
 * @private
 */
async function generateScatterChartData(connectionId, tableName, mappings) {
  // Get X and Y field mappings
  const xField = mappings.x;
  const yField = mappings.y;
  
  if (!xField || !yField) {
    throw new Error('X-axis and Y-axis field mappings are required');
  }
  
  // Get optional size field mapping
  const sizeField = mappings.size;
  
  // Get database connection
  const connection = await databaseService.getConnection(connectionId);
  
  // Build and execute query
  let query = `SELECT ${xField}, ${yField}`;
  
  if (sizeField) {
    query += `, ${sizeField}`;
  }
  
  query += ` FROM ${tableName}`;
  
  // Add limit if specified
  if (mappings.limit && !isNaN(mappings.limit)) {
    query += ` LIMIT ${mappings.limit}`;
  }
  
  // Execute query
  const result = await databaseService.executeQuery(connectionId, query);
  
  // Format data for Chart.js
  const dataset = {
    label: `${xField} vs ${yField}`,
    data: result.data.map(row => ({
      x: row[xField],
      y: row[yField],
      r: sizeField ? (row[sizeField] / 5) : 5 // Scale size if available
    })),
    backgroundColor: 'rgba(37, 99, 235, 0.6)',
    borderColor: 'rgba(37, 99, 235, 1)',
    borderWidth: 1
  };
  
  return {
    datasets: [dataset],
    data: result.data
  };
}

module.exports = {
  createVisualization,
  getAllVisualizations,
  getVisualizationById,
  updateVisualization,
  deleteVisualization,
  generateVisualizationData
};
