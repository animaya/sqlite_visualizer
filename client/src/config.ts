/**
 * Application Configuration
 */

// Detect server port from environment or fallback to default
const getServerPort = () => {
  // Always use the default port in development
  // This ensures we connect to the Express server running on port 8765
  const port = 8765;
  console.log('Using server port:', port);
  return port;
};

// Base URL for API requests
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Same domain in production
  }
  
  // For development
  const serverPort = getServerPort();
  const apiUrl = `http://localhost:${serverPort}`;
  console.log('API URL:', apiUrl);
  return apiUrl;
};

// API Base URL
export const API_BASE_URL = `${getApiUrl()}/api`;

// Constants for the application
export const APP_CONFIG = {
  APP_NAME: 'SQLite Visualizer',
  DEFAULT_PAGE_SIZE: 100,
  MAX_EXPORT_ROWS: 100000,
  AVAILABLE_EXPORT_FORMATS: [
    { id: 'csv', name: 'CSV (Comma Separated Values)', extension: 'csv', mimeType: 'text/csv' },
    { id: 'json', name: 'JSON (JavaScript Object Notation)', extension: 'json', mimeType: 'application/json' }
  ]
};

export default {
  API_BASE_URL,
  APP_CONFIG
};
