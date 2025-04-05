/**
 * Application Configuration
 */

// Detect server port from environment or fallback to default
const getServerPort = () => {
  // Always use the default port in development
  // This ensures we connect to the Express server running on port 8765
  return 8765;
};

// Base URL for API requests
const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // Same domain in production
  }
  
  // For development
  const serverPort = getServerPort();
  return `http://localhost:${serverPort}`;
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
