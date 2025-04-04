/**
 * Database Setup Script
 * 
 * Creates and initializes the application database with required tables
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const dbDir = path.join(__dirname, '../data');
const dbPath = path.join(dbDir, 'app.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`Creating data directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to database
console.log(`Setting up database at: ${dbPath}`);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
console.log('Creating tables...');

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

// Add default templates
console.log('Adding default insight templates...');

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

// Insert default templates
const insertTemplate = db.prepare(`
  INSERT INTO insight_templates (name, description, type, config, category, is_default)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Use a transaction to insert multiple templates
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

// Check if templates already exist
const templateCount = db.prepare('SELECT COUNT(*) as count FROM insight_templates').get();

if (templateCount.count === 0) {
  insertTemplates(defaultTemplates);
  console.log(`Added ${defaultTemplates.length} default templates`);
} else {
  console.log(`Templates already exist, skipping...`);
}

console.log('Database setup complete!');

// Close the database connection
db.close();
