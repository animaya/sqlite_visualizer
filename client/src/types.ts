/**
 * Type definitions for the SQLite Visualizer application
 */

// Database connection
export interface Connection {
  id: number;
  name: string;
  path: string;
  last_accessed: string;
  size_bytes?: number;
  table_count?: number;
  is_valid: boolean;
}

// Template for pre-configured visualizations
export interface Template {
  id: number;
  name: string;
  description: string;
  type: string;
  config: any;
  category: string;
  is_default: boolean;
}

// Saved visualization
export interface Visualization {
  id: number;
  connection_id: number | null;
  name: string;
  type: string;
  config: any;
  table_name: string | null;
  created_at: string;
  updated_at: string;
}

// Table info
export interface TableInfo {
  name: string;
  type?: string;
  rowCount?: number;
}

// Table schema
export interface TableSchema {
  columns: Column[];
}

// Table column
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  defaultValue?: string | null;
  isNumeric?: boolean;
  isText?: boolean;
  isDate?: boolean;
}

// Extended column info with more properties
export interface ColumnInfo extends Column {
  isNumeric: boolean;
  isText: boolean;
  isDate: boolean;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

// API error class
export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    // This is needed for proper instanceof checks in TypeScript with custom Error classes
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Chart data
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// Field mapping for charts
export interface FieldMapping {
  [key: string]: string;
}
