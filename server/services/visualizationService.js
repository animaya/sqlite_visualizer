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
    console.log('Creating visualization with data:', JSON.stringify(visualizationData, null, 2));
    
    // Validate required fields with detailed error messages
    if (!visualizationData.name) {
      console.error('Missing required field: name');
      throw new Error('Visualization name is required');
    }
    
    if (!visualizationData.type) {
      console.error('Missing required field: type');
      throw new Error('Visualization type is required');
    }
    
    if (!visualizationData.config) {
      console.error('Missing required field: config');
      throw new Error('Visualization configuration is required');
    }
    
    if (!visualizationData.connection_id) {
      console.error('Missing required field: connection_id');
      throw new Error('Connection ID is required');
    }
    
    if (!visualizationData.table_name) {
      console.error('Missing required field: table_name');
      throw new Error('Table name is required');
    }
    
    // Ensure config is properly handled whether it's a string or object
    if (typeof visualizationData.config === 'string') {
      try {
        // Parse the string to validate it's proper JSON
        visualizationData.config = JSON.parse(visualizationData.config);
        console.log('Successfully parsed config from string to object');
      } catch (err) {
        console.error('Invalid JSON in configuration:', err);
        throw new Error('Invalid JSON format in configuration');
      }
    } else if (typeof visualizationData.config === 'object') {
      // If it's already an object, validate it can be stringified
      try {
        // Test that we can stringify and parse it without errors
        JSON.parse(JSON.stringify(visualizationData.config));
        console.log('Config object is valid JSON');
      } catch (err) {
        console.error('Invalid object in configuration (contains circular references):', err);
        throw new Error('Configuration object contains invalid data');
      }
    } else {
      console.error('Config is neither string nor object:', typeof visualizationData.config);
      throw new Error('Configuration must be a valid JSON string or object');
    }
    
    // Insert visualization using the appDbService run helper
    const result = await appDbService.run(`
      INSERT INTO saved_visualizations (
        connection_id,
        name,
        type,
        config,
        table_name
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      visualizationData.connection_id || null,
      visualizationData.name,
      visualizationData.type,
      // Always stringify the config for storage, ensuring it's a clean object
      JSON.stringify(visualizationData.config, (key, value) => {
        // Handle potential circular references or complex objects
        if (typeof value === 'function') {
          return undefined; // Skip functions
        }
        return value;
      }),
      visualizationData.table_name || null
    ]);
    
    // Get the created visualization
    const visualization = await getVisualizationById(result.lastID);
    
    return visualization;
  } catch (error) {
    console.error('Error creating visualization:', error);
    // Provide more detailed error information
    const errorMessage = error.message || 'Unknown error';
    console.error(`Visualization creation failed with error: ${errorMessage}`);
    
    // Add context to the error message for better debugging
    throw new Error(`Failed to create visualization: ${errorMessage}`);
  }
}

/**
 * Get all saved visualizations
 * @returns {Promise<Array>} List of all saved visualizations
 * @throws {Error} If retrieval fails
 */
async function getAllVisualizations() {
  try {
    // Query all visualizations using the appDbService all helper
    const visualizations = await appDbService.all(`
      SELECT 
        id,
        connection_id,
        name,
        type,
        config,
        table_name,
        created_at,
        updated_at
      FROM saved_visualizations
      ORDER BY updated_at DESC
    `);
    
    // Convert to camelCase and parse the JSON config for each visualization
    return visualizations.map(visualization => {
      // Parse config safely
      let parsedConfig = {};
      try {
        if (visualization && visualization.config) {
          parsedConfig = JSON.parse(visualization.config);
        }
      } catch (err) {
        // Make sure visualization is not null before accessing its id
        const vizId = visualization ? visualization.id : 'unknown';
        console.error(`Failed to parse config for visualization ${vizId}:`, err);
        // Use empty object if parsing fails
      }
      
      return {
        id: visualization.id,
        connectionId: visualization.connection_id,
        name: visualization.name,
        type: visualization.type,
        config: parsedConfig,
        tableName: visualization.table_name,
        createdAt: visualization.created_at,
        updatedAt: visualization.updated_at
      };
    });
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
    // Query visualization by ID using the appDbService get helper
    const visualization = await appDbService.get(`
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
    `, [id]);
    
    // If visualization not found
    if (!visualization) {
      throw new Error(`Visualization with ID ${id} not found`);
    }
    
    // Parse the JSON config safely
    let parsedConfig = {};
    try {
      if (visualization.config) {
        parsedConfig = JSON.parse(visualization.config);
      }
    } catch (err) {
      console.error(`Failed to parse config for visualization ${id}:`, err);
      // Use empty object if parsing fails
    }
    
    return {
      ...visualization,
      config: parsedConfig
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
    
    // Handle config update safely
    let configString = existingViz.config ? JSON.stringify(existingViz.config) : '{}';
    if (visualizationData.config) {
      try {
        configString = JSON.stringify(visualizationData.config);
      } catch (err) {
        console.error(`Failed to stringify config for visualization ${id}:`, err);
        throw new Error(`Invalid configuration: ${err.message}`);
      }
    }
    
    // Prepare update data
    const updates = {
      name: visualizationData.name || existingViz.name,
      type: visualizationData.type || existingViz.type,
      config: configString,
      table_name: visualizationData.table_name || visualizationData.tableName || existingViz.tableName,
      connection_id: visualizationData.connection_id || visualizationData.connectionId || existingViz.connectionId,
      updated_at: new Date().toISOString()
    };
    
    // Update visualization using the appDbService run helper
    await appDbService.run(`
      UPDATE saved_visualizations
      SET name = ?,
          type = ?,
          config = ?,
          table_name = ?,
          connection_id = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      updates.name,
      updates.type,
      updates.config,
      updates.table_name,
      updates.connection_id,
      updates.updated_at,
      id
    ]);
    
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
    // Check if visualization exists before attempting to delete
    const vizExists = await appDbService.get(`
      SELECT 1 FROM saved_visualizations WHERE id = ?
    `, [id]);
    
    if (!vizExists) {
      throw new Error(`Visualization with ID ${id} not found`);
    }
    
    // Delete visualization using the appDbService run helper
    const result = await appDbService.run(`
      DELETE FROM saved_visualizations
      WHERE id = ?
    `, [id]);
    
    // Return true if a row was deleted
    return result.changes > 0;
  } catch (error) {
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
      case 'polarArea':
        result = await generatePieChartData(connectionId, tableName, mappings);
        break;
      case 'scatter':
        result = await generateScatterChartData(connectionId, tableName, mappings);
        break;
      case 'radar':
        result = await generateRadarChartData(connectionId, tableName, mappings);
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

/**
 * Generate data for radar charts
 * @private
 */
async function generateRadarChartData(connectionId, tableName, mappings) {
  // Get labels and values field mappings
  const labelsField = mappings.labels;
  const valuesField = mappings.values;
  const seriesField = mappings.series;
  
  if (!labelsField || !valuesField) {
    throw new Error('Labels and values field mappings are required for radar charts');
  }
  
  // Build and execute query
  let query;
  
  if (seriesField) {
    // If series field is provided, we need to pivot the data
    query = `SELECT ${labelsField}, ${seriesField}, ${valuesField} FROM ${tableName}`;
  } else {
    // Simple query for single dataset
    query = `SELECT ${labelsField}, ${valuesField} FROM ${tableName}`;
  }
  
  // Add limit if specified
  if (mappings.limit && !isNaN(mappings.limit)) {
    query += ` LIMIT ${mappings.limit}`;
  }
  
  // Execute query
  const result = await databaseService.executeQuery(connectionId, query);
  
  // Chart.js colors (from style guide)
  const colors = [
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
  
  let labels = [];
  let datasets = [];
  
  if (seriesField) {
    // Group data by series
    const groupedData = {};
    const allLabels = new Set();
    
    // First pass: collect all labels and group data by series
    result.data.forEach(row => {
      const label = row[labelsField];
      const series = row[seriesField];
      const value = row[valuesField];
      
      allLabels.add(label);
      
      if (!groupedData[series]) {
        groupedData[series] = {};
      }
      
      groupedData[series][label] = value;
    });
    
    // Convert to arrays
    labels = Array.from(allLabels);
    
    // Create datasets for each series
    let colorIndex = 0;
    for (const [series, values] of Object.entries(groupedData)) {
      const color = colors[colorIndex % colors.length];
      colorIndex++;
      
      const dataset = {
        label: series,
        data: labels.map(label => values[label] || 0),
        backgroundColor: `${color}33`, // 20% opacity
        borderColor: color,
        borderWidth: 2,
        pointBackgroundColor: color
      };
      
      datasets.push(dataset);
    }
  } else {
    // Single dataset
    labels = result.data.map(row => row[labelsField]);
    
    const dataset = {
      label: valuesField,
      data: result.data.map(row => row[valuesField]),
      backgroundColor: `${colors[0]}33`, // 20% opacity
      borderColor: colors[0],
      borderWidth: 2,
      pointBackgroundColor: colors[0]
    };
    
    datasets.push(dataset);
  }
  
  return {
    labels,
    datasets,
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