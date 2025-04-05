/**
 * Tables Route Handler
 * 
 * Handles all API endpoints related to database tables
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const connectionService = require('../services/connectionService');
const databaseService = require('../services/databaseService');
const queryBuilder = require('../utils/queryBuilder');
const dbUtils = require('../utils/dbUtils');
const { validateParams, validateQuery, schemas } = require('../middleware/dataValidator');
const Joi = require('joi');

// Table name parameter validation schema
const tableNameSchema = Joi.object({
  table: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).required()
    .messages({
      'string.pattern.base': 'Table name contains invalid characters'
    }),
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Connection ID must be a number',
      'number.integer': 'Connection ID must be an integer',
      'number.positive': 'Connection ID must be positive'
    })
});

// Sample data query schema
const sampleQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

// Enhanced table data query schema with advanced filtering
const tableDataQuerySchema = schemas.table.query.keys({
  filter: Joi.string().optional()
    .messages({
      'string.base': 'Filter must be a valid JSON string'
    }),
  sort: Joi.string().optional()
    .messages({
      'string.base': 'Sort must be a valid JSON string'
    }),
  search: Joi.string().optional()
    .messages({
      'string.base': 'Search must be a text string'
    }),
  searchColumns: Joi.string().optional()
    .messages({
      'string.base': 'Search columns must be a comma-separated list or JSON array'
    }),
  dateRange: Joi.string().optional()
    .messages({
      'string.base': 'Date range must be a valid JSON object with start and end properties'
    }),
  dateColumn: Joi.string().optional()
    .messages({
      'string.base': 'Date column must be a valid column name'
    })
});

/**
 * GET /api/connections/:id/tables
 * List all tables in the database
 */
router.get('/', 
  validateParams(schemas.connection.id),
  async (req, res, next) => {
    const connectionId = req.params.id;
    console.log(`Requesting tables for connection ID: ${connectionId}`);

    // Set a timeout for this operation
    const timeoutId = setTimeout(() => {
      console.error(`Timeout retrieving tables for connection ${connectionId}`);
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
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
          success: false,
          error: 'Connection not found',
          message: `No valid connection found with ID: ${connectionId}`
        });
      }
      
      // Use synchronous API for better-sqlite3
      const tables = db.prepare(
        `SELECT name, type, sql as creation_sql
         FROM sqlite_master 
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      ).all();
      
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
          // Use QueryBuilder for a clean count query
          const countQuery = queryBuilder.buildCountQuery(table.name);
          
          // Get approximate row count using synchronous API
          let countResult;
          try {
            countResult = db.prepare(countQuery.sql).get(...countQuery.params) || { count: 0 };
          } catch (err) {
            console.warn(`Error counting rows for ${table.name}: ${err.message}`);
            countResult = { count: 0 };
          }
          
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
      res.json({
        success: true,
        data: tablesWithDetails
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error getting tables for connection ${connectionId}:`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve tables',
          message: error.message
        });
      }
    }
  }
);

/**
 * GET /api/connections/:id/tables/:table/schema
 * Get table schema
 */
