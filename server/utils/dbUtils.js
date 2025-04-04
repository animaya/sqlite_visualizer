/**
 * Database Utilities
 * 
 * Helper functions for database operations
 */

const fs = require('fs');
const Database = require('better-sqlite3');

/**
 * Get the size of a SQLite database file
 * @param {string} dbPath - Path to the database file
 * @returns {number} - Size of the database file in bytes
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
 * @returns {boolean} - True if valid, false otherwise
 */
function validateDatabase(dbPath) {
  try {
    // Check if file exists
    if (!fs.existsSync(dbPath)) {
      return false;
    }
    
    // Check file size (empty files are not valid databases)
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      return false;
    }
    
    // Try to open the database
    const db = new Database(dbPath, { readonly: true });
    
    // Run a simple query to validate it's a SQLite database
    db.prepare('SELECT sqlite_version() AS version').get();
    
    // Close the connection
    db.close();
    
    return true;
  } catch (error) {
    console.error(`Database validation error: ${error.message}`);
    return false;
  }
}

/**
 * Get the number of tables in a database
 * @param {Object} db - Database connection
 * @returns {number} - The number of tables
 */
function getTableCount(db) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).get();
    
    return result.count;
  } catch (error) {
    console.error(`Error counting tables: ${error.message}`);
    return 0;
  }
}

/**
 * Create a safe read-only connection to a database
 * @param {string} dbPath - Path to the database file
 * @returns {Object|null} - Database connection or null
 */
function createReadOnlyConnection(dbPath) {
  try {
    const db = new Database(dbPath, { 
      readonly: true,
      fileMustExist: true
    });
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    return db;
  } catch (error) {
    console.error(`Error creating read-only connection: ${error.message}`);
    return null;
  }
}

/**
 * Parse SQLite column types
 * @param {string} typeName - SQLite type name
 * @returns {Object} - Type information
 */
function parseColumnType(typeName) {
  // Convert to lowercase for case-insensitive comparison
  const typeNameLower = typeName.toLowerCase();
  
  // Default result
  const result = {
    type: typeName,
    jsType: 'string',
    isNumeric: false,
    isDate: false,
    isText: true
  };
  
  // Determine type category
  if (typeNameLower.includes('int') || 
      typeNameLower.includes('float') || 
      typeNameLower.includes('double') || 
      typeNameLower.includes('real') || 
      typeNameLower.includes('numeric') || 
      typeNameLower.includes('decimal')) {
    result.jsType = 'number';
    result.isNumeric = true;
    result.isText = false;
  } else if (typeNameLower.includes('date') || 
             typeNameLower.includes('time') || 
             typeNameLower.includes('timestamp')) {
    result.jsType = 'date';
    result.isDate = true;
    result.isText = false;
  } else if (typeNameLower.includes('bool')) {
    result.jsType = 'boolean';
    result.isText = false;
  }
  
  return result;
}

/**
 * Get table schema information
 * @param {Object} db - Database connection
 * @param {string} tableName - Table name
 * @returns {Object} - Table schema information
 */
function getTableSchema(db, tableName) {
  try {
    // Get column information
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    
    // Map columns to a more usable format
    const mappedColumns = columns.map(col => {
      const typeInfo = parseColumnType(col.type);
      return {
        name: col.name,
        type: col.type,
        jsType: typeInfo.jsType,
        isPrimaryKey: col.pk === 1,
        isNullable: col.notnull === 0,
        defaultValue: col.dflt_value,
        isNumeric: typeInfo.isNumeric,
        isDate: typeInfo.isDate,
        isText: typeInfo.isText
      };
    });
    
    // Get foreign key information
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
    
    // Get index information
    const indices = db.prepare(`PRAGMA index_list("${tableName}")`).all();
    
    return {
      name: tableName,
      columns: mappedColumns,
      foreignKeys,
      indices
    };
  } catch (error) {
    console.error(`Error getting table schema: ${error.message}`);
    return {
      name: tableName,
      columns: [],
      foreignKeys: [],
      indices: []
    };
  }
}

/**
 * Check if a string is a SQL injection risk
 * @param {string} value - String to check
 * @returns {boolean} - True if the string is a risk
 */
function isSqlInjectionRisk(value) {
  if (typeof value !== 'string') return false;
  
  // Check for common SQL injection patterns
  const riskPatterns = [
    /'\s*OR\s*'1=1/i,       // 'OR '1=1
    /'\s*OR\s*1=1/i,         // 'OR 1=1
    /'\s*OR\s*'1'='1/i,     // 'OR '1'='1
    /'\s*OR\s*1='1/i,       // 'OR 1='1
    /'\s*OR\s*'a'='a/i,     // 'OR 'a'='a
    /;\s*DROP\s+TABLE/i,     // ; DROP TABLE
    /;\s*DELETE\s+FROM/i,    // ; DELETE FROM
    /UNION\s+SELECT/i,      // UNION SELECT
    /--/,                   // SQL comment
    /\/\*/,                 // Multi-line comment start
    /EXEC\s+xp_/i,          // SQL Server stored procedure execution
    /EXEC\s+sp_/i,          // SQL Server stored procedure execution
    /INTO\s+OUTFILE/i,      // MySQL write to file
    /LOAD_FILE/i            // MySQL read from file
  ];
  
  return riskPatterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize a table or column name for safe use in SQL queries
 * @param {string} name - Table or column name
 * @returns {string} - Sanitized name
 */
function sanitizeIdentifier(name) {
  if (typeof name !== 'string') {
    throw new Error('Invalid identifier');
  }
  
  // Check for SQL injection risks
  if (isSqlInjectionRisk(name)) {
    throw new Error('SQL injection risk detected');
  }
  
  // Allow only alphanumeric characters, underscore, and dollar sign
  if (!/^[a-zA-Z0-9_$]+$/.test(name)) {
    throw new Error('Invalid identifier format');
  }
  
  return name;
}

module.exports = {
  getDatabaseSize,
  validateDatabase,
  getTableCount,
  createReadOnlyConnection,
  parseColumnType,
  getTableSchema,
  isSqlInjectionRisk,
  sanitizeIdentifier
};
