# SQLite Visualizer Technical Design Document

## 1. Introduction

### 1.1 Purpose
This Technical Design Document (TDD) provides detailed specifications for the SQLite Visualizer application as currently implemented. It serves as a comprehensive guide for the development team to maintain and extend the application according to the established architecture and design patterns.

### 1.2 Scope
The SQLite Visualizer is a web-based application designed to provide visual representation of SQLite database content through tabular views and charts. It is designed for a small team of 5 professionals to analyze SQLite database data without requiring SQL knowledge. The application enables data exploration, visualization, and export capabilities in a user-friendly interface.

### 1.3 Definitions, Acronyms, and Abbreviations
- **UI**: User Interface
- **API**: Application Programming Interface
- **DB**: Database
- **CSV**: Comma-Separated Values
- **KPI**: Key Performance Indicator

## 2. System Architecture

### 2.1 High-Level Architecture
The application follows a client-server architecture:
- **Client**: React-based interface built with TypeScript, Tailwind CSS, and Chart.js
- **Server**: Node.js backend service that communicates with SQLite databases
- **Database**: Two types of SQLite databases:
  - Target databases (read-only access for visualization)
  - Application database (for storing configurations and saved visualizations)

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │  Target SQLite  │
│  Web Browser    │<────>│  Node.js Server │<────>│  Databases      │
│  (React Client) │      │  (Express)      │      │  (Read-only)    │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  App SQLite DB  │
                         │  (Config & viz) │
                         └─────────────────┘
```

### 2.2 Component Architecture

#### 2.2.1 Frontend Components
The frontend is organized into the following major component categories:

1. **Connection Management**
   - `ConnectionForm`: Handles creation of new database connections
   - `ConnectionList`: Displays and manages existing connections

2. **Table Viewing**
   - `TableSelector`: Allows selection of tables from connected databases
   - `DataTable`: Displays table data with sorting, filtering, and pagination

3. **Visualization Building**
   - `ChartTypeSelector`: UI for selecting visualization types
   - `FieldMapper`: Maps database fields to chart dimensions
   - `ChartRenderer`: Renders different chart types using Chart.js
   - `ChartPreview`: Provides a preview of the configured visualization

4. **Template Management**
   - `TemplateList`: Displays available insight templates
   - `TemplateCard`: Presents individual template information
   - `TemplateConfigurator`: Configures templates for specific databases
   - `TemplateFieldMapper`: Maps template fields to database columns

5. **Common Components**
   - `Sidebar`: Main navigation component
   - `ExportButton`: Handles data export functionality

#### 2.2.2 Backend Components
The backend is organized into the following service modules:

1. **Connection Service**
   - Establishes and manages SQLite database connections
   - Validates connection parameters
   - Provides database metadata and health checks

2. **Database Service**
   - Executes read-only queries against target databases
   - Formats query results for frontend consumption
   - Implements pagination and data sampling

3. **Visualization Service**
   - Processes data for chart generation
   - Manages saved visualization configurations
   - Provides data transformation utilities

4. **Template Service**
   - Manages insight templates
   - Provides template application logic
   - Handles template field mapping suggestions

5. **Export Service**
   - Formats data for CSV export
   - Handles file generation and delivery

## 3. Detailed Technical Specifications

### 3.1 Frontend Technologies

#### 3.1.1 Core Framework
**Technology**: React with TypeScript
**Implementation**: The application uses React 18 with TypeScript for type safety. Component files use the `.tsx` extension.

#### 3.1.2 UI Framework
**Technology**: Tailwind CSS
**Implementation**: The application uses Tailwind CSS for styling, following the design system defined in the style guide. The implementation maintains consistent spacing, colors, and typography across all components.

#### 3.1.3 State Management
**Technology**: React Hooks and fetch API
**Implementation**: The application uses React's built-in useState and useEffect hooks for state management, along with the fetch API for data retrieval from the backend.

#### 3.1.4 Visualization Libraries
**Technology**: Chart.js with react-chartjs-2
**Implementation**: The application uses Chart.js through the react-chartjs-2 wrapper to create various chart types. Chart configurations follow the styling guidelines defined in the style guide.

#### 3.1.5 Routing
**Technology**: React Router
**Implementation**: The application uses React Router for client-side routing, allowing for navigation between different views while maintaining application state.

### 3.2 Backend Technologies

#### 3.2.1 Runtime Environment
**Technology**: Node.js
**Implementation**: The server runs on Node.js, providing a JavaScript runtime for server-side code.

#### 3.2.2 Web Framework
**Technology**: Express.js
**Implementation**: The backend uses Express.js to create a RESTful API, with route handlers organized by resource type.

#### 3.2.3 Database Access
**Technology**: better-sqlite3
**Implementation**: The application uses the better-sqlite3 module for high-performance SQLite database access, with prepared statements for security and performance.

#### 3.2.4 Middleware
**Technologies**: cors, helmet, morgan, custom middleware
**Implementation**: The Express application uses:
- cors: For Cross-Origin Resource Sharing
- helmet: For security headers
- morgan: For request logging
- Custom middleware for error handling and request validation

### 3.3 Database Schema

#### 3.3.1 Application Database
The application uses a SQLite database with the following schema:

```sql
-- Database Connections Table
CREATE TABLE connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    size_bytes INTEGER,
    table_count INTEGER,
    is_valid BOOLEAN DEFAULT 1
);

