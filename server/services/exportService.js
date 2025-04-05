/**
 * Export Service
 * 
 * Handles data export functionality for various formats (CSV, JSON, etc.)
 */

const visualizationService = require('./visualizationService');
const databaseService = require('./databaseService');
const path = require('path');
const { parseColumnType } = require('../utils/dbUtils');
const connectionService = require('./connectionService');

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
      filename,
      mimeType: 'text/csv',
      extension: 'csv',
      rowCount: rawData.length
    };
  } catch (error) {
    console.error(`Error exporting visualization ${visualizationId} as CSV:`, error);
    throw new Error(`Failed to export visualization as CSV: ${error.message}`);
  }
}

/**
 * Export visualization as JSON
 * @param {string} visualizationId - Visualization ID
 * @returns {Promise<Object>} Object containing JSON data and filename
 * @throws {Error} If export fails
 */
async function exportVisualizationAsJson(visualizationId) {
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
    
    // Generate the visualization data to get raw data
    const vizData = await visualizationService.generateVisualizationData(
      connectionId, 
      tableName, 
      config
    );
    
    if (!vizData || !vizData.data || !Array.isArray(vizData.data)) {
      throw new Error('Failed to get visualization data');
    }
    
    // Create an export object that includes metadata and data
    const exportData = {
      metadata: {
        name: visualization.name,
        type: visualization.type,
        exportedAt: new Date().toISOString(),
        rowCount: vizData.data.length
      },
      config: visualization.config,
      data: vizData.data
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Generate a filename
    const sanitizedName = visualization.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filename = `${sanitizedName}_${timestamp}.json`;
    
    return {
      data: jsonData,
      filename,
      mimeType: 'application/json',
      extension: 'json',
      rowCount: vizData.data.length
    };
  } catch (error) {
    console.error(`Error exporting visualization ${visualizationId} as JSON:`, error);
    throw new Error(`Failed to export visualization as JSON: ${error.message}`);
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
    
    // Get table schema to determine column types
    let tableSchema;
    try {
      tableSchema = await databaseService.getTableSchema(connectionId, tableName);
    } catch (err) {
      console.warn(`Could not get schema for table ${tableName}:`, err);
      // Continue without schema (types will be inferred from data)
    }
    
    // Fetch table data
    const result = await databaseService.getTableData(connectionId, tableName, exportOptions);
    
    if (!result || !result.data || !Array.isArray(result.data)) {
      throw new Error('Failed to retrieve table data');
    }
    
    // Format data for export (handling dates, etc.)
    const formattedData = formatDataForExport(result.data, tableSchema);
    
    // Generate CSV from the data
    const headers = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
    const csvData = convertToCsv(formattedData, headers);
    
    // Generate filename
    const sanitizedTableName = tableName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filename = `${sanitizedTableName}_export_${timestamp}.csv`;
    
    return {
      data: csvData,
      filename,
      mimeType: 'text/csv',
      extension: 'csv',
      rowCount: result.data.length,
      totalRows: result.total
    };
  } catch (error) {
    console.error(`Error exporting table ${tableName} as CSV:`, error);
    throw new Error(`Failed to export table as CSV: ${error.message}`);
  }
}

/**
 * Export table as JSON
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} options - Export options
 * @param {number} [options.limit=10000] - Maximum number of rows to export
 * @param {Object} [options.filter] - Filter conditions
 * @param {Object} [options.sort] - Sort configuration
 * @param {boolean} [options.includeSchema=true] - Whether to include table schema in export
 * @returns {Promise<Object>} Object containing JSON data and filename
 * @throws {Error} If export fails
 */
