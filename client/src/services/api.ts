/**
 * API Service
 * 
 * Handles all API requests to the backend
 */
import { Connection, Visualization, Template, ApiError } from '../types';

// Detect server port from environment or fallback to default
const getServerPort = () => {
  // In development, read from window.location if available
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    
    // If running in standard Vite dev mode, server is at 8765 by default
    if (url.port === '5173' || url.port === '5174') {
      return 8765;
    }
    
    // If running in a different development setup, try to calculate the server port
    const clientPort = parseInt(url.port);
    if (!isNaN(clientPort) && clientPort > 1000) {
      return clientPort - 1000 + 8765; 
    }
  }
  
  // Default fallback ports
  return 8765; // primary default
};

// Base URL for API requests
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Same domain in production
  }
  
  // For development
  const serverPort = getServerPort();
  console.log(`Using server port: ${serverPort} for API requests`);
  return `http://localhost:${serverPort}`;
};

const API_URL = getApiUrl();

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
    try {
      // Create query params for field selection
      const fields = Object.values(mappings).filter(Boolean);
      
      // Define fields if they exist
      const params: Record<string, any> = { limit };
      if (fields.length > 0) {
        params.fields = fields.join(',');
      }
      
      // Use a simpler approach - just get sample data and return empty array on error
      return tableApi.getSample<T>(connectionId, tableName, limit)
        .then(response => response.data)
        .catch(error => {
          console.error('Error fetching sample data:', error);
          return [] as T[];
        });
    } catch (error) {
      console.error('Error in getSampleData:', error);
      return Promise.resolve([] as T[]);
    }
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
    try {
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
          return {
            data: [] as T[],
            total: 0
          };
        });
    } catch (error) {
      console.error('Error in getFullData:', error);
      return Promise.resolve({
        data: [] as T[],
        total: 0
      });
    }
  }
};

// Template endpoints
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
