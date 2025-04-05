/**
 * API Service
 * 
 * Handles all API requests to the backend
 */
import { Connection, Visualization, Template, ApiError } from '../types';

import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL.replace('/api', '');

// Log server connection status
(async function checkServerAvailability() {
  try {
    const response = await fetch(`${API_URL}/api/connections`);
    console.log(`Server connection check: ${response.status === 200 ? 'SUCCESS' : 'FAILED'} (${response.status})`);
  } catch (error) {
    console.error(`Server connection check FAILED: ${error.message}`);
    console.log(`Failed connecting to: ${API_URL}/api/connections`);
  }
})();

console.log('API Service Initialized:', {
  environment: process.env.NODE_ENV,
  apiBaseUrl: API_URL
});

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}/api${endpoint}`;
  
  console.log(`Making API request to: ${url}`);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };
  
  // Log request details for debugging
  console.log(`API Request: ${config.method || 'GET'} ${url}`);
  if (config.body) {
    try {
      // Try to parse and log the request body if it's JSON
      const bodyObj = JSON.parse(config.body as string);
      console.log('Request body:', bodyObj);
    } catch (e) {
      // If it's not valid JSON, just log it as is
      console.log('Request body (raw):', config.body);
    }
  }
  
  try {
    // Make the fetch request
    const response = await fetch(url, config);
    console.log(`Received response from ${url} with status: ${response.status}`);
    
    // Try to parse the response as JSON
    let data;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        console.log('Response text:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          data = { message: text };
        }
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        console.warn('Received non-JSON response:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        data = { message: text };
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      throw new Error(`Failed to parse server response: ${parseError.message}`);
    }
    
    // Handle error responses
    if (!response.ok) {
      console.error('Server returned error status:', response.status, data);
      const errorMessage = data && data.message 
        ? data.message 
        : `API error: ${response.status} ${response.statusText}`;
      
      const error = new Error(errorMessage) as ApiError;
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    // Return successful response data
    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('Network error connecting to server:', error);
      const errorMsg = `Cannot connect to server at ${url}. Please check:
      1. Server is running (on port ${API_URL.split(':').pop()})
      2. Network connectivity
      3. CORS configuration`;
      
      throw new Error(errorMsg);
    }
    
    // Re-throw the error with enhanced context
    console.error('API request failed:', {
      url,
      method: config.method || 'GET',
      error: {
        name: error.name,
        message: error.message,
        status: error.status,
        data: error.data
      }
    });
    
    // If it's already an augmented API error, just rethrow it
    if (error.status) {
      throw error;
    }
    
    // Otherwise wrap in a more helpful error
    throw new Error(`API Error: ${error.message || 'Unknown error'}`);
  }
}

// Connection endpoints
export const connectionApi = {
  getAll: (): Promise<Connection[]> => 
    apiRequest<{data: Connection[]}>('/connections')
      .then(response => response.data),
  
  getById: (id: string | number): Promise<Connection> => 
    apiRequest<{data: Connection}>(`/connections/${id}`)
      .then(response => response.data),
  
  create: (connectionData: { name: string; path: string }): Promise<Connection> => 
    apiRequest<{data: Connection}>('/connections', {
      method: 'POST',
      body: JSON.stringify(connectionData),
    }).then(response => response.data),
  
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
      data: {
        size_bytes: number;
        table_count: number;
        is_valid: boolean;
        last_checked: string;
      }
    }>(`/connections/${id}/health`)
      .then(response => response.data),
};

// Table endpoints
export const tableApi = {
  getAll: (connectionId: string | number): Promise<{
    name: string;
    type: string;
  }[]> => 
    apiRequest<{
      data: {
        name: string;
        type: string;
      }[]
    }>(`/connections/${connectionId}/tables`)
      .then(response => response.data),
  
  getSchema: (connectionId: string | number, tableName: string): Promise<{
    columns: {
      name: string;
      type: string;
      nullable: boolean;
    }[];
  }> => 
    apiRequest<{
      data: {
        columns: {
          name: string;
          type: string;
          nullable: boolean;
        }[];
      }
    }>(`/connections/${connectionId}/tables/${tableName}/schema`)
      .then(response => response.data),
  
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
      data: {
        data: T[];
        count: number;
      }
    }>(`/connections/${connectionId}/tables/${tableName}/data/sample?limit=${limit}`)
      .then(response => response.data),
};

// Visualization endpoints
export const visualizationApi = {
  getAll: (): Promise<Visualization[]> => 
    apiRequest<{data: Visualization[]}>('/visualizations')
      .then(response => response.data),
  
  getById: (id: string | number): Promise<Visualization> => 
    apiRequest<{data: Visualization}>(`/visualizations/${id}`)
      .then(response => response.data),
  
  create: (visualizationData: Omit<Visualization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Visualization> => 
    apiRequest<{data: Visualization}>('/visualizations', {
      method: 'POST',
      body: JSON.stringify(visualizationData),
    }).then(response => response.data),
  
  update: (id: string | number, visualizationData: Partial<Omit<Visualization, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Visualization> => 
    apiRequest<{data: Visualization}>(`/visualizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(visualizationData),
    }).then(response => response.data),
  
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
    // Reuses tableApi.getSample for efficiency.
    // Note: This currently fetches all columns in the sample, not just mapped ones.
    // If specific field selection is needed for performance, tableApi.getSample would need enhancement.
    return tableApi.getSample<T>(connectionId, tableName, limit)
      .then(response => response.data)
      .catch(error => {
        console.error(`Error fetching sample data for visualization (table: ${tableName}):`, error);
        // Return empty array on error to allow UI to handle gracefully
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
    // Reuses tableApi.getData for efficiency.
    // Note: This currently fetches all columns, not just mapped ones.
    // If specific field selection is needed for performance, tableApi.getData would need enhancement
    // to accept a 'fields' parameter.
    const params: Record<string, any> = { limit, page: 1 };
    // Example: If tableApi.getData supported field selection:
    // const fields = Object.values(mappings).filter(Boolean);
    // if (fields.length > 0) {
    //   params.fields = fields.join(',');
    // }

    return tableApi.getData<T>(connectionId, tableName, params)
      .then(response => ({
        data: response.data,
        total: response.total
      }))
      .catch(error => {
        console.error(`Error fetching full data for visualization (table: ${tableName}):`, error);
        // Return empty data structure on error
        return {
          data: [] as T[],
          total: 0
        };
      });
  }
};

