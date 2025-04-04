/**
 * Database Utilities
 * 
 * Helper functions for database operations
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error(`Error opening database: ${err.message}`);
          resolve(false);
          return;
        }
        
        // Try a simple query
        db.get('SELECT sqlite_version()', [], (err, row) => {
          db.close();
          
          if (err) {
            console.error(`Error validating database: ${err.message}`);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error(`Error validating database: ${error.message}`);
      resolve(false);
    }
  });
}

/**
 * Get the number of tables in a database
 * @param {Object} db - Database connection
 * @returns {Promise<number>} Table count
 */
function getTableCount(db) {
  return new Promise((resolve) => {
    try {
      db.get(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      `, [], (err, row) => {
        if (err) {
          console.error(`Error counting tables: ${err.message}`);
          resolve(0);
          return;
        }
        
        resolve(row.count);
      });
    } catch (error) {
      console.error(`Error counting tables: ${error.message}`);
      resolve(0);
    }
  });
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
 * @returns {Promise<Array>} Column sample data
 */
function getColumnSample(db, tableName, columnName, limit = 5) {
  return new Promise((resolve) => {
    try {
      const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
      const escapedColumn = `"${columnName.replace(/"/g, '""')}"`;
      
      const query = `
        SELECT ${escapedColumn}
        FROM ${escapedTable}
        WHERE ${escapedColumn} IS NOT NULL
        LIMIT ?
      `;
      
      db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error(`Error getting column sample: ${err.message}`);
          resolve([]);
        } else {
          resolve(rows);
        }
      });
    } catch (error) {
      console.error(`Error getting column sample: ${error.message}`);
      resolve([]);
    }
  });
}

/**
 * Get column statistics (min, max, avg, etc.)
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {Promise<Object>} Column statistics
 */
function getColumnStats(db, tableName, columnName) {
  return new Promise((resolve) => {
    try {
      const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
      const escapedColumn = `"${columnName.replace(/"/g, '""')}"`;
      
      // Get column type from pragma
      db.all(`PRAGMA table_info(${escapedTable})`, [], (err, columns) => {
        if (err) {
          console.error(`Error getting column info: ${err.message}`);
          resolve({
            count: 0,
            distinct_count: 0,
            null_count: 0,
            type: 'unknown',
            isNumeric: false,
            isDate: false,
            isText: false
          });
          return;
        }
        
        const columnInfo = columns.find(col => col.name === columnName);
        
        if (!columnInfo) {
          console.error(`Column '${columnName}' not found in table '${tableName}'`);
          resolve({
            count: 0,
            distinct_count: 0,
            null_count: 0,
            type: 'unknown',
            isNumeric: false,
            isDate: false,
            isText: false
          });
          return;
        }
        
        const typeInfo = parseColumnType(columnInfo.type);
        
        // For numeric columns, get statistics
        if (typeInfo.isNumeric) {
          db.get(`
            SELECT
              COUNT(${escapedColumn}) as count,
              MIN(${escapedColumn}) as min,
              MAX(${escapedColumn}) as max,
              AVG(${escapedColumn}) as avg,
              SUM(${escapedColumn}) as sum
            FROM ${escapedTable}
            WHERE ${escapedColumn} IS NOT NULL
          `, [], (err, stats) => {
            if (err) {
              console.error(`Error getting column statistics: ${err.message}`);
              resolve({
                count: 0,
                distinct_count: 0,
                null_count: 0,
                type: columnInfo.type,
                ...typeInfo
              });
              return;
            }
            
            // Get count of distinct values
            db.get(`
              SELECT COUNT(DISTINCT ${escapedColumn}) as distinct_count
              FROM ${escapedTable}
              WHERE ${escapedColumn} IS NOT NULL
            `, [], (err, distinctResult) => {
              if (err) {
                console.error(`Error getting distinct count: ${err.message}`);
                resolve({
                  ...stats,
                  distinct_count: 0,
                  type: columnInfo.type,
                  ...typeInfo
                });
                return;
              }
              
              resolve({
                ...stats,
                distinct_count: distinctResult.distinct_count,
                type: columnInfo.type,
                ...typeInfo
              });
            });
          });
        } else {
          // For non-numeric columns, just get counts
          db.get(`
            SELECT
              COUNT(${escapedColumn}) as count,
              COUNT(DISTINCT ${escapedColumn}) as distinct_count
            FROM ${escapedTable}
            WHERE ${escapedColumn} IS NOT NULL
          `, [], (err, counts) => {
            if (err) {
              console.error(`Error getting column counts: ${err.message}`);
              resolve({
                count: 0,
                distinct_count: 0,
                null_count: 0,
                type: columnInfo.type,
                ...typeInfo
              });
              return;
            }
            
            // Get null count
            db.get(`
              SELECT COUNT(*) as null_count
              FROM ${escapedTable}
              WHERE ${escapedColumn} IS NULL
            `, [], (err, nullResult) => {
              if (err) {
                console.error(`Error getting null count: ${err.message}`);
                resolve({
                  ...counts,
                  null_count: 0,
                  type: columnInfo.type,
                  ...typeInfo
                });
                return;
              }
              
              resolve({
                ...counts,
                null_count: nullResult.null_count,
                type: columnInfo.type,
                ...typeInfo
              });
            });
          });
        }
      });
    } catch (error) {
      console.error(`Error getting column statistics: ${error.message}`);
      resolve({
        count: 0,
        distinct_count: 0,
        null_count: 0,
        type: 'unknown',
        isNumeric: false,
        isDate: false,
        isText: false
      });
    }
  });
}

