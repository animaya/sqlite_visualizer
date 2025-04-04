import { useState } from 'react'

/**
 * Connection Form Component
 * 
 * Form for creating new database connections
 */
function ConnectionForm({ onAddConnection }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !path) {
      setError('Name and path are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Call the parent handler to add the connection
      await onAddConnection({ name, path });
      
      // Reset form on success
      setName('');
      setPath('');
    } catch (err) {
      setError(err.message || 'Failed to add connection');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-md border border-slate-200">
      <h2 className="text-xl font-medium text-slate-900 mb-4">Add New Connection</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Connection Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="My Database"
          />
        </div>
        
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Database Path
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="/path/to/database.sqlite"
          />
          <p className="text-xs text-slate-500">
            Absolute path to the SQLite database file
          </p>
        </div>
        
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
