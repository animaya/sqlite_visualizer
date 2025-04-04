import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Connection } from '../../types';

interface ConnectionListProps {
  connections: Connection[];
  loading?: boolean;
  error?: string | null;
  onDeleteConnection: (id: string | number) => void;
}

/**
 * Connection List Component
 * 
 * Displays a list of database connections
 */
const ConnectionList: FC<ConnectionListProps> = ({ 
  connections = [], 
  loading = false, 
  error = null, 
  onDeleteConnection 
}) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">Loading connections...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        <p>Error: {error}</p>
      </div>
    );
  }
  
  if (connections.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">No connections yet. Add your first database connection.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-md border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-medium text-slate-900">Your Connections</h2>
      </div>
      
      <ul className="divide-y divide-slate-200">
        {connections.length === 0 ? (
          <li className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-medium text-slate-900">Example Database</h3>
                <p className="text-sm text-slate-500">/path/to/database.sqlite</p>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">Connected</span>
                  <span className="text-xs text-slate-400">Last accessed: 2 hours ago</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/connections/1/tables"
                  className="px-3 py-1.5 bg-primary-light text-primary rounded text-xs hover:bg-blue-100"
                >
                  Open
                </Link>
                <button
                  className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100"
                  onClick={() => onDeleteConnection(1)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ) : (
          connections.map((connection) => (
            <li key={connection.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-medium text-slate-900">{connection.name}</h3>
                  <p className="text-sm text-slate-500">{connection.path}</p>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">
                      {connection.is_valid ? 'Connected' : 'Disconnected'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Last accessed: {connection.last_accessed ? new Date(connection.last_accessed).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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
          ))
        )}
      </ul>
    </div>
  );
};

export default ConnectionList;