router.get('/:table/schema', 
  validateParams(tableNameSchema),
  async (req, res, next) => {
    const { id, table } = req.params;
    
    try {
      // Get database connection directly
      const db = await connectionService.getConnection(id);
      
      if (!db) {
        return res.status(404).json({ 
          success: false,
          error: 'Connection not found',
          message: `No valid connection found with ID: ${id}`
        });
      }
      
      // Check if table exists using synchronous API
      const tableExists = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      ).get(table) !== undefined;
      
      if (!tableExists) {
        return res.status(404).json({
          success: false,
          error: 'Table not found',
          message: `Table '${table}' does not exist in this database`
        });
      }
      
      // Get table schema using synchronous API
      let columns;
      try {
        columns = db.prepare(`PRAGMA table_info("${table}")`).all();
      } catch (err) {
        throw new Error(`Error getting column info: ${err.message}`);
      }
      
      // Get foreign key info
      let foreignKeys;
      try {
        foreignKeys = db.prepare(`PRAGMA foreign_key_list("${table}")`).all();
      } catch (err) {
        console.warn(`Error getting foreign keys for ${table}: ${err.message}`);
        foreignKeys = [];
      }
      
      // Get index info
      let indices;
      try {
        indices = db.prepare(`PRAGMA index_list("${table}")`).all();
      } catch (err) {
        console.warn(`Error getting indices for ${table}: ${err.message}`);
        indices = [];
      }
      
      // Process index details with synchronous API
      const indexDetails = indices.map((index) => {
        let columns;
        try {
          columns = db.prepare(`PRAGMA index_info("${index.name}")`).all();
        } catch (err) {
          console.warn(`Error getting index details for ${index.name}: ${err.message}`);
          columns = [];
        }
        
        return {
          ...index,
          columns: columns.map(col => ({
            name: col.name,
            position: col.seqno
          }))
        };
      });
      
      // Format the columns with additional info
      const formattedColumns = columns.map(column => {
        // Check if column is part of a primary key
        const isPrimaryKey = column.pk === 1;
        
        // Check if column is a foreign key
        const foreignKey = foreignKeys.find(fk => fk.from === column.name);
        
        // Parse the column type
        const typeInfo = dbUtils.parseColumnType(column.type);
        
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
        success: true,
        data: {
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
          indices: indexDetails
        }
      });
    } catch (error) {
      console.error(`Error getting schema for table ${table}:`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve table schema',
          message: error.message
        });
      }
    }
  }
);

/**
 * GET /api/connections/:id/tables/:table/data
 * Get table data (with pagination, filtering, sorting, and searching)
 */
