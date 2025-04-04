/**
 * Database Service
 * 
 * Handles database operations, querying, and data transformation
 */

const connectionService = require('./connectionService');

/**
 * Get all tables in a database
 * @param {string} connectionId - Connection ID
 * @returns {Promise<Array>} Array of table information objects
 * @throws {Error} If tables cannot be retrieved
 */
async function getAllTables(connectionId) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Query for tables (excluding SQLite system tables)
    const tables = db.prepare(`
      SELECT 
        name,
        type,
        sql as creation_sql
      FROM 
        sqlite_master 
      WHERE 
        type = 'table' AND 
        name NOT LIKE 'sqlite_%'
      ORDER BY 
        name
    `).all();
    
    // Add row count to each table
    const tablesWithCount = tables.map(table => {
      try {
        // Get row count
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get();
        return {
          name: table.name,
          type: table.type,
          creation_sql: table.creation_sql,
          row_count: countResult.count
        };
      } catch (error) {
        console.error(`Error getting row count for table ${table.name}:`, error);
        return {
          name: table.name,
          type: table.type,
          creation_sql: table.creation_sql,
          row_count: 0,
          error: 'Failed to count rows'
        };
      }
    });
    
    return tablesWithCount;
  } catch (error) {
    console.error(`Error retrieving tables for connection ${connectionId}:`, error);
    throw new Error(`Failed to retrieve tables: ${error.message}`);
  }
}

/**
 * Get schema for a specific table
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @returns {Promise<Object>} Table schema information
 * @throws {Error} If schema cannot be retrieved
 */
