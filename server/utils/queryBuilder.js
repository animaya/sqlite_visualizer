/**
 * Query Builder
 * 
 * Utilities for building safe SQL queries with advanced filtering and pagination
 */

/**
 * Build a paginated SELECT query
 * @param {string} tableName - Table name
 * @param {Array} columns - Columns to select
 * @param {Object} options - Query options (pagination, sort, filter)
 * @returns {Object} SQL query and parameters
 */
function buildPaginatedSelectQuery(tableName, columns = ['*'], options = {}) {
  // Escape table name
  const escapedTableName = escapeIdentifier(tableName);
  
  // Default options
  const page = options.page || 1;
  const limit = options.limit || 100;
  
  // Build base query
  let sql = `SELECT ${columns.map(escapeIdentifier).join(', ')} FROM ${escapedTableName}`;
  const params = [];
  
  // Add WHERE clause if filter is provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    if (whereClause.where !== '1=1') {
      sql += ` WHERE ${whereClause.where}`;
      params.push(...whereClause.params);
    }
  }
  
  // Add ORDER BY clause if sort is provided
  if (options.sort) {
    sql += ` ${buildOrderByClause(options.sort)}`;
  }
  
  // Add pagination
  const pagination = buildPaginationClause(page, limit);
  sql += ` ${pagination.sql}`;
  params.push(...pagination.params);
  
  return {
    sql,
    params
  };
}

/**
 * Build a COUNT query
 * @param {string} tableName - Table name
 * @param {Object} filters - Query filters
 * @returns {Object} SQL query and parameters
 */
function buildCountQuery(tableName, filters = {}) {
  // Escape table name
  const escapedTableName = escapeIdentifier(tableName);
  
  // Build base query
  let sql = `SELECT COUNT(*) as count FROM ${escapedTableName}`;
  const params = [];
  
  // Add WHERE clause if filter is provided
  if (filters && Object.keys(filters).length > 0) {
    const whereClause = parseFilters(filters);
    if (whereClause.where !== '1=1') {
      sql += ` WHERE ${whereClause.where}`;
      params.push(...whereClause.params);
    }
  }
  
  return {
    sql,
    params
  };
}

/**
 * Build an aggregation query (for charts/visualizations)
 * @param {string} tableName - Table name
 * @param {Object} options - Aggregation options
 * @returns {Object} SQL query and parameters
 */
function buildAggregationQuery(tableName, options) {
  // Escape table name
  const escapedTableName = escapeIdentifier(tableName);
  
  // Prepare columns for SELECT
  let selectColumns = [];
  
  if (options.aggregations && Array.isArray(options.aggregations)) {
    // Process aggregation functions (COUNT, SUM, AVG, etc.)
    options.aggregations.forEach(agg => {
      if (agg.function && agg.column) {
        const func = agg.function.toUpperCase();
        const col = escapeIdentifier(agg.column);
        const alias = agg.alias ? ` AS ${escapeIdentifier(agg.alias)}` : '';
        
        // Only allow certain aggregation functions for security
        if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(func)) {
          // Handle COUNT(DISTINCT x) case
          if (func === 'COUNT' && agg.distinct) {
            selectColumns.push(`COUNT(DISTINCT ${col})${alias}`);
          } else {
            selectColumns.push(`${func}(${col})${alias}`);
          }
        }
      }
    });
  }
  
  // Handle regular columns (typically for GROUP BY)
  if (options.columns && Array.isArray(options.columns)) {
    options.columns.forEach(col => {
      if (typeof col === 'string') {
        selectColumns.push(escapeIdentifier(col));
      } else if (col.column) {
        const colName = escapeIdentifier(col.column);
        const alias = col.alias ? ` AS ${escapeIdentifier(col.alias)}` : '';
        selectColumns.push(`${colName}${alias}`);
      }
    });
  }
  
  // If no columns specified, use wildcard
  if (selectColumns.length === 0) {
    selectColumns = ['*'];
  }
  
  // Build base query
  let sql = `SELECT ${selectColumns.join(', ')} FROM ${escapedTableName}`;
  const params = [];
  
  // Add WHERE clause if filter is provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    if (whereClause.where !== '1=1') {
      sql += ` WHERE ${whereClause.where}`;
      params.push(...whereClause.params);
    }
  }
  
  // Add GROUP BY clause if groupBy is provided
  if (options.groupBy) {
    if (Array.isArray(options.groupBy)) {
      sql += ` GROUP BY ${options.groupBy.map(escapeIdentifier).join(', ')}`;
    } else {
      sql += ` GROUP BY ${escapeIdentifier(options.groupBy)}`;
    }
  }
  
  // Add HAVING clause if having is provided
  if (options.having) {
    const havingClause = parseFilters(options.having);
    if (havingClause.where !== '1=1') {
      sql += ` HAVING ${havingClause.where}`;
      params.push(...havingClause.params);
    }
  }
  
  // Add ORDER BY clause if sort is provided
  if (options.sort) {
    sql += ` ${buildOrderByClause(options.sort)}`;
  }
  
  // Add LIMIT clause if limit is provided
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  return {
    sql,
    params
  };
}

