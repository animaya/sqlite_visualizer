import { useState, ChangeEvent, FormEvent } from 'react'

// TypeScript interfaces
interface ConnectionFormData {
  name: string;
  path: string;
}

interface ConnectionFormProps {
  onAddConnection: (data: ConnectionFormData) => Promise<any>;
}

/**
 * Connection Form Component
 * 
 * Form for creating new database connections
 */
function ConnectionForm({ onAddConnection }: ConnectionFormProps) {
  // Form state
  const [name, setName] = useState<string>('');
  const [path, setPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    path?: string;
  }>({});
  
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
    <div className="bg-white p-6 rounded-md border border-slate-200">
      <h2 className="text-xl font-medium text-slate-900 mb-4">Add New Connection</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* General error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* Connection Name field */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Connection Name
          </label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            className={`w-full px-3 py-2 border ${
              validationErrors.name 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 focus:ring-primary focus:border-primary'
            } rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2`}
            placeholder="My Database"
          />
          {validationErrors.name && (
            <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
          )}
        </div>
        
        {/* Database Path field */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Database Path
          </label>
          <input
            type="text"
            value={path}
            onChange={handlePathChange}
            className={`w-full px-3 py-2 border ${
              validationErrors.path 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-slate-300 focus:ring-primary focus:border-primary'
            } rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2`}
            placeholder="/path/to/database.sqlite"
          />
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
          {loading ? 'Connecting...' : 'Connect Database'}
        </button>
      </form>
    </div>
  )
}

export default ConnectionForm
