/**
 * Query Builder
 * 
 * Utilities for building safe SQL queries
 */

/**
 * Build a paginated SELECT query
 * @param {string} tableName - Table name
 * @param {Array} columns - Columns to select
 * @param {Object} options - Query options (pagination, sort, filter)
 * @returns {Object} Object with SQL query and params array
 */
function buildPaginatedSelectQuery(tableName, columns = ['*'], options = {}) {
  // Sanitize table name and columns
  const safeTableName = sanitizeIdentifier(tableName);
  const safeColumns = columns.map(col => sanitizeIdentifier(col));
  
  // Start building the query
  let sql = `SELECT ${safeColumns.map(col => `"${col}"`).join(', ')} FROM "${safeTableName}"`;
  const params = [];
  
  // Add WHERE clause if filters are provided
  if (options.filter && Object.keys(options.filter).length > 0) {
    const filterResult = parseFilters(options.filter);
    if (filterResult.where) {
      sql += ` WHERE ${filterResult.where}`;
      params.push(...filterResult.params);
    }
  }
  
  // Add GROUP BY clause if provided
  if (options.groupBy) {
    if (Array.isArray(options.groupBy)) {
      const safeGroupColumns = options.groupBy.map(col => sanitizeIdentifier(col));
      sql += ` GROUP BY ${safeGroupColumns.map(col => `"${col}"`).join(', ')}`;
    } else {
      const safeGroupColumn = sanitizeIdentifier(options.groupBy);
      sql += ` GROUP BY "${safeGroupColumn}"`;
    }
  }
  
  // Add HAVING clause if provided
  if (options.having && Object.keys(options.having).length > 0) {
    const havingResult = parseFilters(options.having, 'HAVING');
    if (havingResult.where) {
      sql += ` HAVING ${havingResult.where}`;
      params.push(...havingResult.params);
    }
  }
  
  // Add ORDER BY clause if sort is provided
  if (options.sort) {
    const orderClause = buildOrderByClause(options.sort);
    if (orderClause) {
      sql += ` ${orderClause}`;
    }
  }
  
  // Add pagination with LIMIT/OFFSET
  if (options.page !== undefined && options.limit !== undefined) {
    const paginationClause = buildPaginationClause(options.page, options.limit);
    sql += ` ${paginationClause.sql}`;
    params.push(...paginationClause.params);
  } else if (options.limit !== undefined) {
    // Just limit without pagination
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  return {
    sql,
    params
  };
}

/**
 * Build a COUNT query
 * @param {string} tableName - Table name
 * @param {Object} filters - Query filters
 * @returns {Object} Object with SQL query and params array
 */
function buildCountQuery(tableName, filters = {}) {
  // Sanitize table name
  const safeTableName = sanitizeIdentifier(tableName);
  
  // Start building the query
  let sql = `SELECT COUNT(*) as count FROM "${safeTableName}"`;
  const params = [];
  
  // Add WHERE clause if filters are provided
  if (Object.keys(filters).length > 0) {
    const filterResult = parseFilters(filters);
    if (filterResult.where) {
      sql += ` WHERE ${filterResult.where}`;
      params.push(...filterResult.params);
    }
  }
  
  return {
    sql,
    params
  };
}

/**
 * Parse filter conditions
 * @param {Object} filters - Filter conditions
 * @param {string} type - Filter type ('WHERE' or 'HAVING')
 * @returns {Object} Object with where clause and params array
 */
function parseFilters(filters, type = 'WHERE') {
  if (!filters || Object.keys(filters).length === 0) {
    return { where: '', params: [] };
  }
  
  const conditions = [];
  const params = [];
  
  // Process filter conditions
  Object.entries(filters).forEach(([column, value]) => {
    // Skip null or undefined values
    if (value === null || value === undefined) {
      return;
    }
    
    // Sanitize column name
    const safeColumn = sanitizeIdentifier(column);
    
    if (!safeColumn) {
      return;
    }
    
    // Handle complex operators
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([op, opValue]) => {
        if (opValue === null || opValue === undefined) {
          return;
        }
        
        switch (op.toLowerCase()) {
          case 'eq':
            conditions.push(`"${safeColumn}" = ?`);
            params.push(opValue);
            break;
          case 'ne':
          case 'neq':
            conditions.push(`"${safeColumn}" != ?`);
            params.push(opValue);
            break;
          case 'gt':
            conditions.push(`"${safeColumn}" > ?`);
            params.push(opValue);
            break;
          case 'gte':
            conditions.push(`"${safeColumn}" >= ?`);
            params.push(opValue);
            break;
          case 'lt':
            conditions.push(`"${safeColumn}" < ?`);
            params.push(opValue);
            break;
          case 'lte':
            conditions.push(`"${safeColumn}" <= ?`);
            params.push(opValue);
            break;
          case 'like':
            conditions.push(`"${safeColumn}" LIKE ?`);
            params.push(`%${opValue}%`);
            break;
          case 'startswith':
            conditions.push(`"${safeColumn}" LIKE ?`);
            params.push(`${opValue}%`);
            break;
          case 'endswith':
            conditions.push(`"${safeColumn}" LIKE ?`);
            params.push(`%${opValue}`);
            break;
          case 'in':
            if (Array.isArray(opValue) && opValue.length > 0) {
              conditions.push(`"${safeColumn}" IN (${opValue.map(() => '?').join(', ')})`);
              params.push(...opValue);
            }
            break;
          case 'between':
            if (Array.isArray(opValue) && opValue.length === 2) {
              conditions.push(`"${safeColumn}" BETWEEN ? AND ?`);
              params.push(opValue[0], opValue[1]);
            }
            break;
          case 'isnull':
            if (opValue === true) {
              conditions.push(`"${safeColumn}" IS NULL`);
            } else {
              conditions.push(`"${safeColumn}" IS NOT NULL`);
            }
            break;
        }
      });
    } else if (Array.isArray(value)) {
      // Array of values for IN clause
      if (value.length > 0) {
        conditions.push(`"${safeColumn}" IN (${value.map(() => '?').join(', ')})`);
        params.push(...value);
      }
    } else {
      // Simple equality
      conditions.push(`"${safeColumn}" = ?`);
      params.push(value);
    }
  });
  
  return {
    where: conditions.join(' AND '),
    params
  };
}

