/**
 * Tables Route Handler
 * 
 * Handles all API endpoints related to database tables
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const connectionService = require('../services/connectionService');
const databaseService = require('../services/databaseService');

/**
 * GET /api/connections/:id/tables
 * List all tables in the database
 */
router.get('/', async (req, res, next) => {
  const connectionId = req.params.id;
  console.log(`Requesting tables for connection ID: ${connectionId}`);

  // Set a timeout for this operation
  const timeoutId = setTimeout(() => {
    console.error(`Timeout retrieving tables for connection ${connectionId}`);
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Request timeout',
        message: 'Retrieving tables took too long. The database may be too large or experiencing issues.'
      });
    }
  }, 30000); // 30 second timeout

  try {
    // Get database connection directly
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      clearTimeout(timeoutId);
      return res.status(404).json({ 
        error: 'Connection not found',
        message: `No valid connection found with ID: ${connectionId}`
      });
    }
    
    // Use a direct query instead of service method
    const tables = await new Promise((resolve, reject) => {
      db.all(
        `SELECT name, type, sql as creation_sql
         FROM sqlite_master 
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
        [],
        (err, results) => {
          if (err) {
            console.error(`Error querying tables: ${err.message}`);
            reject(err);
          } else {
            resolve(results || []);
          }
        }
      );
    });
    
    // Process each table to get row counts
    const tablesWithDetails = [];
    
    // Process up to 10 tables at a time to avoid overwhelming the database
    const processInBatches = async (items, batchSize, processFn) => {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);
      }
      return results;
    };
    
    await processInBatches(tables, 5, async (table) => {
      if (!table || !table.name) {
        return null;
      }
      
      let rowCount = 0;
      try {
        // Get approximate row count (faster than COUNT(*) for large tables)
        const countResult = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COUNT(*) as count FROM "${table.name}" LIMIT 1000`,
            [],
            (err, result) => {
              if (err) {
                console.warn(`Error counting rows for ${table.name}: ${err.message}`);
                resolve({ count: 0 });
              } else {
                resolve(result || { count: 0 });
              }
            }
          );
        });
        
        rowCount = countResult.count;
      } catch (error) {
        console.warn(`Error getting row count for ${table.name}: ${error.message}`);
      }
      
      tablesWithDetails.push({
        name: table.name,
        type: table.type,
        creation_sql: table.creation_sql,
        row_count: rowCount
      });
    });
    
    // Clear the timeout as we've completed the operation
    clearTimeout(timeoutId);
    
    // Return the results
    console.log(`Found ${tablesWithDetails.length} tables for connection ${connectionId}`);
    res.json(tablesWithDetails);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error getting tables for connection ${connectionId}:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to retrieve tables',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/connections/:id/tables/:table/schema
 * Get table schema
 */
