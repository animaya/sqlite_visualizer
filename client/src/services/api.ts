/**
 * API Service
 * 
 * Handles all API requests to the backend
 */

const API_URL = process.env.NODE_ENV === 'production' 
  ? '' // Same domain in production
  : 'http://localhost:3000'; // Dev server

/**
 * Make an API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise} - Response data
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}/api${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Connection endpoints
export const connectionApi = {
  getAll: () => apiRequest('/connections'),
  
  getById: (id: string) => apiRequest(`/connections/${id}`),
  
  create: (connectionData: any) => apiRequest('/connections', {
    method: 'POST',
    body: JSON.stringify(connectionData),
  }),
  
  delete: (id: string) => apiRequest(`/connections/${id}`, {
    method: 'DELETE',
  }),
  
  checkHealth: (id: string) => apiRequest(`/connections/${id}/health`),
};

// Table endpoints
export const tableApi = {
  getAll: (connectionId: string) => apiRequest(`/connections/${connectionId}/tables`),
  
  getSchema: (connectionId: string, tableName: string) => 
    apiRequest(`/connections/${connectionId}/tables/${tableName}/schema`),
  
  getData: (connectionId: string, tableName: string, params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, String(value));
    });
    
    return apiRequest(`/connections/${connectionId}/tables/${tableName}/data?${queryParams}`);
  },
  
  getSample: (connectionId: string, tableName: string, limit = 10) => 
    apiRequest(`/connections/${connectionId}/tables/${tableName}/data/sample?limit=${limit}`),
};

// Visualization endpoints
export const visualizationApi = {
  getAll: () => apiRequest('/visualizations'),
  
  getById: (id: string) => apiRequest(`/visualizations/${id}`),
  
  create: (visualizationData: any) => apiRequest('/visualizations', {
    method: 'POST',
    body: JSON.stringify(visualizationData),
  }),
  
  update: (id: string, visualizationData: any) => apiRequest(`/visualizations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(visualizationData),
  }),
  
  delete: (id: string) => apiRequest(`/visualizations/${id}`, {
    method: 'DELETE',
  }),
};

// Template endpoints
export const templateApi = {
  getAll: () => apiRequest('/templates'),
  
  getById: (id: string) => apiRequest(`/templates/${id}`),
  
  apply: (templateId: string, applicationData: any) => apiRequest(`/templates/${templateId}/apply`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }),
};

// Export endpoints
export const exportApi = {
  exportVisualization: (visualizationId: string) => 
    `${API_URL}/api/export/csv/${visualizationId}`,
  
  exportTable: (connectionId: string, tableName: string) => 
    `${API_URL}/api/export/csv/table/${connectionId}/${tableName}`,
};

export default {
  connectionApi,
  tableApi,
  visualizationApi,
  templateApi,
  exportApi,
};
