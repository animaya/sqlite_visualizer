/**
 * API Service
 * 
 * Handles all API requests to the backend
 */

// TypeScript interfaces
interface Connection {
  id: number;
  name: string;
  path: string;
  last_accessed: string;
  size_bytes?: number;
  table_count?: number;
  is_valid: boolean;
}

interface ApiError extends Error {
  status?: number;
}

// Base URL for API requests
const API_URL = process.env.NODE_ENV === 'production' 
  ? '' // Same domain in production
  : ''; // Empty string means it will use relative URLs, working with Vite proxy

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.message || 'An error occurred') as ApiError;
      error.status = response.status;
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Connection endpoints
export const connectionApi = {
  getAll: (): Promise<Connection[]> => 
    apiRequest<Connection[]>('/connections'),
  
  getById: (id: string | number): Promise<Connection> => 
    apiRequest<Connection>(`/connections/${id}`),
  
  create: (connectionData: { name: string; path: string }): Promise<Connection> => 
    apiRequest<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(connectionData),
    }),
  
  delete: (id: string | number): Promise<void> => 
    apiRequest<void>(`/connections/${id}`, {
      method: 'DELETE',
    }),
  
  checkHealth: (id: string | number): Promise<{
    size_bytes: number;
    table_count: number;
    is_valid: boolean;
    last_checked: string;
  }> => 
    apiRequest<{
      size_bytes: number;
      table_count: number;
      is_valid: boolean;
      last_checked: string;
    }>(`/connections/${id}/health`),
};

// Table endpoints
export const tableApi = {
  getAll: (connectionId: string | number): Promise<{
    name: string;
    type: string;
  }[]> => 
    apiRequest<{
      name: string;
      type: string;
    }[]>(`/connections/${connectionId}/tables`),
  
  getSchema: (connectionId: string | number, tableName: string): Promise<{
    columns: {
      name: string;
      type: string;
      nullable: boolean;
    }[];
  }> => 
    apiRequest<{
      columns: {
        name: string;
        type: string;
        nullable: boolean;
      }[];
    }>(`/connections/${connectionId}/tables/${tableName}/schema`),
  
  getData: <T>(connectionId: string | number, tableName: string, params: Record<string, any> = {}): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    return apiRequest<{
      data: T[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/connections/${connectionId}/tables/${tableName}/data?${queryParams}`);
  },
  
  getSample: <T>(connectionId: string | number, tableName: string, limit = 10): Promise<{
    data: T[];
    count: number;
  }> => 
    apiRequest<{
      data: T[];
      count: number;
    }>(`/connections/${connectionId}/tables/${tableName}/data/sample?limit=${limit}`),
};

// Visualization endpoints
interface Visualization {
  id: number;
  connection_id: number;
  name: string;
  type: string;
  config: string;
  table_name: string;
  created_at: string;
  updated_at: string;
}

export const visualizationApi = {
  getAll: (): Promise<Visualization[]> => 
    apiRequest<Visualization[]>('/visualizations'),
  
  getById: (id: string | number): Promise<Visualization> => 
    apiRequest<Visualization>(`/visualizations/${id}`),
  
  create: (visualizationData: Omit<Visualization, 'id' | 'created_at' | 'updated_at'>): Promise<Visualization> => 
    apiRequest<Visualization>('/visualizations', {
      method: 'POST',
      body: JSON.stringify(visualizationData),
    }),
  
  update: (id: string | number, visualizationData: Partial<Omit<Visualization, 'id' | 'created_at' | 'updated_at'>>): Promise<Visualization> => 
    apiRequest<Visualization>(`/visualizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(visualizationData),
    }),
  
  delete: (id: string | number): Promise<void> => 
    apiRequest<void>(`/visualizations/${id}`, {
      method: 'DELETE',
    }),
    
  /**
   * Get sample data for a visualization preview
   * @param connectionId - Database connection ID
   * @param tableName - Table name
   * @param mappings - Field mappings
   * @param limit - Max number of records to return (default: 20)
   */
  getSampleData: <T>(connectionId: string | number, tableName: string, mappings: Record<string, string>, limit: number = 20): Promise<T[]> => {
    // Create query params for field selection
    const fields = Object.values(mappings).filter(Boolean);
    
    // Define fields if they exist
    const params: Record<string, any> = { limit };
    if (fields.length > 0) {
      params.fields = fields.join(',');
    }
    
    return tableApi.getSample<T>(connectionId, tableName, limit)
      .then(response => response.data)
      .catch(error => {
        console.error('Error fetching sample data:', error);
        // Return empty array on error to prevent UI from breaking
        return [] as T[];
      });
  },
  
  /**
   * Get full data for a visualization
   * @param connectionId - Database connection ID
   * @param tableName - Table name
   * @param mappings - Field mappings
   * @param limit - Max number of records to return (default: 500)
   */
  getFullData: <T>(connectionId: string | number, tableName: string, mappings: Record<string, string>, limit: number = 500): Promise<{
    data: T[];
    total: number;
  }> => {
    // Create query params for field selection and pagination
    const fields = Object.values(mappings).filter(Boolean);
    
    // Define query parameters
    const params: Record<string, any> = { limit, page: 1 };
    if (fields.length > 0) {
      params.fields = fields.join(',');
    }
    
    return tableApi.getData<T>(connectionId, tableName, params)
      .then(response => ({
        data: response.data,
        total: response.total
      }))
      .catch(error => {
        console.error('Error fetching full data:', error);
        // Return empty data on error to prevent UI from breaking
        return {
          data: [] as T[],
          total: 0
        };
      });
  }
};

// Template endpoints
interface Template {
  id: number;
  name: string;
  description: string;
  type: string;
  config: string;
  category: string;
  is_default: boolean;
}

export const templateApi = {
  getAll: (): Promise<Template[]> => 
    apiRequest<Template[]>('/templates'),
  
  getById: (id: string | number): Promise<Template> => 
    apiRequest<Template>(`/templates/${id}`),
  
  apply: (templateId: string | number, applicationData: {
    connectionId: number;
    tableNames: string[];
    mappings: Record<string, string>;
  }): Promise<{
    data: any[];
    config: Record<string, any>;
    type: string;
  }> => 
    apiRequest<{
      data: any[];
      config: Record<string, any>;
      type: string;
    }>(`/templates/${templateId}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    }),
};

// Export endpoints
export const exportApi = {
  exportVisualization: (visualizationId: string | number): string => 
    `${API_URL}/api/export/csv/${visualizationId}`,
  
  exportTable: (connectionId: string | number, tableName: string): string => 
    `${API_URL}/api/export/csv/table/${connectionId}/${tableName}`,
};

export default {
  connectionApi,
  tableApi,
  visualizationApi,
  templateApi,
  exportApi,
};