async function getTableSchema(connectionId, tableName) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Safely escape table name
    if (!tableName || tableName.includes(';') || tableName.includes('--')) {
      throw new Error('Invalid table name');
    }
    
    // Get table info (column details)
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all();
    
    if (columns.length === 0) {
      throw new Error(`Table '${tableName}' not found`);
    }
    
    // Get foreign key information
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
    
    // Get index information
    const indices = db.prepare(`PRAGMA index_list("${tableName}")`).all();
    
    // Process index details
    const indexDetails = indices.map(index => {
      const columns = db.prepare(`PRAGMA index_info("${index.name}")`).all();
      return {
        ...index,
        columns: columns.map(col => ({
          name: col.name,
          position: col.seqno
        }))
      };
    });
    
    // Format columns with additional info
    const formattedColumns = columns.map(column => {
      // Parse the column type
      const parsedType = require('../utils/dbUtils').parseColumnType(column.type);
      
      // Check if column is part of a primary key
      const isPrimaryKey = column.pk === 1;
      
      // Check if column is a foreign key
      const foreignKey = foreignKeys.find(fk => fk.from === column.name);
      
      return {
        name: column.name,
        type: column.type,
        ...parsedType,
        nullable: column.notnull === 0,
        defaultValue: column.dflt_value,
        primaryKey: isPrimaryKey,
        autoIncrement: isPrimaryKey && column.type.toUpperCase() === 'INTEGER',
        foreignKey: foreignKey ? {
          table: foreignKey.table,
          column: foreignKey.to
        } : null
      };
    });
    
    // Get table creation SQL
    const tableInfo = db.prepare(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name = ?
    `).get(tableName);
    
    return {
      name: tableName,
      columns: formattedColumns,
      primaryKey: formattedColumns.filter(col => col.primaryKey).map(col => col.name),
      foreignKeys: foreignKeys.map(fk => ({
        column: fk.from,
        referencedTable: fk.table,
        referencedColumn: fk.to,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete
      })),
      indices: indexDetails,
      sql: tableInfo ? tableInfo.sql : null
    };
  } catch (error) {
    console.error(`Error retrieving schema for table ${tableName}:`, error);
    throw new Error(`Failed to retrieve table schema: ${error.message}`);
  }
}

/**
 * Get data from a table with pagination
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {Object} [options.sort] - Sort configuration { column, direction }
 * @param {Object} [options.filter] - Filter conditions
 * @returns {Promise<Object>} Paginated data
 * @throws {Error} If data cannot be retrieved
 */
async function getTableData(connectionId, tableName, options) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Import the query builder
    const queryBuilder = require('../utils/queryBuilder');
    
    // Use the query builder to create the count query
    const countQuery = queryBuilder.buildCountQuery(tableName, options.filter);
    
    // Execute count query
    const countResult = db.prepare(countQuery.sql).get(...countQuery.params);
    const total = countResult.count;
    
    // Build the paginated select query
    const dataQuery = queryBuilder.buildPaginatedSelectQuery(
      tableName,
      ['*'],
      {
        page: options.page || 1,
        limit: options.limit || 100,
        sort: options.sort,
        filter: options.filter
      }
    );
    
    // Execute data query
    const data = db.prepare(dataQuery.sql).all(...dataQuery.params);
    
    return {
      data,
      total,
      page: options.page || 1,
      limit: options.limit || 100,
      totalPages: Math.ceil(total / (options.limit || 100))
    };
  } catch (error) {
    console.error(`Error retrieving data from table ${tableName}:`, error);
    throw new Error(`Failed to retrieve table data: ${error.message}`);
  }
}

// Note: buildWhereClause function removed as we now use queryBuilder.parseFilters

/**
 * Get a sample of data from a table
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {number} limit - Number of sample rows
 * @returns {Promise<Object>} Sample data
 * @throws {Error} If sample cannot be retrieved
 */
async function getTableSample(connectionId, tableName, limit = 10) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Import the query builder
    const queryBuilder = require('../utils/queryBuilder');
    
    // Make sure limit is a number and reasonable
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 1000);
    
    // Build sample query
    const sampleQuery = queryBuilder.buildPaginatedSelectQuery(
      tableName,
      ['*'],
      { page: 1, limit: safeLimit }
    );
    
    // Query for a sample of data
    const data = db.prepare(sampleQuery.sql).all(...sampleQuery.params);
    
    // Build and execute count query
    const countQuery = queryBuilder.buildCountQuery(tableName);
    const countResult = db.prepare(countQuery.sql).get(...countQuery.params);
    
    return {
      data,
      count: countResult.count,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    };
  } catch (error) {
    console.error(`Error retrieving sample from table ${tableName}:`, error);
    throw new Error(`Failed to retrieve table sample: ${error.message}`);
  }
}

/**
 * Execute a custom query against a database
 * @param {string} connectionId - Connection ID
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query results
 * @throws {Error} If query execution fails
 */
async function executeQuery(connectionId, query, params = []) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Validate query is read-only
    const normalizedQuery = query.trim().toUpperCase();
    
    // Check for write operations
    if (
      normalizedQuery.startsWith('INSERT') ||
      normalizedQuery.startsWith('UPDATE') ||
      normalizedQuery.startsWith('DELETE') ||
      normalizedQuery.startsWith('DROP') ||
      normalizedQuery.startsWith('ALTER') ||
      normalizedQuery.startsWith('CREATE')
    ) {
      throw new Error('Write operations are not allowed');
    }
    
    // Execute the query
    const stmt = db.prepare(query);
    
    let data = [];
    let columns = [];
    
    // Check if it's a SELECT query (returns data)
    if (normalizedQuery.startsWith('SELECT') || normalizedQuery.startsWith('PRAGMA')) {
      data = stmt.all(...params);
      
      // Extract column names from first row
      if (data.length > 0) {
        columns = Object.keys(data[0]);
      }
    } else {
      // For non-SELECT queries (shouldn't happen due to the check above)
      const result = stmt.run(...params);
      data = [{ changes: result.changes, lastInsertRowid: result.lastInsertRowid }];
      columns = ['changes', 'lastInsertRowid'];
    }
    
    return {
      data,
      columns
    };
  } catch (error) {
    console.error(`Error executing query:`, error);
    throw new Error(`Failed to execute query: ${error.message}`);
  }
}

/**
 * Get database statistics
 * @param {string} connectionId - Connection ID
 * @returns {Promise<Object>} Database statistics
 * @throws {Error} If statistics cannot be retrieved
 */
async function getDatabaseStats(connectionId) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Get table count
    const tables = await getAllTables(connectionId);
    
    // Get total row count across all tables
    let totalRows = 0;
    for (const table of tables) {
      totalRows += table.row_count || 0;
    }
    
    // Get database file size
    const connection = await connectionService.getConnectionById(connectionId);
    
    return {
      tableCount: tables.length,
      totalRows,
      size: connection.size_bytes || 0,
      tables: tables.map(t => ({
        name: t.table_name,
        rows: t.row_count || 0
      }))
    };
  } catch (error) {
    console.error(`Error retrieving database stats:`, error);
    throw new Error(`Failed to retrieve database statistics: ${error.message}`);
  }
}

/**
 * Get aggregated data from a table based on specific columns
 * @param {string} connectionId - Connection ID
 * @param {string} tableName - Table name
 * @param {Object} options - Aggregation options
 * @param {Array} options.columns - Columns to select
 * @param {string|Array} options.groupBy - Column(s) to group by
 * @param {Object} options.filter - Filter conditions
 * @param {Object} options.having - Having conditions
 * @param {Object|Array} options.sort - Sort configuration
 * @param {number} options.limit - Maximum number of rows to return
 * @returns {Promise<Object>} Aggregated data
 * @throws {Error} If data cannot be retrieved
 */
async function getAggregatedData(connectionId, tableName, options) {
  try {
    // Get database connection
    const db = await connectionService.getConnection(connectionId);
    
    if (!db) {
      throw new Error(`Database connection not available for ID: ${connectionId}`);
    }
    
    // Import the query builder
    const queryBuilder = require('../utils/queryBuilder');
    
    // Build the aggregation query
    const query = queryBuilder.buildAggregationQuery(tableName, options);
    
    // Execute the query
    const data = db.prepare(query.sql).all(...query.params);
    
    return {
      data,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    };
  } catch (error) {
    console.error(`Error retrieving aggregated data from table ${tableName}:`, error);
    throw new Error(`Failed to retrieve aggregated data: ${error.message}`);
  }
}

module.exports = {
  getAllTables,
  getTableSchema,
  getTableData,
  getTableSample,
  executeQuery,
  getDatabaseStats,
  getAggregatedData
};