/**
 * Build ORDER BY clause
 * @param {Object|Array} sort - Sort conditions
 * @returns {string} ORDER BY clause
 */
function buildOrderByClause(sort) {
  if (!sort) {
    return '';
  }
  
  // Handle array of sort conditions
  if (Array.isArray(sort)) {
    if (sort.length === 0) {
      return '';
    }
    
    const sortClauses = sort.map(item => {
      if (typeof item === 'string') {
        // Simple column name
        const safeColumn = sanitizeIdentifier(item);
        return `"${safeColumn}" ASC`;
      } else if (typeof item === 'object') {
        // Object with column and direction
        const column = item.column || item.field;
        const direction = (item.direction || 'ASC').toUpperCase();
        if (!column) return null;
        
        const safeColumn = sanitizeIdentifier(column);
        const safeDirection = direction === 'DESC' ? 'DESC' : 'ASC';
        return `"${safeColumn}" ${safeDirection}`;
      }
      return null;
    }).filter(Boolean);
    
    if (sortClauses.length === 0) {
      return '';
    }
    
    return `ORDER BY ${sortClauses.join(', ')}`;
  }
  
  // Handle single sort object
  if (typeof sort === 'object') {
    const column = sort.column || sort.field;
    const direction = (sort.direction || 'ASC').toUpperCase();
    
    if (!column) {
      return '';
    }
    
    const safeColumn = sanitizeIdentifier(column);
    const safeDirection = direction === 'DESC' ? 'DESC' : 'ASC';
    
    return `ORDER BY "${safeColumn}" ${safeDirection}`;
  }
  
  // Handle simple string column name
  if (typeof sort === 'string') {
    const safeColumn = sanitizeIdentifier(sort);
    return `ORDER BY "${safeColumn}" ASC`;
  }
  
  return '';
}

/**
 * Build LIMIT/OFFSET clause
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} Object with SQL clause and params array
 */
function buildPaginationClause(page, limit) {
  // Default values
  const safePage = Math.max(parseInt(page) || 1, 1);
  const safeLimit = Math.max(parseInt(limit) || 10, 1);
  
  // Calculate offset
  const offset = (safePage - 1) * safeLimit;
  
  return {
    sql: 'LIMIT ? OFFSET ?',
    params: [safeLimit, offset]
  };
}