/**
 * Parse filter conditions with support for complex queries
 * @param {Object} filters - Filter conditions
 * @returns {Object} WHERE clause and parameters
 */
function parseFilters(filters) {
  let where = '';
  const params = [];
  
  // Handle null, undefined, or empty filters
  if (!filters || Object.keys(filters).length === 0) {
    return { where: '1=1', params: [] };
  }
  
  // Parse JSON string if string is provided
  let parsedFilters = filters;
  if (typeof filters === 'string') {
    try {
      parsedFilters = JSON.parse(filters);
    } catch (error) {
      console.error('Failed to parse filter string:', error);
      return { where: '1=1', params: [] };
    }
  }
  
  // Special handling for complex operators
  if (parsedFilters.$and || parsedFilters.$or) {
    if (parsedFilters.$and && Array.isArray(parsedFilters.$and)) {
      const conditions = parsedFilters.$and.map(filter => {
        const parsed = parseFilters(filter);
        params.push(...parsed.params);
        return `(${parsed.where})`;
      });
      where = conditions.join(' AND ');
    } else if (parsedFilters.$or && Array.isArray(parsedFilters.$or)) {
      const conditions = parsedFilters.$or.map(filter => {
        const parsed = parseFilters(filter);
        params.push(...parsed.params);
        return `(${parsed.where})`;
      });
      where = conditions.join(' OR ');
    }
  } else {
    // Handle regular field filters
    const conditions = [];
    
    for (const [field, value] of Object.entries(parsedFilters)) {
      // Skip special operators (already handled above)
      if (field.startsWith('$')) continue;
      
      // Validate field name for security
      if (!isValidIdentifier(field)) {
        console.warn(`Skipping invalid field name in filter: ${field}`);
        continue;
      }
      
      // Escape field name
      const escapedField = escapeIdentifier(field);
      
      // Complex comparison operators
      if (value !== null && typeof value === 'object') {
        for (const [op, opValue] of Object.entries(value)) {
          switch (op) {
            case '$eq':
              conditions.push(`${escapedField} = ?`);
              params.push(opValue);
              break;
            case '$ne':
              conditions.push(`${escapedField} != ?`);
              params.push(opValue);
              break;
            case '$gt':
              conditions.push(`${escapedField} > ?`);
              params.push(opValue);
              break;
            case '$gte':
              conditions.push(`${escapedField} >= ?`);
              params.push(opValue);
              break;
            case '$lt':
              conditions.push(`${escapedField} < ?`);
              params.push(opValue);
              break;
            case '$lte':
              conditions.push(`${escapedField} <= ?`);
              params.push(opValue);
              break;
            case '$like':
              conditions.push(`${escapedField} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
            case '$starts':
              conditions.push(`${escapedField} LIKE ?`);
              params.push(`${opValue}%`);
              break;
            case '$ends':
              conditions.push(`${escapedField} LIKE ?`);
              params.push(`%${opValue}`);
              break;
            case '$regex':
              // SQLite doesn't have native regex, use LIKE with % for basic pattern matching
              // For actual regex, consider using REGEXP function if available
              console.warn('$regex is not fully supported in SQLite, converting to LIKE pattern');
              conditions.push(`${escapedField} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
            case '$in':
              if (Array.isArray(opValue) && opValue.length > 0) {
                conditions.push(`${escapedField} IN (${opValue.map(() => '?').join(', ')})`);
                params.push(...opValue);
              } else {
                conditions.push('0=1'); // Empty IN clause should return false
              }
              break;
            case '$nin':
              if (Array.isArray(opValue) && opValue.length > 0) {
                conditions.push(`${escapedField} NOT IN (${opValue.map(() => '?').join(', ')})`);
                params.push(...opValue);
              } else {
                conditions.push('1=1'); // Empty NOT IN clause should return true
              }
              break;
            case '$exists':
              conditions.push(opValue ? `${escapedField} IS NOT NULL` : `${escapedField} IS NULL`);
              break;
            case '$between':
              if (Array.isArray(opValue) && opValue.length === 2) {
                conditions.push(`${escapedField} BETWEEN ? AND ?`);
                params.push(opValue[0], opValue[1]);
              }
              break;
            case '$contains':
              // For JSON containment or text search
              conditions.push(`${escapedField} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
            case '$search':
              // For full-text search - simplified as SQLite may not have FTS
              conditions.push(`${escapedField} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
            default:
              // Unknown operator, ignore it
              console.warn(`Unknown operator in filter: ${op}`);
              break;
          }
        }
      } else {
        // Simple equality comparison
        if (value === null) {
          conditions.push(`${escapedField} IS NULL`);
        } else {
          conditions.push(`${escapedField} = ?`);
          params.push(value);
        }
      }
    }
    
    // Join all conditions with AND
    where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  }
  
  return { where, params };
}

/**
 * Build ORDER BY clause
 * @param {Object|Array} sort - Sort conditions
 * @returns {string} ORDER BY clause
 */
function buildOrderByClause(sort) {
  if (!sort) return '';
  
  // Parse JSON string if string is provided
  let parsedSort = sort;
  if (typeof sort === 'string') {
    try {
      parsedSort = JSON.parse(sort);
    } catch (error) {
      console.error('Failed to parse sort string:', error);
      return '';
    }
  }
  
  // Handle array of sort configs
  if (Array.isArray(parsedSort)) {
    const sortClauses = parsedSort.map(s => {
      if (!s || (!s.column && !s.field)) return null;
      
      const field = s.column || s.field;
      
      // Validate field name for security
      if (!isValidIdentifier(field)) {
        console.warn(`Skipping invalid field name in sort: ${field}`);
        return null;
      }
      
      const escapedField = escapeIdentifier(field);
      const direction = (s.direction || 'asc').toUpperCase();
      if (direction !== 'ASC' && direction !== 'DESC') {
        return `${escapedField} ASC`;
      }
      return `${escapedField} ${direction}`;
    }).filter(Boolean);
    
    if (sortClauses.length === 0) {
      return '';
    }
    
    return `ORDER BY ${sortClauses.join(', ')}`;
  }
  
  // Handle single sort config
  const field = parsedSort.column || parsedSort.field;
  if (!field || !isValidIdentifier(field)) {
    console.warn(`Invalid or missing field name in sort: ${field}`);
    return '';
  }
  
  const escapedField = escapeIdentifier(field);
  const direction = (parsedSort.direction || 'asc').toUpperCase();
  if (direction !== 'ASC' && direction !== 'DESC') {
    return `ORDER BY ${escapedField} ASC`;
  }
  
  return `ORDER BY ${escapedField} ${direction}`;
}

/**
 * Build LIMIT/OFFSET clause
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} SQL clause and parameters
 */
function buildPaginationClause(page, limit) {
  // Ensure page and limit are positive integers
  const safePage = Math.max(parseInt(page) || 1, 1);
  const safeLimit = Math.max(parseInt(limit) || 100, 1);
  
  const offset = (safePage - 1) * safeLimit;
  return {
    sql: 'LIMIT ? OFFSET ?',
    params: [safeLimit, offset]
  };
}

/**
 * Escape SQL identifier (table name, column name, etc.)
 * @param {string} identifier - SQL identifier
 * @returns {string} Escaped identifier
 */
function escapeIdentifier(identifier) {
  // Skip * wildcard
  if (identifier === '*') return '*';
  
  // Handle function calls and expressions
  if (typeof identifier === 'string' && 
      (identifier.includes('(') && identifier.includes(')'))) {
    return identifier;
  }
  
  // Validate identifier
  if (!isValidIdentifier(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  
  // Simple identifier
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Validate SQL identifier for security
 * @param {string} identifier - SQL identifier to validate
 * @returns {boolean} True if valid
 */
function isValidIdentifier(identifier) {
  // Basic check for common SQL identifiers.
  // IMPORTANT: This is a basic security measure. Complex scenarios (e.g., user-defined identifiers)
  // might require more robust validation, potentially checking against actual schema information
  // or using a dedicated SQL identifier validation library if available.
  // Thorough testing of filter/sort inputs is crucial.
  if (typeof identifier !== 'string') return false;

  // Allowed characters: letters, numbers, underscore
  // Must start with letter or underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * Build a query to find specific text across multiple columns
 * @param {string} tableName - Table name 
 * @param {Array} columns - Columns to search in
 * @param {string} searchText - Text to search for
 * @param {Object} options - Additional options (pagination, sort)
 * @returns {Object} SQL query and parameters
 */
function buildTextSearchQuery(tableName, columns, searchText, options = {}) {
  // Escape table name
  const escapedTableName = escapeIdentifier(tableName);
  
  // Validate columns
  const validColumns = columns.filter(col => isValidIdentifier(col))
                              .map(escapeIdentifier);
  
  if (validColumns.length === 0) {
    throw new Error('No valid columns provided for text search');
  }
  
  // Default options
  const page = options.page || 1;
  const limit = options.limit || 100;
  
  // Build search conditions for each column
  const searchConditions = validColumns.map(col => `${col} LIKE ?`);
  
  // Parameters for LIKE conditions
  const searchParams = Array(validColumns.length).fill(`%${searchText}%`);
  
  // Build base query
  let sql = `SELECT * FROM ${escapedTableName} WHERE (${searchConditions.join(' OR ')})`;
  const params = [...searchParams];
  
  // Add additional filters if provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    if (whereClause.where !== '1=1') {
      sql += ` AND (${whereClause.where})`;
      params.push(...whereClause.params);
    }
  }
  
  // Add ORDER BY clause if sort is provided
  if (options.sort) {
    sql += ` ${buildOrderByClause(options.sort)}`;
  }
  
  // Add pagination
  const pagination = buildPaginationClause(page, limit);
  sql += ` ${pagination.sql}`;
  params.push(...pagination.params);
  
  return {
    sql,
    params
  };
}

/**
 * Build a date range query
 * @param {string} tableName - Table name
 * @param {string} dateColumn - Date column name
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @param {Object} options - Additional options
 * @returns {Object} SQL query and parameters
 */
function buildDateRangeQuery(tableName, dateColumn, startDate, endDate, options = {}) {
  // Escape table name
  const escapedTableName = escapeIdentifier(tableName);
  
  // Validate date column
  if (!isValidIdentifier(dateColumn)) {
    throw new Error(`Invalid date column name: ${dateColumn}`);
  }
  
  const escapedDateColumn = escapeIdentifier(dateColumn);
  
  // Default options
  const page = options.page || 1;
  const limit = options.limit || 100;
  
  // Convert dates to strings if they are Date objects
  const start = startDate instanceof Date ? startDate.toISOString() : startDate;
  const end = endDate instanceof Date ? endDate.toISOString() : endDate;
  
  // Build base query
  let sql = `SELECT * FROM ${escapedTableName} WHERE `;
  const params = [];
  
  // Add date range conditions
  if (start && end) {
    sql += `${escapedDateColumn} BETWEEN ? AND ?`;
    params.push(start, end);
  } else if (start) {
    sql += `${escapedDateColumn} >= ?`;
    params.push(start);
  } else if (end) {
    sql += `${escapedDateColumn} <= ?`;
    params.push(end);
  } else {
    // No date range specified, return all records
    sql += '1=1';
  }
  
  // Add additional filters if provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    if (whereClause.where !== '1=1') {
      sql += ` AND (${whereClause.where})`;
      params.push(...whereClause.params);
    }
  }
  
  // Add ORDER BY clause
  // Default to sort by date column if no sort is provided
  if (options.sort) {
    sql += ` ${buildOrderByClause(options.sort)}`;
  } else {
    sql += ` ORDER BY ${escapedDateColumn} ASC`;
  }
  
  // Add pagination
  const pagination = buildPaginationClause(page, limit);
  sql += ` ${pagination.sql}`;
  params.push(...pagination.params);
  
  return {
    sql,
    params
  };
}

/**
 * Build a sample query to get a representative sample of data
 * @param {string} tableName - Table name
 * @param {number} sampleSize - Number of rows to sample
 * @param {Object} options - Additional options
 * @returns {Object} SQL query and parameters
 */
function buildSampleQuery(tableName, sampleSize = 10, options = {}) {
  // Escape table name
  const escapedTableName = escapeIdentifier(tableName);
  
  // Ensure sample size is reasonable
  const safeSampleSize = Math.min(Math.max(parseInt(sampleSize) || 10, 1), 1000);
  
  // Default columns to select
  const columns = options.columns ? options.columns.filter(col => isValidIdentifier(col))
                                                   .map(escapeIdentifier)
                                  : ['*'];
  
  // Build base query - Use SQLite random() function for sampling
  let sql = `SELECT ${columns.join(', ')} FROM ${escapedTableName}`;
  const params = [];
  
  // Add filter conditions if provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    if (whereClause.where !== '1=1') {
      sql += ` WHERE ${whereClause.where}`;
      params.push(...whereClause.params);
    }
  }
  
  // Add random sampling
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(safeSampleSize);
  
  return {
    sql,
    params
  };
}