// Template endpoints
export const templateApi = {
  getAll: (filters?: Record<string, any>): Promise<Template[]> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiRequest<{data: Template[]}>(`/templates${queryString}`)
      .then(response => response.data);
  },
  
  getById: (id: string | number): Promise<Template> => 
    apiRequest<{data: Template}>(`/templates/${id}`)
      .then(response => response.data),
  
  getRequirements: (id: string | number): Promise<{
    requiredFields: {name: string, label: string}[];
    optionalFields: {name: string, label: string}[];
    templateInfo: {
      name: string;
      description?: string;
      type: string;
      category?: string;
    };
  }> => 
    apiRequest<{
      data: {
        requiredFields: {name: string, label: string}[];
        optionalFields: {name: string, label: string}[];
        templateInfo: {
          name: string;
          description?: string;
          type: string;
          category?: string;
        };
      }
    }>(`/templates/${id}/requirements`)
      .then(response => response.data),
  
  getCategories: (): Promise<string[]> => 
    apiRequest<{data: string[]}>('/templates/categories')
      .then(response => response.data),
  
  create: (templateData: Omit<Template, 'id'>): Promise<Template> => 
    apiRequest<{data: Template}>('/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    }).then(response => response.data),
  
  update: (id: string | number, templateData: Partial<Omit<Template, 'id'>>): Promise<Template> => 
    apiRequest<{data: Template}>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    }).then(response => response.data),
  
  delete: (id: string | number): Promise<void> => 
    apiRequest<void>(`/templates/${id}`, {
      method: 'DELETE',
    }),
  
  apply: (templateId: string | number, applicationData: {
    connectionId: number | string;
    tableNames: string | string[];
    mappings: Record<string, string>;
  }): Promise<{
    data: any;
    config: Record<string, any>;
    type: string;
  }> => 
    apiRequest<{
      data: {
        data: any;
        config: Record<string, any>;
        type: string;
      }
    }>(`/templates/${templateId}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    }).then(response => response.data),
};

// Export endpoints
export const exportApi = {
  getSupportedFormats: (): Promise<{
    id: string;
    name: string;
    extension: string;
    mimeType: string;
  }[]> => 
    apiRequest<{
      data: {
        id: string;
        name: string;
        extension: string;
        mimeType: string;
      }[]
    }>('/export/formats')
      .then(response => response.data),
  
  exportVisualization: (visualizationId: string | number, format: string = 'csv'): string => 
    `${API_URL}/api/export/${format}/${visualizationId}`,
  
  exportTable: (
    connectionId: string | number, 
    tableName: string, 
    options: { 
      format?: string;
      limit?: number;
      filter?: Record<string, any>;
      sort?: { column: string; direction: 'asc' | 'desc' };
      includeSchema?: boolean;
    } = {}
  ): string => {
    const { format = 'csv', limit, filter, sort, includeSchema } = options;
    
    // Build base URL
    let url = `${API_URL}/api/export/${format}/table/${connectionId}/${tableName}`;
    
    // Add query parameters
    const params = new URLSearchParams();
    
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    if (filter && Object.keys(filter).length > 0) {
      params.append('filter', JSON.stringify(filter));
    }
    
    if (sort && sort.column) {
      params.append('sort', JSON.stringify(sort));
    }
    
    if (format === 'json' && includeSchema !== undefined) {
      params.append('includeSchema', includeSchema.toString());
    }
    
    // Append query parameters if any
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  }
};

// Test server connection
export const testServerConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data?.status === 'ok';
  } catch (error) {
    console.error('Server connection test failed:', error);
    return false;
  }
};

export default {
  connectionApi,
  tableApi,
  visualizationApi,
  templateApi,
  exportApi,
  testServerConnection,
};