/**
 * Sanitize SQL identifier (table or column name)
 * @param {string} identifier - Identifier to sanitize
 * @returns {string} Sanitized identifier
 */
function sanitizeIdentifier(identifier) {
  if (!identifier) return '';
  
  // Handle special case for wildcard
  if (identifier === '*') return '*';
  
  // Remove any potentially dangerous characters
  return identifier.toString().replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Build an aggregation query
 * @param {string} tableName - Table name
 * @param {Object} options - Query options
 * @returns {Object} Object with SQL query and params array
 */
function buildAggregationQuery(tableName, options) {
  const safeTableName = sanitizeIdentifier(tableName);
  
  // Extract options
  const {
    columns = [],
    groupBy,
    having,
    sort,
    limit
  } = options;
  
  if (!groupBy && columns.length < 1) {
    throw new Error('Either groupBy or at least one column must be specified');
  }
  
  // Process columns
  const selectColumns = [];
  const params = [];
  
  columns.forEach(col => {
    if (typeof col === 'string') {
      // Simple column
      const safeCol = sanitizeIdentifier(col);
      selectColumns.push(`"${safeCol}"`);
    } else if (typeof col === 'object') {
      // Aggregation column
      const { column, aggregate, alias } = col;
      
      if (!column || !aggregate) {
        return;
      }
      
      const safeCol = sanitizeIdentifier(column);
      const safeAggregate = sanitizeAggregateFunction(aggregate);
      const safeAlias = alias ? sanitizeIdentifier(alias) : `${safeAggregate}_${safeCol}`;
      
      selectColumns.push(`${safeAggregate}("${safeCol}") AS "${safeAlias}"`);
    }
  });
  
  // Start building the query
  let sql = `SELECT ${selectColumns.join(', ')} FROM "${safeTableName}"`;
  
  // Add WHERE clause if filters are provided
  if (options.filter && Object.keys(options.filter).length > 0) {
    const filterResult = parseFilters(options.filter);
    if (filterResult.where) {
      sql += ` WHERE ${filterResult.where}`;
      params.push(...filterResult.params);
    }
  }
  
  // Add GROUP BY clause
  if (groupBy) {
    if (Array.isArray(groupBy)) {
      const safeGroupColumns = groupBy.map(col => sanitizeIdentifier(col));
      sql += ` GROUP BY ${safeGroupColumns.map(col => `"${col}"`).join(', ')}`;
    } else {
      const safeGroupColumn = sanitizeIdentifier(groupBy);
      sql += ` GROUP BY "${safeGroupColumn}"`;
    }
  }
  
  // Add HAVING clause
  if (having && Object.keys(having).length > 0) {
    const havingResult = parseFilters(having, 'HAVING');
    if (havingResult.where) {
      sql += ` HAVING ${havingResult.where}`;
      params.push(...havingResult.params);
    }
  }
  
  // Add ORDER BY clause
  if (sort) {
    const orderClause = buildOrderByClause(sort);
    if (orderClause) {
      sql += ` ${orderClause}`;
    }
  }
  
  // Add LIMIT clause
  if (limit !== undefined) {
    sql += ` LIMIT ?`;
    params.push(parseInt(limit));
  }
  
  return {
    sql,
    params
  };
}

/**
 * Sanitize SQL aggregate function name
 * @param {string} fn - Function name to sanitize
 * @returns {string} Sanitized function name
 */
function sanitizeAggregateFunction(fn) {
  if (!fn) return 'COUNT';
  
  // Allowed aggregate functions
  const allowedFunctions = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 
    'GROUP_CONCAT', 'TOTAL', 'COUNT_DISTINCT'
  ];
  
  const upperFn = fn.toUpperCase();
  
  // Special case for COUNT DISTINCT
  if (upperFn === 'COUNT_DISTINCT') {
    return 'COUNT(DISTINCT';
  }
  
  return allowedFunctions.includes(upperFn) ? upperFn : 'COUNT';
}

module.exports = {
  buildPaginatedSelectQuery,
  buildCountQuery,
  parseFilters,
  buildOrderByClause,
  buildPaginationClause,
  buildAggregationQuery,
  sanitizeIdentifier,
  sanitizeAggregateFunction
};