async function exportTableAsJson(connectionId, tableName, options = {}) {
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
      sort: options.sort || {},
      includeSchema: options.includeSchema !== false // Default to true
    };
    
    // Get connection details
    const connection = await connectionService.getConnectionById(connectionId);
    
    if (!connection) {
      throw new Error(`Connection with ID ${connectionId} not found`);
    }
    
    // Get table schema if requested
    let schema = null;
    if (exportOptions.includeSchema) {
      try {
        schema = await databaseService.getTableSchema(connectionId, tableName);
      } catch (err) {
        console.warn(`Could not get schema for table ${tableName}:`, err);
        // Continue without schema
      }
    }
    
    // Fetch table data
    const result = await databaseService.getTableData(connectionId, tableName, exportOptions);
    
    if (!result || !result.data || !Array.isArray(result.data)) {
      throw new Error('Failed to retrieve table data');
    }
    
    // Format data for export (handling dates, etc.)
    const formattedData = formatDataForExport(result.data, schema);
    
    // Create export object
    const exportData = {
      metadata: {
        table: tableName,
        database: path.basename(connection.path),
        exportedAt: new Date().toISOString(),
        rowCount: result.data.length,
        totalRows: result.total,
        exportOptions: {
          filter: exportOptions.filter,
          sort: exportOptions.sort,
          limit: exportOptions.limit
        }
      },
      schema: schema ? schema.columns : null,
      data: formattedData
    };
    
    // Convert to JSON string
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Generate filename
    const sanitizedTableName = tableName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const filename = `${sanitizedTableName}_export_${timestamp}.json`;
    
    return {
      data: jsonData,
      filename,
      mimeType: 'application/json',
      extension: 'json',
      rowCount: result.data.length,
      totalRows: result.total
    };
  } catch (error) {
    console.error(`Error exporting table ${tableName} as JSON:`, error);
    throw new Error(`Failed to export table as JSON: ${error.message}`);
  }
}

/**
 * Format data for export (handle special data types)
 * @param {Array} data - Raw data to format
 * @param {Object} schema - Table schema (optional)
 * @returns {Array} Formatted data
 */
function formatDataForExport(data, schema) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // If no schema provided, use data as is
  if (!schema || !schema.columns) {
    return data;
  }
  
  // Create a map of column types
  const columnTypes = {};
  schema.columns.forEach(column => {
    columnTypes[column.name] = column;
  });
  
  // Format each row based on column types
  return data.map(row => {
    const formattedRow = {};
    
    for (const [key, value] of Object.entries(row)) {
      const columnType = columnTypes[key];
      
      // Handle null values
      if (value === null || value === undefined) {
        formattedRow[key] = '';
        continue;
      }
      
      // Handle known types
      if (columnType) {
        if (columnType.isDate) {
          // Format dates consistently
          if (value instanceof Date) {
            formattedRow[key] = value.toISOString();
          } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            // Already in ISO format
            formattedRow[key] = value;
          } else {
            // Try to parse as date
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                formattedRow[key] = date.toISOString();
              } else {
                formattedRow[key] = value;
              }
            } catch (e) {
              formattedRow[key] = value;
            }
          }
        } else if (columnType.isNumeric) {
          // Ensure numbers are formatted correctly
          formattedRow[key] = typeof value === 'number' ? value : parseFloat(value);
        } else {
          // Default handling
          formattedRow[key] = value;
        }
      } else {
        // No type information, use as is
        formattedRow[key] = value;
      }
    }
    
    return formattedRow;
  });
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
  
  // Add data rows - use a stream-like approach for large datasets
  let rowCounter = 0;
  const batchSize = 1000; // Process 1000 rows at a time to avoid memory issues
  
  while (rowCounter < data.length) {
    const batch = data.slice(rowCounter, rowCounter + batchSize);
    rowCounter += batchSize;
    
    for (const row of batch) {
      const rowValues = headers.map(header => {
        const value = row[header];
        return escapeCSVValue(value);
      });
      
      csv += rowValues.join(',') + '\r\n';
    }
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
  
  // Format dates consistently
  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
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

/**
 * Get supported export formats
 * @returns {Array} List of supported export formats
 */
function getSupportedExportFormats() {
  return [
    { id: 'csv', name: 'CSV (Comma Separated Values)', mimeType: 'text/csv', extension: 'csv' },
    { id: 'json', name: 'JSON (JavaScript Object Notation)', mimeType: 'application/json', extension: 'json' }
  ];
}

module.exports = {
  exportVisualizationAsCsv,
  exportVisualizationAsJson,
  exportTableAsCsv,
  exportTableAsJson,
  convertToCsv,
  getSupportedExportFormats
};