/**
 * Parse a raw filter input from API to correct filter object
 * @param {string|Object} filter - Raw filter input
 * @returns {Object} Parsed filter object
 */
function parseRawFilter(filter) {
  if (!filter) return {};
  
  // If it's already an object, return it
  if (typeof filter === 'object' && !Array.isArray(filter)) {
    return filter;
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof filter === 'string') {
    try {
      return JSON.parse(filter);
    } catch (error) {
      console.error('Failed to parse filter string:', error);
      return {};
    }
  }
  
  // Otherwise, return empty filter
  return {};
}

/**
 * Parse a raw sort input from API to correct sort object
 * @param {string|Object|Array} sort - Raw sort input
 * @returns {Object|Array} Parsed sort object
 */
function parseRawSort(sort) {
  if (!sort) return null;
  
  // If it's already an object or array, return it
  if (typeof sort === 'object') {
    return sort;
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof sort === 'string') {
    try {
      return JSON.parse(sort);
    } catch (error) {
      // If it's not JSON, it might be a simple column name
      if (isValidIdentifier(sort)) {
        return { column: sort, direction: 'asc' };
      }
      
      // If it includes a space, it might be "column direction"
      const parts = sort.split(/\s+/);
      if (parts.length === 2 && isValidIdentifier(parts[0])) {
        const direction = parts[1].toLowerCase();
        if (direction === 'asc' || direction === 'desc') {
          return { column: parts[0], direction };
        }
      }
      
      console.error('Failed to parse sort string:', error);
      return null;
    }
  }
  
  // Otherwise, return null
  return null;
}

