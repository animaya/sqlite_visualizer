import { useState, ChangeEvent, FormEvent } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

// TypeScript interfaces
interface ConnectionFormData {
  name: string;
  path: string;
}

interface ConnectionFormProps {
  onAddConnection: (data: ConnectionFormData) => Promise<any>;
  recentPaths?: string[]; // Optional list of recently used paths for suggestions
}

/**
 * Connection Form Component
 * 
 * Form for creating new database connections to SQLite databases
 */
function ConnectionForm({ onAddConnection, recentPaths = [] }: ConnectionFormProps) {
  // Form state
  const [name, setName] = useState<string>('');
  const [path, setPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    path?: string;
  }>({});
  const [showRecentPaths, setShowRecentPaths] = useState<boolean>(false);
  
  // Validate form fields
  const validateForm = (): boolean => {
    const errors: { name?: string; path?: string } = {};
    let isValid = true;
    
    // Validate name
    if (!name.trim()) {
      errors.name = 'Connection name is required';
      isValid = false;
    } else if (name.trim().length < 3) {
      errors.name = 'Connection name must be at least 3 characters';
      isValid = false;
    }
    
    // Validate path
    if (!path.trim()) {
      errors.path = 'Database path is required';
      isValid = false;
    } else if (!path.trim().endsWith('.sqlite') && !path.trim().endsWith('.db') && !path.trim().endsWith('.sqlite3')) {
      errors.path = 'Path must point to a SQLite database file (.sqlite, .db, or .sqlite3)';
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };
  
  // Handle input changes
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    // Clear validation error when user starts typing
    if (validationErrors.name) {
      setValidationErrors(prev => ({ ...prev, name: undefined }));
    }
  };
  
  const handlePathChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPath(e.target.value);
    // Clear validation error when user starts typing
    if (validationErrors.path) {
      setValidationErrors(prev => ({ ...prev, path: undefined }));
    }
  };

  // Handle selecting a recent path
  const handleSelectRecentPath = (recentPath: string) => {
    setPath(recentPath);
    setShowRecentPaths(false);
    // Generate a name suggestion based on the file name
    const fileName = recentPath.split('/').pop() || '';
    const baseName = fileName.replace(/\.(sqlite|db|sqlite3)$/, '');
    
    if (!name.trim() && baseName) {
      setName(baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/[_-]/g, ' '));
    }
    
    // Clear path validation error
    if (validationErrors.path) {
      setValidationErrors(prev => ({ ...prev, path: undefined }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the parent handler to add the connection
      await onAddConnection({ name: name.trim(), path: path.trim() });
      
      // Reset form on success
      setName('');
      setPath('');
      setValidationErrors({});
    } catch (err: any) {
      setError(err.message || 'Failed to add connection');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
      <h2 className="text-xl font-medium text-slate-900 mb-4">Add New Connection</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-start">
            <span className="text-red-400 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </span>
            <span>{error}</span>
          </div>
        )}
        
        {/* Connection Name field */}
        <div className="space-y-1">
          <label htmlFor="connection-name" className="block text-sm font-medium text-slate-700">
            Connection Name
          </label>
          <input
            id="connection-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            className={`w-full px-3 py-2 border ${
              validationErrors.name 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 focus:ring-primary focus:border-primary'
            } rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2`}
            placeholder="My Database"
            autoComplete="off"
          />
          {validationErrors.name && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
          )}
        </div>
        
        {/* Database Path field */}
        <div className="space-y-1">
          <label htmlFor="database-path" className="block text-sm font-medium text-slate-700">
            Database Path
          </label>
          <div className="relative">
            <input
              id="database-path"
              type="text"
              value={path}
              onChange={handlePathChange}
              className={`w-full px-3 py-2 border ${
                validationErrors.path 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-slate-300 focus:ring-primary focus:border-primary'
              } rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2`}
              placeholder="/path/to/database.sqlite"
              onFocus={() => recentPaths.length > 0 && setShowRecentPaths(true)}
              onBlur={() => setTimeout(() => setShowRecentPaths(false), 200)}
              autoComplete="off"
            />
            {recentPaths.length > 0 && (
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowRecentPaths(!showRecentPaths)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Recent paths dropdown */}
            {showRecentPaths && recentPaths.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg">
                <ul className="max-h-60 overflow-auto py-1">
                  {recentPaths.map((recentPath, index) => (
                    <li key={`${recentPath}-${index}`}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 truncate"
                        onClick={() => handleSelectRecentPath(recentPath)}
                      >
                        {recentPath}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {validationErrors.path ? (
            <p className="text-xs text-red-600 mt-1">{validationErrors.path}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Absolute path to the SQLite database file (.sqlite, .db, or .sqlite3)
            </p>
          )}
        </div>
        
        {/* Submit button */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Connecting...
            </span>
          ) : (
            'Connect Database'
          )}
        </button>
      </form>
    </div>
  );
}

export default ConnectionForm;
