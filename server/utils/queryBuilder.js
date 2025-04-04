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
    sql += ` WHERE ${whereClause.where}`;
    params.push(...whereClause.params);
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
    sql += ` WHERE ${whereClause.where}`;
    params.push(...whereClause.params);
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
  const selectCols = options.columns?.map(escapeIdentifier).join(', ') || '*';
  
  // Build base query
  let sql = `SELECT ${selectCols} FROM ${escapedTableName}`;
  const params = [];
  
  // Add WHERE clause if filter is provided
  if (options.filter) {
    const whereClause = parseFilters(options.filter);
    sql += ` WHERE ${whereClause.where}`;
    params.push(...whereClause.params);
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
    sql += ` HAVING ${havingClause.where}`;
    params.push(...havingClause.params);
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
 * Parse filter conditions
 * @param {Object} filters - Filter conditions
 * @returns {Object} WHERE clause and parameters
 */
function parseFilters(filters) {
  let where = '';
  const params = [];
  
  if (!filters || Object.keys(filters).length === 0) {
    return { where: '1=1', params: [] };
  }
  
  // Special handling for complex operators
  if (filters.$and || filters.$or) {
    if (filters.$and) {
      const conditions = filters.$and.map(filter => {
        const parsed = parseFilters(filter);
        params.push(...parsed.params);
        return `(${parsed.where})`;
      });
      where = conditions.join(' AND ');
    } else if (filters.$or) {
      const conditions = filters.$or.map(filter => {
        const parsed = parseFilters(filter);
        params.push(...parsed.params);
        return `(${parsed.where})`;
      });
      where = conditions.join(' OR ');
    }
  } else {
    // Handle regular field filters
    const conditions = [];
    
    for (const [field, value] of Object.entries(filters)) {
      // Skip special operators (already handled above)
      if (field.startsWith('$')) continue;
      
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
            case '$in':
              if (Array.isArray(opValue) && opValue.length > 0) {
                conditions.push(`${escapedField} IN (${opValue.map(() => '?').join(', ')})`);
                params.push(...opValue);
              } else {
                conditions.push('0=1'); // Empty IN clause should return false
              }
              break;
            case '$exists':
              conditions.push(opValue ? `${escapedField} IS NOT NULL` : `${escapedField} IS NULL`);
              break;
            default:
              // Unknown operator, ignore it
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
  
  // Handle array of sort configs
  if (Array.isArray(sort)) {
    const sortClauses = sort.map(s => {
      const field = escapeIdentifier(s.column || s.field);
      const direction = (s.direction || 'asc').toUpperCase();
      return `${field} ${direction}`;
    });
    return `ORDER BY ${sortClauses.join(', ')}`;
  }
  
  // Handle single sort config
  const field = escapeIdentifier(sort.column || sort.field);
  const direction = (sort.direction || 'asc').toUpperCase();
  return `ORDER BY ${field} ${direction}`;
}

/**
 * Build LIMIT/OFFSET clause
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} SQL clause and parameters
 */
function buildPaginationClause(page, limit) {
  const offset = (page - 1) * limit;
  return {
    sql: 'LIMIT ? OFFSET ?',
    params: [limit, offset]
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
  if (identifier.includes('(') && identifier.includes(')')) return identifier;
  
  // Simple identifier
  return `"${identifier.replace(/"/g, '""')}"`;
}

module.exports = {
  buildPaginatedSelectQuery,
  buildCountQuery,
  buildAggregationQuery,
  parseFilters,
  buildOrderByClause,
  buildPaginationClause,
  escapeIdentifier
};