/**
 * Check if a field contains date values
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {Promise<boolean>} True if field contains dates
 */
function isDateField(db, tableName, columnName) {
  return new Promise((resolve) => {
    try {
      const escapedTable = `"${tableName.replace(/"/g, '""')}"`;
      const escapedColumn = `"${columnName.replace(/"/g, '""')}"`;
      
      // Get column type
      db.all(`PRAGMA table_info(${escapedTable})`, [], (err, columns) => {
        if (err) {
          console.error(`Error getting column info: ${err.message}`);
          resolve(false);
          return;
        }
        
        const columnInfo = columns.find(col => col.name === columnName);
        
        if (!columnInfo) {
          resolve(false);
          return;
        }
        
        // Check type name for date keywords
        const typeName = columnInfo.type.toUpperCase();
        if (
          typeName.includes('DATE') || 
          typeName.includes('TIME') || 
          typeName.includes('TIMESTAMP')
        ) {
          resolve(true);
          return;
        }
        
        // If it's a text column, sample some values and check if they're dates
        if (typeName.includes('TEXT') || typeName.includes('VARCHAR') || typeName.includes('CHAR')) {
          // Get some sample values
          db.all(`
            SELECT DISTINCT ${escapedColumn}
            FROM ${escapedTable}
            WHERE ${escapedColumn} IS NOT NULL
            LIMIT 5
          `, [], (err, rows) => {
            if (err) {
              console.error(`Error getting date samples: ${err.message}`);
              resolve(false);
              return;
            }
            
            const samples = rows.map(row => row[columnName]);
            
            // Check if all samples match date patterns
            const datePatterns = [
              /^\d{4}-\d{2}-\d{2}$/, // ISO date
              /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // ISO datetime
              /^\d{2}\/\d{2}\/\d{4}$/, // US date
              /^\d{2}\.\d{2}\.\d{4}$/, // European date
              /^\d{2}-\d{2}-\d{4}$/ // Another common format
            ];
            
            const isDate = samples.length > 0 && samples.every(sample => {
              if (typeof sample !== 'string') return false;
              return datePatterns.some(pattern => pattern.test(sample));
            });
            
            resolve(isDate);
          });
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      console.error(`Error checking if field contains dates: ${error.message}`);
      resolve(false);
    }
  });
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