/**
 * Build a JOIN query to get data from multiple related tables
 * @param {string} mainTable - Main table name
 * @param {Array} joins - Join configurations
 * @param {Object} options - Additional options
 * @returns {Object} SQL query and parameters
 */
function buildJoinQuery(mainTable, joins, options = {}) {
  // Escape main table name
  const escapedMainTable = escapeIdentifier(mainTable);
  
  // Default options
  const page = options.page || 1;
  const limit = options.limit || 100;
  
  // Default columns to select from main table
  const mainTablePrefix = options.tableAliases && options.tableAliases[mainTable] 
    ? options.tableAliases[mainTable] 
    : mainTable;
    
  let selectCols = options.columns && Array.isArray(options.columns) 
    ? options.columns.map(col => {
        // If column is already fully qualified
        if (col.includes('.')) return escapeIdentifier(col);
        // Otherwise qualify with main table
        return `${escapeIdentifier(mainTablePrefix)}.${escapeIdentifier(col)}`;
      })
    : [`${escapeIdentifier(mainTablePrefix)}.*`];
  
  // Build base query
  let sql = `SELECT ${selectCols.join(', ')} FROM ${escapedMainTable}`;
  
  // Add table alias if provided
  if (options.tableAliases && options.tableAliases[mainTable]) {
    sql += ` AS ${escapeIdentifier(options.tableAliases[mainTable])}`;
  }
  
  const params = [];
  
  // Add joins
  if (joins && Array.isArray(joins)) {
    joins.forEach(join => {
      if (!join.table || !join.on) return;
      
      const joinType = (join.type || 'INNER').toUpperCase();
      if (!['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(joinType)) {
        console.warn(`Invalid join type: ${join.type}, defaulting to INNER`);
        join.type = 'INNER';
      }
      
      const escapedJoinTable = escapeIdentifier(join.table);
      const joinTableAlias = options.tableAliases && options.tableAliases[join.table]
        ? ` AS ${escapeIdentifier(options.tableAliases[join.table])}`
        : '';
      
      sql += ` ${joinType} JOIN ${escapedJoinTable}${joinTableAlias} ON ${join.on}`;
    });
  }
  
  // Add WHERE clause if filter is provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    if (whereClause.where !== '1=1') {
      sql += ` WHERE ${whereClause.where}`;
      params.push(...whereClause.params);
    }
  }
  
  // Add GROUP BY clause if groupBy is provided
  if (options.groupBy) {
    if (Array.isArray(options.groupBy)) {
      sql += ` GROUP BY ${options.groupBy.map(escapeIdentifier).join(', ')}`;
    } else {
      sql += ` GROUP BY ${escapeIdentifier(options.groupBy)}`;
    }
  }
  
  // Add HAVING clause if having is provided
  if (options.having) {
    const havingClause = parseFilters(options.having);
    if (havingClause.where !== '1=1') {
      sql += ` HAVING ${havingClause.where}`;
      params.push(...havingClause.params);
    }
  }
  
  // Add ORDER BY clause if sort is provided
  if (options.sort) {
    sql += ` ${buildOrderByClause(options.sort)}`;
  }
  
  // Add pagination
  const pagination = buildPaginationClause(page, limit);
  sql += ` ${pagination.sql}`;
  params.push(...pagination.params);
  
  return {
    sql,
    params
  };
}