router.get('/:table/schema', async (req, res, next) => {
  const { id, table } = req.params;
  
  try {
    // Get database connection directly
    const db = await connectionService.getConnection(id);
    
    if (!db) {
      return res.status(404).json({ 
        error: 'Connection not found',
        message: `No valid connection found with ID: ${id}`
      });
    }
    
    // Validate table name (prevent SQL injection)
    const tableNamePattern = /^[a-zA-Z0-9_]+$/;
    if (!tableNamePattern.test(table)) {
      return res.status(400).json({
        error: 'Invalid table name',
        message: 'Table name contains invalid characters'
      });
    }
    
    // Check if table exists
    const tableExists = await new Promise((resolve) => {
      db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [table],
        (err, result) => {
          if (err || !result) {
            resolve(false);
          } else {
            resolve(true);
          }
        }
      );
    });
    
    if (!tableExists) {
      return res.status(404).json({
        error: 'Table not found',
        message: `Table '${table}' does not exist in this database`
      });
    }
    
    // Get table schema
    const columns = await new Promise((resolve, reject) => {
      db.all(
        `PRAGMA table_info("${table}")`,
        [],
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results || []);
          }
        }
      );
    });
    
    // Get foreign key info
    const foreignKeys = await new Promise((resolve, reject) => {
      db.all(
        `PRAGMA foreign_key_list("${table}")`,
        [],
        (err, results) => {
          if (err) {
            console.warn(`Error getting foreign keys for ${table}: ${err.message}`);
            resolve([]);
          } else {
            resolve(results || []);
          }
        }
      );
    });
    
    // Get index info
    const indices = await new Promise((resolve, reject) => {
      db.all(
        `PRAGMA index_list("${table}")`,
        [],
        (err, results) => {
          if (err) {
            console.warn(`Error getting indices for ${table}: ${err.message}`);
            resolve([]);
          } else {
            resolve(results || []);
          }
        }
      );
    });
    
    // Format the columns with additional info
    const formattedColumns = columns.map(column => {
      // Check if column is part of a primary key
      const isPrimaryKey = column.pk === 1;
      
      // Check if column is a foreign key
      const foreignKey = foreignKeys.find(fk => fk.from === column.name);
      
      // Parse the column type
      const typeInfo = parseColumnType(column.type);
      
      return {
        name: column.name,
        type: column.type,
        nullable: column.notnull === 0,
        defaultValue: column.dflt_value,
        primaryKey: isPrimaryKey,
        autoIncrement: isPrimaryKey && column.type.toUpperCase() === 'INTEGER',
        foreignKey: foreignKey ? {
          table: foreignKey.table,
          column: foreignKey.to
        } : null,
        ...typeInfo
      };
    });
    
    // Return the schema
    res.json({
      name: table,
      columns: formattedColumns,
      primaryKey: formattedColumns.filter(col => col.primaryKey).map(col => col.name),
      foreignKeys: foreignKeys.map(fk => ({
        column: fk.from,
        referencedTable: fk.table,
        referencedColumn: fk.to,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete
      })),
      indices: indices.map(index => ({
        name: index.name,
        unique: index.unique === 1
      }))
    });
  } catch (error) {
    console.error(`Error getting schema for table ${table}:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to retrieve table schema',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/connections/:id/tables/:table/data
 * Get table data (with pagination)
 */
router.get('/:table/data', async (req, res, next) => {
  const { id, table } = req.params;
  const { 
    page = 1, 
    limit = 100, 
    sort: sortParam, 
    filter: filterParam 
  } = req.query;
  
  // Set a timeout for this operation
  const timeoutId = setTimeout(() => {
    console.error(`Timeout retrieving data for table ${table}`);
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Request timeout',
        message: 'Retrieving table data took too long. Try a smaller page size or fewer filters.'
      });
    }
  }, 30000); // 30 second timeout
  
  try {
    // Get database connection directly
    const db = await connectionService.getConnection(id);
    
    if (!db) {
      clearTimeout(timeoutId);
      return res.status(404).json({ 
        error: 'Connection not found',
        message: `No valid connection found with ID: ${id}`
      });
    }
    
    // Validate table name (prevent SQL injection)
    const tableNamePattern = /^[a-zA-Z0-9_]+$/;
    if (!tableNamePattern.test(table)) {
      clearTimeout(timeoutId);
      return res.status(400).json({
        error: 'Invalid table name',
        message: 'Table name contains invalid characters'
      });
    }
    
    // Parse pagination parameters
    const pageNum = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 100, 1000); // Limit to max 1000 rows
    const offset = (pageNum - 1) * pageSize;
    
    // Parse sort parameter
    let sortClause = '';
    if (sortParam) {
      try {
        const sort = typeof sortParam === 'string' ? JSON.parse(sortParam) : sortParam;
        if (sort) {
          const column = sort.column || sort.field;
          const direction = (sort.direction || 'asc').toUpperCase();
          
          if (column && /^[a-zA-Z0-9_]+$/.test(column)) {
            sortClause = ` ORDER BY "${column}" ${direction === 'DESC' ? 'DESC' : 'ASC'}`;
          }
        }
      } catch (e) {
        console.warn(`Invalid sort parameter: ${sortParam}`);
      }
    }
    
    // Parse filter parameter
    let whereClause = '';
    let whereParams = [];
    if (filterParam) {
      try {
        const filter = typeof filterParam === 'string' ? JSON.parse(filterParam) : filterParam;
        if (filter && Object.keys(filter).length > 0) {
          const conditions = [];
          
          for (const [key, value] of Object.entries(filter)) {
            // Skip invalid column names
            if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
            
            if (value === null) {
              conditions.push(`"${key}" IS NULL`);
            } else if (typeof value === 'string' && value.includes('%')) {
              conditions.push(`"${key}" LIKE ?`);
              whereParams.push(value);
            } else {
              conditions.push(`"${key}" = ?`);
              whereParams.push(value);
            }
          }
          
          if (conditions.length > 0) {
            whereClause = ` WHERE ${conditions.join(' AND ')}`;
          }
        }
      } catch (e) {
        console.warn(`Invalid filter parameter: ${filterParam}`);
      }
    }
    
    // Get total count
    const countResult = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM "${table}"${whereClause}`,
        whereParams,
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result || { count: 0 });
          }
        }
      );
    });
    
    // Get page of data
    const data = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM "${table}"${whereClause}${sortClause} LIMIT ? OFFSET ?`,
        [...whereParams, pageSize, offset],
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results || []);
          }
        }
      );
    });
    
    // Clear the timeout as we've completed the operation
    clearTimeout(timeoutId);
    
    // Return the results
    res.json({
      data,
      total: countResult.count,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(countResult.count / pageSize)
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error getting data for table ${table}:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to retrieve table data',
        message: error.message
      });
    }
  }
});

/**
 * GET /api/connections/:id/tables/:table/data/sample
 * Get a sample of table data
 */
router.get('/:table/data/sample', async (req, res, next) => {
  const { id, table } = req.params;
  const { limit = 10 } = req.query;
  
  try {
    // Get database connection directly
    const db = await connectionService.getConnection(id);
    
    if (!db) {
      return res.status(404).json({ 
        error: 'Connection not found',
        message: `No valid connection found with ID: ${id}`
      });
    }
    
    // Validate table name (prevent SQL injection)
    const tableNamePattern = /^[a-zA-Z0-9_]+$/;
    if (!tableNamePattern.test(table)) {
      return res.status(400).json({
        error: 'Invalid table name',
        message: 'Table name contains invalid characters'
      });
    }
    
    // Get sample data (limit to reasonable size)
    const sampleSize = Math.min(parseInt(limit) || 10, 100);
    
    const data = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM "${table}" LIMIT ?`,
        [sampleSize],
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results || []);
          }
        }
      );
    });
    
    // Get total count
    const countResult = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM "${table}"`,
        [],
        (err, result) => {
          if (err) {
            console.warn(`Error counting rows for ${table}: ${err.message}`);
            resolve({ count: 0 });
          } else {
            resolve(result || { count: 0 });
          }
        }
      );
    });
    
    // Return the sample
    res.json({
      data,
      count: countResult.count,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    });
  } catch (error) {
    console.error(`Error getting sample data for table ${table}:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to retrieve table sample',
        message: error.message
      });
    }
  }
});

/**
 * Utility function to parse SQLite column types
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

module.exports = router;