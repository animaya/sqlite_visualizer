/**
 * Database Utilities
 * 
 * Helper functions for database operations
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Get the size of a SQLite database file
 * @param {string} dbPath - Path to the database file
 * @returns {number} Size in bytes
 */
function getDatabaseSize(dbPath) {
  try {
    const stats = fs.statSync(dbPath);
    return stats.size;
  } catch (error) {
    console.error(`Error getting database size: ${error.message}`);
    return 0;
  }
}

/**
 * Validate a SQLite database file
 * @param {string} dbPath - Path to the database file
 * @returns {boolean} True if valid
 */
function validateDatabase(dbPath) {
  return new Promise((resolve) => {
    try {
      // Check if file exists
      if (!fs.existsSync(dbPath)) {
        console.error(`Database file not found: ${dbPath}`);
        resolve(false);
        return;
      }
      
      // Try to open the database
      try {
        const db = new Database(dbPath, { readonly: true });
        
        // Try a simple query
        const row = db.prepare('SELECT sqlite_version()').get();
        
        // Close the database
        db.close();
        
        resolve(!!row);
      } catch (error) {
        console.error(`Error validating database: ${error.message}`);
        resolve(false);
      }
    } catch (error) {
      console.error(`Error validating database: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Get the number of tables in a database
 * @param {Object} db - Database connection
 * @returns {number} Table count
 */
function getTableCount(db) {
  try {
    const row = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).get();
    
    return row ? row.count : 0;
  } catch (error) {
    console.error(`Error counting tables: ${error.message}`);
    return 0;
  }
}

/**
 * Create a safe read-only connection to a database
 * Note: We've moved this functionality to connectionService.getConnection
 * This method is kept for backwards compatibility
 * @param {string} dbPath - Path to the database file
 * @returns {null} Always returns null to prevent duplicate connections
 */
function createReadOnlyConnection(dbPath) {
  console.warn('createReadOnlyConnection is deprecated. Use connectionService.getConnection instead.');
  return null;
}

/**
 * Parse SQLite column types to more useful information
 * @param {string} typeName - SQLite type name
 * @returns {Object} Type information
 */
function parseColumnType(typeName) {
  if (!typeName) {
    return {
      type: 'unknown',
      jsType: 'string',
      isNumeric: false,
      isDate: false,
      isText: true
    };
  }
  
  // Normalize type name
  const type = typeName.toUpperCase();
  
  // Check for numeric types
  if (
    type.includes('INT') || 
    type.includes('REAL') || 
    type.includes('FLOA') || 
    type.includes('DOUB') || 
    type.includes('NUM') ||
    type.includes('DECI')
  ) {
    return {
      type: typeName,
      jsType: 'number',
      isNumeric: true,
      isDate: false,
      isText: false
    };
  }
  
  // Check for date/time types
  if (
    type.includes('DATE') || 
    type.includes('TIME') || 
    type.includes('TIMESTAMP')
  ) {
    return {
      type: typeName,
      jsType: 'date',
      isNumeric: false,
      isDate: true,
      isText: false
    };
  }
  
  // Check for boolean types
  if (type.includes('BOOL')) {
    return {
      type: typeName,
      jsType: 'boolean',
      isNumeric: false,
      isDate: false,
      isText: false
    };
  }
  
  // Default to text type
  return {
    type: typeName,
    jsType: 'string',
    isNumeric: false,
    isDate: false,
    isText: true
  };
}

/**
 * Get sample data with appropriate types for a column
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {number} limit - Number of sample rows
 * @returns {Array} Column sample data
 */
function getColumnSample(db, tableName, columnName, limit = 5) {
  try {
    const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
    const escapedColumn = `"${columnName.replace(/"/g, '""')}"`;
    
    const query = `
      SELECT ${escapedColumn}
      FROM ${escapedTable}
      WHERE ${escapedColumn} IS NOT NULL
      LIMIT ?
    `;
    
    return db.prepare(query).all(limit);
  } catch (error) {
    console.error(`Error getting column sample: ${error.message}`);
    return [];
  }
}

/**
 * Get column statistics (min, max, avg, etc.)
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {Object} Column statistics
 */
function getColumnStats(db, tableName, columnName) {
  try {
    const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
    const escapedColumn = `"${columnName.replace(/"/g, '""')}"`;
    
    // Get column type from pragma
    const columns = db.prepare(`PRAGMA table_info(${escapedTable})`).all();
    
    const columnInfo = columns.find(col => col.name === columnName);
    
    if (!columnInfo) {
      console.error(`Column '${columnName}' not found in table '${tableName}'`);
      return {
        count: 0,
        distinct_count: 0,
        null_count: 0,
        type: 'unknown',
        isNumeric: false,
        isDate: false,
        isText: false
      };
    }
    
    const typeInfo = parseColumnType(columnInfo.type);
    
    // Create the return object
    const result = {
      type: columnInfo.type,
      ...typeInfo
    };
    
    // Get null count
    const nullCount = db.prepare(`
      SELECT COUNT(*) as null_count
      FROM ${escapedTable}
      WHERE ${escapedColumn} IS NULL
    `).get();
    
    result.null_count = nullCount ? nullCount.null_count : 0;
    
    // For numeric columns, get statistics
    if (typeInfo.isNumeric) {
      const stats = db.prepare(`
        SELECT
          COUNT(${escapedColumn}) as count,
          MIN(${escapedColumn}) as min,
          MAX(${escapedColumn}) as max,
          AVG(${escapedColumn}) as avg,
          SUM(${escapedColumn}) as sum
        FROM ${escapedTable}
        WHERE ${escapedColumn} IS NOT NULL
      `).get();
      
      if (stats) {
        Object.assign(result, stats);
      } else {
        result.count = 0;
        result.min = null;
        result.max = null;
        result.avg = null;
        result.sum = null;
      }
      
      // Get count of distinct values
      const distinctResult = db.prepare(`
        SELECT COUNT(DISTINCT ${escapedColumn}) as distinct_count
        FROM ${escapedTable}
        WHERE ${escapedColumn} IS NOT NULL
      `).get();
      
      result.distinct_count = distinctResult ? distinctResult.distinct_count : 0;
    } else {
      // For non-numeric columns, just get counts
      const counts = db.prepare(`
        SELECT
          COUNT(${escapedColumn}) as count,
          COUNT(DISTINCT ${escapedColumn}) as distinct_count
        FROM ${escapedTable}
        WHERE ${escapedColumn} IS NOT NULL
      `).get();
      
      if (counts) {
        result.count = counts.count;
        result.distinct_count = counts.distinct_count;
      } else {
        result.count = 0;
        result.distinct_count = 0;
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Error getting column statistics: ${error.message}`);
    return {
      count: 0,
      distinct_count: 0,
      null_count: 0,
      type: 'unknown',
      isNumeric: false,
      isDate: false,
      isText: false
    };
  }
}

/**
 * Check if a field contains date values
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {boolean} True if field contains dates
 */
function isDateField(db, tableName, columnName) {
  try {
    const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
    const escapedColumn = `"${columnName.replace(/"/g, '""')}"`;
    
    // Get column type
    const columns = db.prepare(`PRAGMA table_info(${escapedTable})`).all();
    
    const columnInfo = columns.find(col => col.name === columnName);
    
    if (!columnInfo) {
      return false;
    }
    
    // Check type name for date keywords
    const typeName = columnInfo.type.toUpperCase();
    if (
      typeName.includes('DATE') || 
      typeName.includes('TIME') || 
      typeName.includes('TIMESTAMP')
    ) {
      return true;
    }
    
    // If it's a text column, sample some values and check if they're dates
    if (typeName.includes('TEXT') || typeName.includes('VARCHAR') || typeName.includes('CHAR')) {
      // Get some sample values
      const rows = db.prepare(`
        SELECT DISTINCT ${escapedColumn}
        FROM ${escapedTable}
        WHERE ${escapedColumn} IS NOT NULL
        LIMIT 5
      `).all();
      
      const samples = rows.map(row => row[columnName]);
      
      // Check if all samples match date patterns
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // ISO date
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // ISO datetime
        /^\d{2}\/\d{2}\/\d{4}$/, // US date
        /^\d{2}\.\d{2}\.\d{4}$/, // European date
        /^\d{2}-\d{2}-\d{4}$/ // Another common format
      ];
      
      return samples.length > 0 && samples.every(sample => {
        if (typeof sample !== 'string') return false;
        return datePatterns.some(pattern => pattern.test(sample));
      });
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking if field contains dates: ${error.message}`);
    return false;
  }
}

module.exports = {
  getDatabaseSize,
  validateDatabase,
  getTableCount,
  createReadOnlyConnection,
  parseColumnType,
  getColumnSample,
  getColumnStats,
  isDateField
};