router.get('/:table/data', 
  validateParams(tableNameSchema),
  validateQuery(tableDataQuerySchema),
  async (req, res, next) => {
    const { id, table } = req.params;
    const { 
      page = 1, 
      limit = 100, 
      sort: sortParam, 
      filter: filterParam,
      search,
      searchColumns,
      dateRange,
      dateColumn
    } = req.query;
    
    // Set a timeout for this operation
    const timeoutId = setTimeout(() => {
      console.error(`Timeout retrieving data for table ${table}`);
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
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
          success: false,
          error: 'Connection not found',
          message: `No valid connection found with ID: ${id}`
        });
      }
      
      // Parse filter, sort, and other parameters
      const sort = queryBuilder.parseRawSort(sortParam);
      const filter = queryBuilder.parseRawFilter(filterParam);
      
      // Get table schema to determine date fields and searchable columns
      let columns;
      try {
        columns = db.prepare(`PRAGMA table_info("${table}")`).all();
      } catch (err) {
        console.error(`Error getting column info: ${err.message}`);
        throw new Error(`Error getting column info: ${err.message}`);
      }
      
      // Extract column names for search if needed
      const columnNames = columns.map(col => col.name);
      
      // Build the appropriate query based on parameters
      let query;
      let countQuery;
      
      // Handle text search if requested
      if (search && search.trim()) {
        // Parse searchColumns parameter
        let searchableColumns = [];
        if (searchColumns) {
          try {
            // Try parsing as JSON array
            searchableColumns = JSON.parse(searchColumns);
          } catch (e) {
            // Fall back to comma-separated list
            searchableColumns = searchColumns.split(',').map(col => col.trim());
          }
          
          // Validate that all columns exist in the table
          searchableColumns = searchableColumns.filter(col => columnNames.includes(col));
        }
        
        // If no valid search columns specified, use all text-like columns
        if (searchableColumns.length === 0) {
          searchableColumns = columns
            .filter(col => {
              const type = col.type.toUpperCase();
              return type.includes('TEXT') || type.includes('CHAR') || type.includes('VARCHAR');
            })
            .map(col => col.name);
        }
        
        // If we have columns to search in, use text search query
        if (searchableColumns.length > 0) {
          query = queryBuilder.buildTextSearchQuery(table, searchableColumns, search, {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            filter
          });
          
          // Build count query with the same WHERE clause but without pagination
          const whereConditions = searchableColumns.map(() => '?');
          const whereParams = Array(searchableColumns.length).fill(`%${search}%`);
          
          countQuery = {
            sql: `SELECT COUNT(*) as count FROM "${table}" WHERE (${searchableColumns.map(col => `"${col}" LIKE ?`).join(' OR ')})`,
            params: whereParams
          };
          
          // Add filter conditions to count query if needed
          if (filter && Object.keys(filter).length > 0) {
            const filterClause = queryBuilder.parseFilters(filter);
            if (filterClause.where !== '1=1') {
              countQuery.sql += ` AND (${filterClause.where})`;
              countQuery.params.push(...filterClause.params);
            }
          }
        } else {
          // Fall back to regular query if no text columns found
          query = queryBuilder.buildPaginatedSelectQuery(table, ['*'], {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            filter
          });
          
          countQuery = queryBuilder.buildCountQuery(table, filter);
        }
      }
      // Handle date range filtering if requested
      else if (dateRange && dateColumn && columnNames.includes(dateColumn)) {
        let dateRangeObj;
        try {
          dateRangeObj = JSON.parse(dateRange);
        } catch (e) {
          console.warn(`Invalid date range: ${dateRange}`);
          dateRangeObj = {};
        }
        
        const { start, end } = dateRangeObj;
        
        if (start || end) {
          query = queryBuilder.buildDateRangeQuery(table, dateColumn, start, end, {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            filter
          });
          
          // Build a count query with the same WHERE clause
          countQuery = {
            sql: `SELECT COUNT(*) as count FROM "${table}" WHERE `,
            params: []
          };
          
          if (start && end) {
            countQuery.sql += `"${dateColumn}" BETWEEN ? AND ?`;
            countQuery.params.push(start, end);
          } else if (start) {
            countQuery.sql += `"${dateColumn}" >= ?`;
            countQuery.params.push(start);
          } else if (end) {
            countQuery.sql += `"${dateColumn}" <= ?`;
            countQuery.params.push(end);
          } else {
            countQuery.sql += '1=1';
          }
          
          // Add filter conditions if needed
          if (filter && Object.keys(filter).length > 0) {
            const filterClause = queryBuilder.parseFilters(filter);
            if (filterClause.where !== '1=1') {
              countQuery.sql += ` AND (${filterClause.where})`;
              countQuery.params.push(...filterClause.params);
            }
          }
        } else {
          // Fall back to regular query if no valid date range
          query = queryBuilder.buildPaginatedSelectQuery(table, ['*'], {
            page: parseInt(page),
            limit: parseInt(limit),
            sort,
            filter
          });
          
          countQuery = queryBuilder.buildCountQuery(table, filter);
        }
      }
      // Regular query with standard filtering and pagination
      else {
        query = queryBuilder.buildPaginatedSelectQuery(table, ['*'], {
          page: parseInt(page),
          limit: parseInt(limit),
          sort,
          filter
        });
        
        countQuery = queryBuilder.buildCountQuery(table, filter);
      }
      
      // Execute count query first to get total using synchronous API
      let countResult;
      try {
        countResult = db.prepare(countQuery.sql).get(...countQuery.params) || { count: 0 };
      } catch (err) {
        throw new Error(`Error executing count query: ${err.message}`);
      }
      
      // Now execute the main data query using synchronous API
      let data;
      try {
        data = db.prepare(query.sql).all(...query.params);
      } catch (err) {
        throw new Error(`Error executing data query: ${err.message}`);
      }
      
      // Clear the timeout as we've completed the operation
      clearTimeout(timeoutId);
      
      // Return the results
      res.json({
        success: true,
        data: data,
        meta: {
          total: countResult.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.count / parseInt(limit))
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Error getting data for table ${table}:`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve table data',
          message: error.message
        });
      }
    }
  }
);

/**
 * GET /api/connections/:id/tables/:table/data/sample
 * Get a sample of table data
 */
router.get('/:table/data/sample', 
  validateParams(tableNameSchema),
  validateQuery(sampleQuerySchema),
  async (req, res, next) => {
    const { id, table } = req.params;
    const { limit = 10 } = req.query;
    
    try {
      // Get database connection directly
      const db = await connectionService.getConnection(id);
      
      if (!db) {
        return res.status(404).json({ 
          success: false,
          error: 'Connection not found',
          message: `No valid connection found with ID: ${id}`
        });
      }
      
      // Use the sample query builder from the enhanced query builder
      const sampleQuery = queryBuilder.buildSampleQuery(table, parseInt(limit));
      
      // Execute the sample query using synchronous API
      let data;
      try {
        data = db.prepare(sampleQuery.sql).all(...sampleQuery.params);
      } catch (err) {
        throw new Error(`Error executing sample query: ${err.message}`);
      }
      
      // Get total count using query builder
      const countQuery = queryBuilder.buildCountQuery(table);
      let countResult;
      try {
        countResult = db.prepare(countQuery.sql).get(...countQuery.params) || { count: 0 };
      } catch (err) {
        console.warn(`Error counting rows for ${table}: ${err.message}`);
        countResult = { count: 0 };
      }
      
      // Return the sample
      res.json({
        success: true,
        data: data,
        meta: {
          totalRows: countResult.count,
          sampleSize: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : []
        }
      });
    } catch (error) {
      console.error(`Error getting sample data for table ${table}:`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve table sample',
          message: error.message
        });
      }
    }
  }
);

/**
 * GET /api/connections/:id/tables/:table/search
 * Search for text across multiple columns
 */
router.get('/:table/search', 
  validateParams(tableNameSchema),
  async (req, res, next) => {
    const { id, table } = req.params;
    const { query, columns, page = 1, limit = 100 } = req.query;
    
    try {
      // Get database connection directly
      const db = await connectionService.getConnection(id);
      
      if (!db) {
        return res.status(404).json({ 
          success: false,
          error: 'Connection not found',
          message: `No valid connection found with ID: ${id}`
        });
      }
      
      // Validate search query
      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Invalid search query',
          message: 'Search query is required'
        });
      }
      
      // Get table columns to determine which ones to search using synchronous API
      let tableColumns;
      try {
        tableColumns = db.prepare(`PRAGMA table_info("${table}")`).all();
      } catch (err) {
        throw new Error(`Error getting table columns: ${err.message}`);
      }
      
      // Parse columns parameter
      let searchColumns = [];
      if (columns) {
        try {
          // Try parsing as JSON array
          searchColumns = JSON.parse(columns);
        } catch (e) {
          // Fall back to comma-separated list
          searchColumns = columns.split(',').map(col => col.trim());
        }
        
        // Validate that all columns exist in the table
        const columnNames = tableColumns.map(col => col.name);
        searchColumns = searchColumns.filter(col => columnNames.includes(col));
      }
      
      // If no valid search columns specified, use all text-like columns
      if (searchColumns.length === 0) {
        searchColumns = tableColumns
          .filter(col => {
            const type = col.type.toUpperCase();
            return type.includes('TEXT') || type.includes('CHAR') || type.includes('VARCHAR');
          })
          .map(col => col.name);
      }
      
      // Build search query if we have columns to search in
      if (searchColumns.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No searchable columns',
          message: 'This table has no text columns that can be searched'
        });
      }
      
      // Build and execute search query
      const searchQuery = queryBuilder.buildTextSearchQuery(
        table, 
        searchColumns, 
        query, 
        {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      );
      
      // Execute search query using synchronous API
      let data;
      try {
        data = db.prepare(searchQuery.sql).all(...searchQuery.params);
      } catch (err) {
        throw new Error(`Error executing search query: ${err.message}`);
      }
      
      // Build and execute count query
      const countQuery = {
        sql: `SELECT COUNT(*) as count FROM "${table}" WHERE (${searchColumns.map(col => `"${col}" LIKE ?`).join(' OR ')})`,
        params: Array(searchColumns.length).fill(`%${query}%`)
      };
      
      let countResult;
      try {
        countResult = db.prepare(countQuery.sql).get(...countQuery.params) || { count: 0 };
      } catch (err) {
        throw new Error(`Error executing count query: ${err.message}`);
      }
      
      // Return the search results
      res.json({
        success: true,
        data: data,
        meta: {
          query: query,
          searchedColumns: searchColumns,
          total: countResult.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult.count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error(`Error searching table ${table}:`, error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to search table',
          message: error.message
        });
      }
    }
  }
);

/**
 * GET /api/connections/:id/tables/:table/operators
 * Get the list of supported query operators
 */
router.get('/:table/operators', (req, res) => {
  try {
    const operators = queryBuilder.getSupportedOperators();
    
    res.json({
      success: true,
      data: operators
    });
  } catch (error) {
    console.error('Error getting operators:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get operators',
      message: error.message
    });
  }
});

module.exports = router;
