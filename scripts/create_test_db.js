/**
 * Create Test SQLite Database Script
 * 
 * This script creates a test SQLite database with sample sales data
 * for use with the SQLite Visualizer application.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path
const dbDir = path.join(__dirname, '../data');
const dbPath = path.join(dbDir, 'sales_db.sqlite');

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

// Stores table
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    opened_date DATE NOT NULL
  );
`);

// Products table
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    introduced_date DATE NOT NULL
  );
`);

// Sales table
db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_revenue DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`);

// Insert sample data
console.log('Inserting sample data...');

// Add stores
const insertStore = db.prepare(`
  INSERT INTO stores (name, location, opened_date)
  VALUES (?, ?, ?)
`);

const stores = [
  { name: 'Downtown Store', location: 'New York', openedDate: '2019-01-15' },
  { name: 'West Mall', location: 'Los Angeles', openedDate: '2018-03-21' },
  { name: 'East End', location: 'Chicago', openedDate: '2020-05-10' },
  { name: 'North Plaza', location: 'Miami', openedDate: '2017-11-30' },
  { name: 'South Center', location: 'Houston', openedDate: '2019-09-05' }
];

stores.forEach(store => {
  insertStore.run(store.name, store.location, store.openedDate);
});

// Add products
const insertProduct = db.prepare(`
  INSERT INTO products (name, model, price, introduced_date)
  VALUES (?, ?, ?, ?)
`);

const products = [
  { name: 'Basic Blender', model: 'BB-100', price: 49.99, introducedDate: '2019-01-01' },
  { name: 'Deluxe Blender', model: 'DB-200', price: 89.99, introducedDate: '2019-03-15' },
  { name: 'Professional Blender', model: 'PB-300', price: 149.99, introducedDate: '2020-02-28' },
  { name: 'Smart Blender', model: 'SB-400', price: 199.99, introducedDate: '2021-01-10' },
  { name: 'Ultra Blender', model: 'UB-500', price: 249.99, introducedDate: '2022-05-20' }
];

products.forEach(product => {
  insertProduct.run(product.name, product.model, product.price, product.introducedDate);
});

// Generate quarterly sales data for each product at each store (3 years worth)
const insertSale = db.prepare(`
  INSERT INTO sales (store_id, product_id, year, quarter, quantity, total_revenue)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Use a transaction for bulk insert
const insertSalesTransaction = db.transaction(() => {
  // For each store
  for (let storeId = 1; storeId <= 5; storeId++) {
    // For each product
    for (let productId = 1; productId <= 5; productId++) {
      // For years 2021-2023
      for (let year = 2021; year <= 2023; year++) {
        // For each quarter
        for (let quarter = 1; quarter <= 4; quarter++) {
          // Generate random sales data
          const baseQuantity = Math.floor(Math.random() * 50) + 10; // 10-60 units
          
          // Add some trends and variability:
          // - Higher-end models sell less but have higher revenue
          // - Sales generally increase over time (with some randomness)
          // - Q4 typically has higher sales (holiday season)
          const modelFactor = 1 - ((productId - 1) * 0.1); // Higher models sell fewer units
          const yearFactor = 1 + ((year - 2021) * 0.2); // Sales increase year over year
          const quarterFactor = (quarter === 4) ? 1.3 : 1.0; // Q4 boost
          
          const quantity = Math.floor(baseQuantity * modelFactor * yearFactor * quarterFactor);
          
          // Get product price from the products array
          const price = products[productId - 1].price;
          const totalRevenue = parseFloat((quantity * price).toFixed(2));
          
          // Insert the sale record
          insertSale.run(storeId, productId, year, quarter, quantity, totalRevenue);
        }
      }
    }
  }
});

// Execute the transaction
insertSalesTransaction();

// Verify data was inserted
const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get();
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales').get();

console.log(`Inserted ${storeCount.count} stores`);
console.log(`Inserted ${productCount.count} products`);
console.log(`Inserted ${salesCount.count} sales records`);

// Create some useful views
console.log('Creating views...');

// Quarterly sales by product
db.exec(`
  CREATE VIEW IF NOT EXISTS quarterly_sales_by_product AS
  SELECT
    p.id as product_id,
    p.name as product_name,
    p.model as product_model,
    s.year,
    s.quarter,
    SUM(s.quantity) as total_quantity,
    SUM(s.total_revenue) as total_revenue
  FROM
    sales s
    JOIN products p ON s.product_id = p.id
  GROUP BY
    p.id, s.year, s.quarter
  ORDER BY
    p.id, s.year, s.quarter;
`);

// Quarterly sales by store
db.exec(`
  CREATE VIEW IF NOT EXISTS quarterly_sales_by_store AS
  SELECT
    st.id as store_id,
    st.name as store_name,
    st.location as store_location,
    s.year,
    s.quarter,
    SUM(s.quantity) as total_quantity,
    SUM(s.total_revenue) as total_revenue
  FROM
    sales s
    JOIN stores st ON s.store_id = st.id
  GROUP BY
    st.id, s.year, s.quarter
  ORDER BY
    st.id, s.year, s.quarter;
`);

// Product performance by store
db.exec(`
  CREATE VIEW IF NOT EXISTS product_performance_by_store AS
  SELECT
    st.id as store_id,
    st.name as store_name,
    p.id as product_id,
    p.name as product_name,
    p.model as product_model,
    SUM(s.quantity) as total_quantity,
    SUM(s.total_revenue) as total_revenue,
    SUM(s.total_revenue) / SUM(s.quantity) as average_unit_revenue
  FROM
    sales s
    JOIN stores st ON s.store_id = st.id
    JOIN products p ON s.product_id = p.id
  GROUP BY
    st.id, p.id
  ORDER BY
    st.id, total_revenue DESC;
`);

console.log('Database setup complete!');

// Close the database connection
db.close();