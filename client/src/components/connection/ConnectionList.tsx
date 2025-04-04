import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Database, ExternalLink, Trash2, RefreshCw, CheckCircle, XCircle, HardDrive, Table, Clock, FileText } from 'lucide-react';

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
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="card flex items-center justify-center h-40">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-500">Loading connections...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 flex">
        <div className="flex-shrink-0 text-red-400">
          <XCircle className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">Error: {error}</p>
        </div>
      </div>
    );
  }
  
  // Show empty state
  if (connections.length === 0) {
    return (
      <div className="card text-center p-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Database className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-base font-medium text-slate-900 mb-1">No connections yet</h3>
        <p className="text-sm text-slate-500 mb-4">Add your first database connection to get started.</p>
      </div>
    );
  }
  
  // Show connections list
  return (
    <div className="card">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center">
          <Database className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-lg font-medium text-slate-900">Your Connections</h2>
        </div>
        <div className="text-xs text-slate-500">
          {connections.length} {connections.length === 1 ? 'database' : 'databases'}
        </div>
      </div>
      
      <ul className="divide-y divide-slate-200" role="list" aria-label="Database connections list">
        {connections.map((connection) => (
          <li key={connection.id} className="p-5 transition-colors hover-transition hover:bg-slate-50">
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center mb-1">
                  <h3 className="text-base font-medium text-slate-900 truncate">{connection.name}</h3>
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    connection.is_valid 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {connection.is_valid ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Invalid</>
                    )}
                  </span>
                </div>
                
                <p className="text-sm text-slate-500 break-all mb-2">
                  <FileText className="h-3.5 w-3.5 inline-block mr-1 text-slate-400" />
                  {connection.path}
                </p>
                
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    {formatLastAccessed(connection.last_accessed)}
                  </span>
                  
                  {connection.table_count !== undefined && (
                    <span className="flex items-center text-xs text-slate-500">
                      <Table className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {connection.table_count} {connection.table_count === 1 ? 'table' : 'tables'}
                    </span>
                  )}
                  
                  {connection.size_bytes !== undefined && (
                    <span className="flex items-center text-xs text-slate-500">
                      <HardDrive className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {formatFileSize(connection.size_bytes)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  className={`btn-tertiary flex items-center px-2.5 py-1.5 rounded text-xs 
                    ${healthCheckingId === connection.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-700 bg-slate-50 hover:bg-slate-100'}`}
                  onClick={() => handleHealthCheck(connection.id)}
                  disabled={healthCheckingId === connection.id}
                  aria-label={`Check health of ${connection.name} database`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${healthCheckingId === connection.id ? 'animate-spin' : ''}`} />
                  {healthCheckingId === connection.id ? 'Checking...' : 'Check Health'}
                </button>
                
                <Link
                  to={`/connections/${connection.id}/tables`}
                  className="btn-primary flex items-center px-2.5 py-1.5 rounded text-xs"
                  aria-label={`Open ${connection.name} database`}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Open
                </Link>
                
                <button
                  className="flex items-center px-2.5 py-1.5 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 hover-transition"
                  onClick={() => handleDeleteRequest(connection)}
                  aria-label={`Delete ${connection.name} database connection`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 modal-transition" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center mb-4 text-red-500">
              <Trash2 className="h-6 w-6 mr-2" />
              <h2 id="delete-dialog-title" className="text-lg font-medium text-slate-900">Confirm Deletion</h2>
            </div>
            <p className="text-slate-700 mb-6">
              Are you sure you want to delete the connection to <span className="font-semibold">{deleteConfirmation.connectionName}</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="btn-secondary"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 hover-transition"
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
