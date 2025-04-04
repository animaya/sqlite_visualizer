import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

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

interface DeleteConfirmation {
  isOpen: boolean;
  connectionId: number | null;
  connectionName: string;
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
  // State for delete confirmation dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    connectionId: null,
    connectionName: ''
  });

  // State to track which connection is having its health checked
  const [healthCheckingId, setHealthCheckingId] = useState<number | null>(null);

  // Handle delete confirmation
  const handleDeleteRequest = (connection: Connection) => {
    setDeleteConfirmation({
      isOpen: true,
      connectionId: connection.id,
      connectionName: connection.name
    });
  };

  // Handle confirmed deletion
  const handleConfirmedDelete = () => {
    if (deleteConfirmation.connectionId !== null) {
      onDeleteConnection(deleteConfirmation.connectionId);
      setDeleteConfirmation({
        isOpen: false,
        connectionId: null,
        connectionName: ''
      });
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      connectionId: null,
      connectionName: ''
    });
  };

  // Handle health check
  const handleHealthCheck = (id: number) => {
    setHealthCheckingId(id);
    
    // Check if onCheckHealth returns a Promise
    const result = onCheckHealth(id);
    
    if (result && typeof result.then === 'function') {
      // If it's a Promise, wait for it to complete
      result.finally(() => {
        setTimeout(() => setHealthCheckingId(null), 1000);
      });
    } else {
      // If it's not a Promise, clear the state after a delay
      setTimeout(() => setHealthCheckingId(null), 1500);
    }
  };
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
      
      <ul className="divide-y divide-slate-200" role="list" aria-label="Database connections list">
        {connections.map((connection) => (
          <li key={connection.id} className="p-4 transition-colors duration-150 hover:bg-slate-50">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-medium text-slate-900">{connection.name}</h3>
                <p className="text-sm text-slate-500 break-all">{connection.path}</p>
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
                  className={`px-3 py-1.5 rounded text-xs transition-colors duration-150 
                    ${healthCheckingId === connection.id 
                      ? 'bg-blue-100 text-blue-700 animate-pulse' 
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                  onClick={() => handleHealthCheck(connection.id)}
                  disabled={healthCheckingId === connection.id}
                  aria-label={`Check health of ${connection.name} database`}
                >
                  {healthCheckingId === connection.id ? 'Checking...' : 'Check Health'}
                </button>
                
                <Link
                  to={`/connections/${connection.id}/tables`}
                  className="px-3 py-1.5 bg-primary-light text-primary rounded text-xs hover:bg-blue-100 transition-colors duration-150"
                  aria-label={`Open ${connection.name} database`}
                >
                  Open
                </Link>
                
                <button
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors duration-150"
                  onClick={() => handleDeleteRequest(connection)}
                  aria-label={`Delete ${connection.name} database connection`}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 id="delete-dialog-title" className="text-lg font-medium text-slate-900 mb-4">Confirm Deletion</h2>
            <p className="text-slate-700 mb-6">
              Are you sure you want to delete the connection to <span className="font-semibold">{deleteConfirmation.connectionName}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                onClick={handleConfirmedDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConnectionList
