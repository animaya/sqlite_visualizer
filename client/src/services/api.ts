/**
 * API Service
 * 
 * Handles all API requests to the backend
 */
import { Connection, Visualization, Template, ApiError } from '../types';

// Define the global request tracker type
declare global {
  interface Window {
    _requestTracker?: Record<string, number>;
  }
}

import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL.replace('/api', '');

// Log server connection status
(async function checkServerAvailability() {
  try {
    const response = await fetch(`${API_URL}/api/connections`);
    console.log(`Server connection check: ${response.status === 200 ? 'SUCCESS' : 'FAILED'} (${response.status})`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Server connection check FAILED: ${errorMessage}`);
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
  
  // Track request to prevent endless loops
  if (!window._requestTracker) {
    window._requestTracker = {};
  }
  
  // Check if we've made too many requests to the same endpoint
  const requestKey = `${options.method || 'GET'}-${endpoint}`;
  window._requestTracker[requestKey] = (window._requestTracker[requestKey] || 0) + 1;
  
  // If we've made more than 3 requests to the same endpoint in a short time, throw an error
  if (window._requestTracker[requestKey] > 3) {
    console.error(`Too many requests to ${url}. Possible infinite loop detected.`);
    window._requestTracker[requestKey] = 0; // Reset the counter
    throw new ApiError(`Too many requests to the same endpoint. Request aborted to prevent an infinite loop.`, 429);
  }
  
  console.log(`Making API request to: ${url} at ${new Date().toISOString()}`);
  
  // Set headers with careful consideration for CORS
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
    // Add a timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Make the fetch request with abort signal
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
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
    } catch (parseError: unknown) {
      console.error('Error parsing response:', parseError);
      throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // Handle error responses
    if (!response.ok) {
      // Decrease the request counter for this endpoint on error to prevent loops
      window._requestTracker[requestKey] = Math.max(0, (window._requestTracker[requestKey] || 1) - 1);
      
      console.error('Server returned error status:', response.status, data);
      const errorMessage = data && typeof data === 'object' && 'message' in data 
        ? String(data.message) 
        : `API error: ${response.status} ${response.statusText}`;
      
      // Create a proper ApiError instance
      throw new ApiError(
        errorMessage,
        response.status,
        data
      );
    }
    
    // Reset the request counter for successful requests
    window._requestTracker[requestKey] = 0;
    
    // Return successful response data
    return data;
  } catch (error: unknown) {
    // Decrease the request counter for this endpoint on error to prevent loops
    window._requestTracker[requestKey] = Math.max(0, (window._requestTracker[requestKey] || 1) - 1);
    
    // Handle abort errors (timeouts)
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Request timed out:', url);
      throw new ApiError('Request timed out after 10 seconds', 408, { originalError: error });
    }
    
    // Handle network errors
    if (error instanceof TypeError && (error.message as string).includes('Failed to fetch')) {
      console.error('Network error connecting to server:', error);
      const errorMsg = `Cannot connect to server at ${url}. Please check:
      1. Server is running (on port ${API_URL.split(':').pop()})
      2. Network connectivity
      3. CORS configuration`;
      
      throw new ApiError(errorMsg, 503, { originalError: error });
    }
    
    // If it's already an ApiError, just rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Re-throw the error with enhanced context
    console.error('API request failed:', {
      url,
      method: config.method || 'GET',
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        ...(error instanceof ApiError ? {
          status: error.status,
          data: error.data
        } : {})
      } : String(error)
    });
    
    // If it's already an augmented API error, just rethrow it
    if (error instanceof Error && 'status' in error) {
      throw error;
    }
    
    // Otherwise wrap in a more helpful error
    throw new Error(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Create a cache key from connection, table, and params
    const cacheKey = `table_data_${connectionId}_${tableName}_${queryParams.toString()}`;
    
    // Use a shorter request prevention window (300ms) to avoid blocking legitimate refreshes
    // but still prevent rapid duplicate requests
    const requestTracker = window._requestTracker = window._requestTracker || {};
    
    // Check if there's a recent identical request in progress
    if (requestTracker[cacheKey] && (Date.now() - requestTracker[cacheKey]) < 300) {
      console.log(`Blocking duplicate request for ${cacheKey}, too soon after previous request`);
      // Return empty compatible data structure
      return Promise.resolve({
        data: [],
        total: 0,
        page: parseInt(params.page || '1', 10),
        limit: parseInt(params.limit || '100', 10), 
        totalPages: 0
      } as any);
    }
    
    // Mark this request as in progress
    requestTracker[cacheKey] = Date.now();
    
    // Check for cached data with a longer freshness window
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        // Check if cache is still fresh (less than 30 seconds old)
        if (Date.now() - parsedData.timestamp < 30000) {
          console.log(`Using cached data for ${cacheKey}`);
          return Promise.resolve(parsedData.data);
        }
      } catch (e) {
        console.warn('Failed to parse cached data:', e);
        // Continue with API request if cache parsing fails
      }
    }
    
    return apiRequest<{
      data: T[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/connections/${connectionId}/tables/${tableName}/data?${queryParams}`)
      .then(response => {
        // Cache the response with a timestamp
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: response,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('Failed to cache response:', e);
          // Continue even if caching fails
        }
        return response;
      });
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
  
  create: (visualizationData: any): Promise<Visualization> => {
    // Ensure property names match the server-side expectations
    const payload = {
      connection_id: visualizationData.connection_id,
      name: visualizationData.name,
      type: visualizationData.type,
      config: visualizationData.config, // Already stringified in VisualizationBuilder
      table_name: visualizationData.table_name
    };
    
    console.log('API sending visualization payload:', payload);
    
    // Add validation to ensure required fields are present
    if (!payload.name) {
      console.error('Missing required field: name');
      return Promise.reject(new Error('Visualization name is required'));
    }
    
    if (!payload.type) {
      console.error('Missing required field: type');
      return Promise.reject(new Error('Visualization type is required'));
    }
    
    if (!payload.connection_id) {
      console.error('Missing required field: connection_id');
      return Promise.reject(new Error('Connection ID is required'));
    }
    
    if (!payload.table_name) {
      console.error('Missing required field: table_name');
      return Promise.reject(new Error('Table name is required'));
    }
    
    return apiRequest<{data: Visualization}>('/visualizations', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    .then(response => {
      console.log('API received visualization response:', response);
      return response.data;
    })
    .catch(error => {
      console.error('Error creating visualization:', error);
      // Enhance error with more details if available
      const errorMessage = error.message || 'Failed to create visualization';
      throw new Error(`API Error: ${errorMessage}`);
    });
  },
  
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
      .then(response => response.data) // Access the nested 'data' property from the sample response
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
        data: response.data, // Access the nested 'data' property
        total: response.total // Access the nested 'total' property
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