/**
 * Get list of operators supported by the query builder
 * For documentation and UI hints
 * @returns {Object} Supported operators and their descriptions
 */
function getSupportedOperators() {
  return {
    // Comparison operators
    '$eq': 'Equal to',
    '$ne': 'Not equal to',
    '$gt': 'Greater than',
    '$gte': 'Greater than or equal to',
    '$lt': 'Less than',
    '$lte': 'Less than or equal to',
    
    // String operators
    '$like': 'Contains substring (case sensitive)',
    '$starts': 'Starts with',
    '$ends': 'Ends with',
    '$contains': 'Contains substring (alias for $like)',
    
    // Array operators
    '$in': 'Value is in array',
    '$nin': 'Value is not in array',
    
    // Range operator
    '$between': 'Value is between two values',
    
    // Existence operator
    '$exists': 'Field exists (true) or does not exist (false)',
    
    // Search operator
    '$search': 'Full text search (similar to $like)',
    
    // Logic operators
    '$and': 'Logical AND of multiple conditions',
    '$or': 'Logical OR of multiple conditions'
  };
}

module.exports = {
  buildPaginatedSelectQuery,
  buildCountQuery,
  buildAggregationQuery,
  parseFilters,
  buildOrderByClause,
  buildPaginationClause,
  escapeIdentifier,
  isValidIdentifier,
  buildTextSearchQuery,
  buildDateRangeQuery,
  buildSampleQuery,
  parseRawFilter,
  parseRawSort,
  buildJoinQuery,
  getSupportedOperators
};
