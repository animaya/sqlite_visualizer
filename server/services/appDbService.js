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