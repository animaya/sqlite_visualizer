/**
 * Application Database Service
 * 
 * Handles operations on the application's own SQLite database
 * which stores connections, saved visualizations, and templates
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initialize the application database
 */
function initializeDatabase() {
  try {
    // Define the database path
    const dbPath = path.join(__dirname, '../../data/app.sqlite');
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Create or open the database with extended configuration
    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
      fileMustExist: false
    });
    
    // Enable foreign keys for data integrity
    db.pragma('foreign_keys = ON');
    
    // Set busy timeout to prevent "database is locked" errors
    db.pragma('busy_timeout = 5000');
    
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
  // Connections table
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
  `);

  // Saved visualizations table
  db.exec(`
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
  db.exec(`
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
    db.close();
    db = null;
  }
}

// Initialize database on module load
initializeDatabase();

module.exports = {
  getDb,
  closeDatabase
};