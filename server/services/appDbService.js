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
  const dbPath = path.join(__dirname, '../../data/app.sqlite');
  
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create required tables if they don't exist
  createTablesIfNotExist();
  
  return db;
}

/**
 * Create the required tables if they don't exist
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
      is_valid INTEGER DEFAULT 1
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

  // Add default templates if the table is empty
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM insight_templates').get();
  
  if (templateCount.count === 0) {
    insertDefaultTemplates();
  }
}

/**
 * Insert default insight templates
 */
function insertDefaultTemplates() {
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
    },
    {
      name: 'Product Revenue by Store',
      description: 'Compare product revenue across different stores',
      type: 'bar',
      config: JSON.stringify({
        title: 'Product Revenue by Store',
        mappings: {
          x: 'store_name',
          y: 'total_revenue',
          groupBy: 'product_name'
        }
      }),
      category: 'sales',
      is_default: 1
    },
    {
      name: 'Quarterly Sales Comparison',
      description: 'Compare sales performance across quarters',
      type: 'line',
      config: JSON.stringify({
        title: 'Quarterly Sales Comparison',
        mappings: {
          x: 'quarter',
          y: 'total_revenue',
          groupBy: 'year'
        }
      }),
      category: 'sales',
      is_default: 1
    }
  ];

  const insertTemplate = db.prepare(`
    INSERT INTO insight_templates (name, description, type, config, category, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Insert all templates in a transaction
  const insertTemplates = db.transaction((templates) => {
    for (const template of templates) {
      insertTemplate.run(
        template.name,
        template.description,
        template.type,
        template.config,
        template.category,
        template.is_default
      );
    }
  });

  insertTemplates(defaultTemplates);
  console.log(`Added ${defaultTemplates.length} default templates`);
}

/**
 * Get database connection
 * @returns {Object} The database connection
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

module.exports = {
  getDb,
  closeDatabase,
  initializeDatabase
};