-- Saved Visualizations Table
CREATE TABLE saved_visualizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'bar', 'pie', 'line', etc.
    config TEXT NOT NULL,  -- JSON configuration
    table_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
);

-- Insight Templates Table
CREATE TABLE insight_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,  -- 'bar', 'pie', 'line', etc.
    config TEXT NOT NULL,  -- JSON configuration template
    category TEXT,  -- e.g., 'sales', 'performance', etc.
    is_default BOOLEAN DEFAULT 0
);
```

### 3.4 API Endpoints

The application implements a comprehensive RESTful API:

#### 3.4.1 Connection Management
- `GET /api/connections` - List all saved connections
- `POST /api/connections` - Create a new connection
- `GET /api/connections/:id` - Get connection details
- `DELETE /api/connections/:id` - Remove a connection
- `GET /api/connections/:id/health` - Check database health/size

#### 3.4.2 Database Exploration
- `GET /api/connections/:id/tables` - List all tables in the database
- `GET /api/connections/:id/tables/:table/schema` - Get table schema
- `GET /api/connections/:id/tables/:table/data` - Get table data (with pagination)
- `GET /api/connections/:id/tables/:table/data/sample` - Get a sample of table data

#### 3.4.3 Visualization Management
- `POST /api/visualizations` - Create a new visualization
- `GET /api/visualizations` - List all saved visualizations
- `GET /api/visualizations/:id` - Get visualization details
- `PUT /api/visualizations/:id` - Update a visualization
- `DELETE /api/visualizations/:id` - Delete a visualization
- `GET /api/templates` - List all insight templates
- `GET /api/templates/:id` - Get template details
- `POST /api/templates/:id/apply` - Apply template to selected data

#### 3.4.4 Export Functionality
- `GET /api/export/csv/:vizId` - Export visualization as CSV
- `GET /api/export/csv/table/:connectionId/:tableName` - Export table as CSV

### 3.5 Data Flow Diagrams

#### 3.5.1 Database Connection Flow
```
User → Input Connection Details → Backend Validates → Check DB Size/Health → 
Connect to DB → Save Connection to App DB → Return Connection Details
```

#### 3.5.2 Visualization Creation Flow
```
User → Select Table → Choose Data Fields → Select Chart Type → 
Configure Chart Options → Backend Processes Data → 
Generate Visualization → Optional: Save Configuration → Render Chart
```

#### 3.5.3 Template Application Flow
```
User → Select Template → Backend Analyzes DB Structure → 
Suggest Field Mappings → User Confirms/Adjusts Mappings → 
Backend Processes Data → Generate Visualization → Render Chart
```

## 4. Implementation Details

### 4.1 Frontend Implementation

#### 4.1.1 Component Structure
The frontend follows a component-based architecture as follows:

```
src/
├── components/
│   ├── common/
│   │   ├── ExportButton.tsx
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── connection/
│   │   ├── ConnectionForm.tsx
│   │   ├── ConnectionList.tsx
│   │   └── ...
│   ├── table/
│   │   ├── DataTable.tsx
│   │   ├── TableSelector.tsx
│   │   └── ...
│   ├── visualization/
│   │   ├── ChartRenderer.tsx
│   │   ├── ChartTypeSelector.tsx
│   │   ├── FieldMapper.tsx
│   │   ├── ChartPreview.tsx
│   │   └── ...
│   └── templates/
│       ├── TemplateList.tsx
│       ├── TemplateCard.tsx
│       ├── TemplateConfigurator.tsx
│       ├── TemplateFieldMapper.tsx
│       └── ...
├── layouts/
│   └── MainLayout.tsx
├── pages/
│   ├── Connections.tsx
│   ├── TableViewer.tsx
│   ├── VisualizationBuilder.tsx
│   ├── SavedVisualizations.tsx
│   ├── Templates.tsx
│   ├── TemplateApplication.tsx
│   └── NotFound.tsx
├── services/
│   └── api.ts
├── types/
│   └── index.ts
├── config.ts
├── App.tsx
└── main.tsx
```

#### 4.1.2 State Management
The application uses a combination of:
- **React useState/useEffect**: For local component state and side effects
- **URL Parameters**: For shareable visualization states
- **Fetch API**: For data fetching from the backend

#### 4.1.3 Routing Structure
The application implements the following routes:

```
/                         → Home/Connections page
/connections              → Connection management
/tables/:connectionId     → Table explorer for a specific connection
/visualize/:connectionId  → Visualization builder for a specific connection
/visualizations           → Saved visualizations gallery
/templates                → Insight templates list
/templates/:templateId    → Template application page
```

### 4.2 Backend Implementation

#### 4.2.1 Directory Structure
The backend follows a modular structure as follows:

```
server/
├── routes/
│   ├── connections.js      → Connection endpoints
│   ├── tables.js           → Table and data endpoints
│   ├── visualizations.js   → Visualization endpoints
│   ├── templates.js        → Template endpoints
│   └── export.js           → Export functionality
├── services/
│   ├── appDbService.js     → Application database service
│   ├── connectionService.js → Connection management
│   ├── databaseService.js  → Database querying
│   ├── visualizationService.js → Visualization processing
│   ├── templateService.js  → Template management
│   └── exportService.js    → Export functionality
├── models/
│   ├── connection.js       → Connection data model
│   ├── visualization.js    → Visualization data model
│   └── template.js         → Template data model
├── middleware/
│   ├── errorHandler.js     → Error handling middleware
│   └── dataValidator.js    → Request validation
├── utils/
│   ├── dbUtils.js          → Database utilities
│   ├── queryBuilder.js     → SQL query construction
│   └── responseFormatter.js → Response formatting
└── app.js                  → Main application entry point
```

#### 4.2.2 Database Connection Handling
The backend implements the following for database connections:
- SQLite connection management using better-sqlite3
- Connection validation and health checking
- Table schema introspection through SQLite's information_schema queries
- Read-only query execution with prepared statements
- Connection pooling for efficient resource usage

#### 4.2.3 Data Processing
The backend implements the following data processing capabilities:
- Pagination with limit and offset for large datasets
- Data sampling for visualization previews
- Data transformation for various chart types
- Automatic field type detection for visualization suggestions
- Template field mapping with intelligent suggestions

### 4.3 Security Implementation

#### 4.3.1 Input Validation
The application implements the following security measures for input validation:
- Request validation using Joi schema validation
- Parameter sanitization before use in database queries
- Path validation for database file access to prevent directory traversal

#### 4.3.2 Query Safety
The application implements the following for query safety:
- Parameterized queries using better-sqlite3's prepared statements
- Read-only database access enforcement
- Query timeout limits for long-running operations

#### 4.3.3 Error Handling
The application implements comprehensive error handling:
- Custom error handling middleware
- Appropriate HTTP status codes for different error types
- Sanitized error messages to avoid exposing system details
- Structured error responses

## 5. Performance Optimizations

### 5.1 Database Query Optimization
The application implements the following database optimizations:
- Efficient SQLite connections with better-sqlite3
- Prepared statements for query performance
- Pagination for large datasets
- Selective column fetching
- Data sampling for visualization previews

### 5.2 Frontend Optimization
The application implements the following frontend optimizations:
- React component optimization with proper dependency management
- Lazy loading of chart components
- Efficient re-rendering with proper React patterns
- Optimized Chart.js configurations

## 6. Deployment Configuration

### 6.1 Development Environment
The application includes the following for development:
- Concurrent server and client development with hot reloading
- Development-specific logging
- Environment variable configuration
- Source maps for debugging

```bash
# Start development server with concurrent client and server
npm run dev
```

### 6.2 Production Environment
The application includes the following for production:
- Built React assets served by Express
- Optimized asset bundling
- Production-appropriate error handling
- Process management

```bash
# Build production assets
npm run build

