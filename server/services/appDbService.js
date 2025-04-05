/**
 * Application Database Service
 * 
 * Handles operations on the application's own SQLite database
 * which stores connections, saved visualizations, and templates
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db = null;

// --- better-sqlite3 Note ---
// This service uses 'better-sqlite3', which provides a synchronous API for SQLite.
// While generally very fast, be aware that long-running queries or slow disk I/O
// could potentially block the Node.js event loop in high-concurrency scenarios.
// For this application's intended use case (small team, local databases), this is
// usually acceptable. Timeouts are implemented in route handlers for longer operations.
// ---

/**
 * Initialize the application database
 */
function initializeDatabase() {
  try {
    // Ensure the data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create a file-based database
    const dbPath = path.join(dataDir, 'app_database.sqlite');
    db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : undefined });
    console.log(`Using SQLite database at: ${dbPath}`);
    
    // Enable foreign keys for data integrity
    db.pragma('foreign_keys = ON');
    
    // Create the tables if they don't exist
    createTablesIfNotExist();
    
    // Seed the database with default templates
    seedDefaultTemplates();
    
    return db;
  } catch (error) {
    console.error('Error initializing the application database:', error);
    
    // More specific error handling for better-sqlite3 issues
    if (error.code === 'ERR_DLOPEN_FAILED') {
      console.error('SQLite module failed to load. Try running "npm rebuild better-sqlite3"');
    }
    
    // If we're in production, try to gracefully degrade instead of crashing
    if (process.env.NODE_ENV === 'production') {
      console.warn('Attempting to continue without database functionality. Some features may be limited.');
      return null;
    }
    
    throw error;
  }
}

/**
 * Create required tables if they don't exist
 */
function createTablesIfNotExist() {
  // Create tables using better-sqlite3 API
  db.exec(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      size_bytes INTEGER,
      table_count INTEGER,
      is_valid BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS saved_visualizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      table_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insight_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      category TEXT,
      is_default BOOLEAN DEFAULT 0
    );
  `);
}

/**
 * Seed the database with default templates
 */
function seedDefaultTemplates() {
  // First check if any templates already exist
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM insight_templates').get();
  
  // If templates already exist, don't add defaults
  if (templateCount && templateCount.count > 0) {
    console.log('Templates already exist, skipping seed...');
    return;
  }
  
  // Define default templates
  const defaultTemplates = [
    {
      name: 'Top Selling Products',
      description: 'Visualizes your top selling products by revenue or quantity',
      type: 'bar',
      config: JSON.stringify({
        title: 'Top Selling Products',
        mappings: {
          x: 'product_name',
          y: 'revenue',
          sort: 'desc',
          limit: 10
        }
      }),
      category: 'sales',
      is_default: 1
    },
    {
      name: 'Monthly Sales Trend',
      description: 'Shows sales trends over monthly periods',
      type: 'line',
      config: JSON.stringify({
        title: 'Monthly Sales Trend',
        mappings: {
          x: 'month',
          y: 'revenue',
          groupBy: 'month'
        }
      }),
      category: 'sales',
      is_default: 1
    },
    {
      name: 'Customer Distribution',
      description: 'Breaks down customers by region or category',
      type: 'pie',
      config: JSON.stringify({
        title: 'Customer Distribution',
        mappings: {
          labels: 'region',
          values: 'customer_count'
        }
      }),
      category: 'customers',
      is_default: 1
    }
  ];
  
  // Use transaction for better performance and atomicity
  const insertStmt = db.prepare(`
    INSERT INTO insight_templates 
    (name, description, type, config, category, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Begin transaction
  const transaction = db.transaction(() => {
    for (const template of defaultTemplates) {
      insertStmt.run(
        template.name,
        template.description,
        template.type,
        template.config,
        template.category,
        template.is_default
      );
    }
  });
  
  // Execute transaction
  transaction();
  console.log(`Added ${defaultTemplates.length} default templates`);
}

/**
 * Get database connection
 */
function getDb() {
  if (!db) {
    try {
      return initializeDatabase();
    } catch (error) {
      console.error('Failed to initialize database on demand:', error);
      throw new Error('Database service is unavailable. Please restart the application.');
    }
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Helper for running parameterized queries
 */
function run(sql, params = []) {
  try {
    const dbInstance = getDb();
    if (!dbInstance) {
      throw new Error('Database is not initialized');
    }
    
    const stmt = dbInstance.prepare(sql);
    const result = stmt.run(...params);
    
    return {
      lastID: result.lastInsertRowid,
      changes: result.changes
    };
  } catch (error) {
    console.error(`SQL Error in run: ${sql}`, error);
    
    // Create a more descriptive error
    const enhancedError = new Error(`Database operation failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.sql = sql;
    enhancedError.params = params;
    
    throw enhancedError;
  }
}

/**
 * Helper for getting a single row
 */
function get(sql, params = []) {
  try {
    const dbInstance = getDb();
    if (!dbInstance) {
      throw new Error('Database is not initialized');
    }
    
    return dbInstance.prepare(sql).get(...params);
  } catch (error) {
    console.error(`SQL Error in get: ${sql}`, error);
    
    // Create a more descriptive error
    const enhancedError = new Error(`Database query failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.sql = sql;
    enhancedError.params = params;
    
    throw enhancedError;
  }
}

/**
 * Helper for getting all rows
 */
function all(sql, params = []) {
  try {
    const dbInstance = getDb();
    if (!dbInstance) {
      throw new Error('Database is not initialized');
    }
    
    return dbInstance.prepare(sql).all(...params);
  } catch (error) {
    console.error(`SQL Error in all: ${sql}`, error);
    
    // Create a more descriptive error
    const enhancedError = new Error(`Database query failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.sql = sql;
    enhancedError.params = params;
    
    throw enhancedError;
  }
}

// Note: Database initialization is now called explicitly in server/app.js during startup.
// initializeDatabase(); // Removed from here

module.exports = {
  initializeDatabase, // Export for explicit initialization
  initializeDatabase, // Export for explicit initialization
  getDb,
  closeDatabase,
  run,
  get,
  all
};
