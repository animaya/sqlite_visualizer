// Connection Types
export interface Connection {
  id: string | number;
  name: string;
  path: string;
  last_accessed?: string;
  size_bytes?: number;
  table_count?: number;
  is_valid?: boolean;
}

// Table Types
export interface TableInfo {
  name: string;
  rowCount?: number;
  hasTimestamp?: boolean;
}

// Column Types
export interface ColumnInfo {
  name: string;
  type: string;
  isNumeric?: boolean;
  isText?: boolean;
  isDate?: boolean;
}

// Table Schema
export interface TableSchema {
  columns: ColumnInfo[];
}

// Table Data Types
export interface TableDataResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Visualization Types
export interface Visualization {
  id: string | number;
  name: string;
  type: string;
  connectionId: string | number;
  tableName: string;
  config: any;
  createdAt?: string;
  updatedAt?: string;
}

// Template Types
export interface Template {
  id: string | number;
  name: string;
  description?: string;
  type: string;
  category?: string;
  config: any;
  isDefault?: boolean;
}

// Field Mapping Types
export interface FieldMapping {
  [key: string]: string;
}

// Chart Data
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: any[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}
