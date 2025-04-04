import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

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

interface ConnectionListProps {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  onDeleteConnection: (id: number) => void;
  onCheckHealth: (id: number) => void;
}

/**
 * Connection List Component
 * 
 * Displays a list of database connections
 */
function ConnectionList({ 
  connections = [], 
  loading, 
  error, 
  onDeleteConnection,
  onCheckHealth
}: ConnectionListProps) {
  // Format the last accessed time
  const formatLastAccessed = (timestamp: string) => {
    if (!timestamp) return 'Never';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Unknown';
    }
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">Loading connections...</p>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <p>Error: {error}</p>
      </div>
    );
  }
  
  // Show empty state
  if (connections.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">No connections yet. Add your first database connection.</p>
      </div>
    );
  }
  
  // Show connections list
  return (
    <div className="bg-white rounded-md border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-medium text-slate-900">Your Connections</h2>
      </div>
      
      <ul className="divide-y divide-slate-200">
        {connections.map((connection) => (
          <li key={connection.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-medium text-slate-900">{connection.name}</h3>
                <p className="text-sm text-slate-500">{connection.path}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                    connection.is_valid 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {connection.is_valid ? 'Connected' : 'Invalid'}
                  </span>
                  
                  <span className="text-xs text-slate-400">
                    Last accessed: {formatLastAccessed(connection.last_accessed)}
                  </span>
                  
                  {connection.table_count !== undefined && (
                    <span className="text-xs text-slate-400">
                      {connection.table_count} tables
                    </span>
                  )}
                  
                  {connection.size_bytes !== undefined && (
                    <span className="text-xs text-slate-400">
                      Size: {formatFileSize(connection.size_bytes)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  className="px-3 py-1.5 bg-slate-50 text-slate-700 rounded text-xs hover:bg-slate-100"
                  onClick={() => onCheckHealth(connection.id)}
                >
                  Check Health
                </button>
                
                <Link
                  to={`/connections/${connection.id}/tables`}
                  className="px-3 py-1.5 bg-primary-light text-primary rounded text-xs hover:bg-blue-100"
                >
                  Open
                </Link>
                
                <button
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100"
                  onClick={() => onDeleteConnection(connection.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ConnectionList
