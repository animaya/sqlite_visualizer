/**
 * Export Service
 * 
 * Handles data export functionality
 */

const visualizationService = require('./visualizationService');
const databaseService = require('./databaseService');

/**
 * Export visualization as CSV
 * @param {string} visualizationId - Visualization ID
 * @returns {Promise<Object>} Object containing CSV data and filename
 * @throws {Error} If export fails
 */
async function exportVisualizationAsCsv(visualizationId) {
  try {
    // Get visualization details
    const visualization = await visualizationService.getVisualizationById(visualizationId);
    
    if (!visualization) {
      throw new Error(`Visualization with ID ${visualizationId} not found`);
    }
    
    // Get the raw data for the visualization
    const { connectionId, tableName, config } = visualization;
    
    if (!connectionId || !tableName || !config) {
      throw new Error('Visualization lacks required data (connectionId, tableName, or config)');
    }
    
    // Determine what data to fetch based on the visualization type and config
    let rawData = [];
    let headers = [];
    
    // Generate the visualization data to get raw data
    const vizData = await visualizationService.generateVisualizationData(
      connectionId, 
      tableName, 
      config
    );
    
    if (!vizData || !vizData.data || !Array.isArray(vizData.data)) {
      throw new Error('Failed to get visualization data');
    }
    
    rawData = vizData.data;
    
    // Get headers from the first data row if available
    if (rawData.length > 0) {
      headers = Object.keys(rawData[0]);
    }
    
    // Convert raw data to CSV
    const csvData = convertToCsv(rawData, headers);
    
    // Generate a filename
    const sanitizedName = visualization.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filename = `${sanitizedName}_${timestamp}.csv`;
    
    return {
      data: csvData,
      filename
    };
  } catch (error) {
    console.error(`Error exporting visualization ${visualizationId} as CSV:`, error);
    throw new Error(`Failed to export visualization as CSV: ${error.message}`);
  }
}

/**
 * Export table as CSV
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} options - Export options
 * @param {number} [options.limit=10000] - Maximum number of rows to export
 * @param {Object} [options.filter] - Filter conditions
 * @param {Object} [options.sort] - Sort configuration
 * @returns {Promise<Object>} Object containing CSV data and filename
 * @throws {Error} If export fails
 */
async function exportTableAsCsv(connectionId, tableName, options = {}) {
  try {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }
    
    if (!tableName) {
      throw new Error('Table name is required');
    }
    
    // Set defaults and limits for export options
    const exportOptions = {
      page: 1,
      limit: Math.min(options.limit || 10000, 100000), // Cap at 100,000 rows for performance
      filter: options.filter || {},
      sort: options.sort || {}
    };
    
    // Fetch table data
    const result = await databaseService.getTableData(connectionId, tableName, exportOptions);
    
    if (!result || !result.data || !Array.isArray(result.data)) {
      throw new Error('Failed to retrieve table data');
    }
    
    // Generate CSV from the data
    const headers = result.data.length > 0 ? Object.keys(result.data[0]) : [];
    const csvData = convertToCsv(result.data, headers);
    
    // Generate filename
    const sanitizedTableName = tableName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filename = `${sanitizedTableName}_export_${timestamp}.csv`;
    
    return {
      data: csvData,
      filename,
      rowCount: result.data.length,
      totalRows: result.total
    };
  } catch (error) {
    console.error(`Error exporting table ${tableName} as CSV:`, error);
    throw new Error(`Failed to export table as CSV: ${error.message}`);
  }
}

/**
 * Convert data to CSV format
 * @param {Array} data - Array of data objects
 * @param {Array} headers - Column headers
 * @returns {string} CSV formatted string
 */
function convertToCsv(data, headers) {
  if (!Array.isArray(data) || data.length === 0) {
    // If data is empty, return just headers if available
    if (Array.isArray(headers) && headers.length > 0) {
      return headers.map(escapeCSVValue).join(',') + '\r\n';
    }
    return '';
  }
  
  // If headers weren't provided, extract them from the first data row
  if (!headers || !Array.isArray(headers) || headers.length === 0) {
    headers = Object.keys(data[0]);
  }
  
  // Build CSV string
  let csv = '';
  
  // Add header row
  csv += headers.map(escapeCSVValue).join(',') + '\r\n';
  
  // Add data rows
  for (const row of data) {
    const rowValues = headers.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    });
    
    csv += rowValues.join(',') + '\r\n';
  }
  
  return csv;
}

/**
 * Escape a value for inclusion in CSV
 * @param {any} value - Value to escape
 * @returns {string} Escaped CSV value
 */
function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convert to string
  const stringValue = String(value);
  
  // If the value contains commas, double quotes, or newlines, wrap it in double quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Double quote any existing double quotes
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  
  return stringValue;
}

module.exports = {
  exportVisualizationAsCsv,
  exportTableAsCsv,
  convertToCsv
};
