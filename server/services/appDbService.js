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
  // TODO: Implement database initialization
  const dbPath = path.join(__dirname, '../../data/app.sqlite');
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  
  // TODO: Create required tables if they don't exist
  return db;
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