# Start production server
npm start
```

## 7. Future Technical Considerations

### 7.1 Potential Extensions
The following features could be considered for future development:
- Support for additional database types beyond SQLite
- Advanced visualization types (heatmaps, treemaps, etc.)
- Query builder interface for advanced users
- Data modification capabilities with proper validation
- User authentication and access controls

### 7.2 Scalability Considerations
For future scaling, the following could be implemented:
- Separate application and visualization databases
- More robust caching strategies
- Connection pooling optimizations
- Support for remote database connections with proper security

## 8. Appendices

### 8.1 Technology Stack Reference
- **Node.js**: https://nodejs.org/
- **Express.js**: https://expressjs.com/
- **SQLite**: https://www.sqlite.org/
- **better-sqlite3**: https://github.com/JoshuaWise/better-sqlite3
- **React**: https://reactjs.org/
- **TypeScript**: https://www.typescriptlang.org/
- **Tailwind CSS**: https://tailwindcss.com/
- **Chart.js**: https://www.chartjs.org/
- **React Router**: https://reactrouter.com/

### 8.2 Coding Standards
The application follows these coding standards:
- TypeScript for type safety in the frontend
- ESM modules for imports/exports
- Component naming: PascalCase
- Function naming: camelCase
- CSS classes: Tailwind utility classes
- File naming: Component files match component names
- RESTful API endpoints

This Technical Design Document reflects the current state of the SQLite Visualizer application as implemented. It serves as a reference guide for maintenance and future development.
