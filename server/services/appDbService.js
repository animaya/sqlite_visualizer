/**
 * Application Database Service
 * 
 * Handles operations on the application's own SQLite database
 * which stores connections, saved visualizations, and templates
 */

const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initialize the application database
 */
function initializeDatabase() {
  try {
    // Use SQLite with in-process memory as a workaround
    // for better-sqlite3 compatibility issues with Node.js v23+
    const sqlite3 = require('sqlite3').verbose();
    
    // Create an in-memory database
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error creating in-memory SQLite database:', err);
        throw err;
      }
      console.log('Using in-memory SQLite database');
    });
    
    // Enable foreign keys for data integrity
    db.run('PRAGMA foreign_keys = ON');
    
    // Create the tables if they don't exist
    createTablesIfNotExist();
    
    // Seed the database with default templates
    seedDefaultTemplates();
    
    return db;
  } catch (error) {
    console.error('Error initializing the application database:', error);
    throw error;
  }
}

/**
 * Create required tables if they don't exist
 */
function createTablesIfNotExist() {
  // Using run for each statement for better error handling
  db.serialize(() => {
    // Connections table
    db.run(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        size_bytes INTEGER,
        table_count INTEGER,
        is_valid BOOLEAN DEFAULT 1
      );
    `);

    // Saved visualizations table
    db.run(`
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
    `);

    // Insight templates table
    db.run(`
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
  });
}

/**
 * Seed the database with default templates
 */
function seedDefaultTemplates() {
  // First check if any templates already exist
  db.get('SELECT COUNT(*) as count FROM insight_templates', [], (err, row) => {
    if (err) {
      console.error('Error checking for existing templates:', err);
      return;
    }
    
    // If templates already exist, don't add defaults
    if (row.count > 0) {
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
    
    // Insert each template
    const insertStmt = `
      INSERT INTO insight_templates 
      (name, description, type, config, category, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    // Use serialize to ensure all inserts complete in order
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      const stmt = db.prepare(insertStmt);
      
      defaultTemplates.forEach(template => {
        stmt.run(
          template.name,
          template.description,
          template.type,
          template.config,
          template.category,
          template.is_default
        );
      });
      
      stmt.finalize();
      
      db.run('COMMIT', [], (err) => {
        if (err) {
          console.error('Error committing template transaction:', err);
        } else {
          console.log(`Added ${defaultTemplates.length} default templates`);
        }
      });
    });
  });
}

/**
 * Get database connection
 */
function getDb() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      }
    });
    db = null;
  }
}

/**
 * Helper for running parameterized queries with promises
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Helper for getting a single row with promises
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Helper for getting all rows with promises
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize database on module load
initializeDatabase();

module.exports = {
  getDb,
  closeDatabase,
  run,
  get,
  all
};
