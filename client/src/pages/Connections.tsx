import { useState, useEffect } from 'react'
import { toast, Toaster } from 'react-hot-toast'
import ConnectionForm from '../components/connection/ConnectionForm'
import ConnectionList from '../components/connection/ConnectionList'
import { connectionApi } from '../services/api'

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

interface ConnectionFormData {
  name: string;
  path: string;
}

/**
 * Connections Page
 * 
 * Manages database connections and displays connection history
 */
function Connections() {
  // State management
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Fetch all connections on component mount or when refresh is triggered
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await connectionApi.getAll();
        setConnections(data);
      } catch (err: any) {
        console.error('Failed to fetch connections:', err);
        setError(err.message || 'Failed to load database connections');
        toast.error('Failed to load connections');
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [refreshTrigger]);
  
  // Add a new connection
  const handleAddConnection = async (connectionData: ConnectionFormData) => {
    try {
      // Create the connection
      const newConnection = await connectionApi.create(connectionData);
      
      // Update the connections list
      setConnections(prev => [...prev, newConnection]);
      
      // Show success message
      toast.success('Connection added successfully');
      
      // Check connection health after a short delay
      setTimeout(() => {
        checkConnectionHealth(newConnection.id);
      }, 500);
      
      return newConnection;
    } catch (err: any) {
      console.error('Failed to add connection:', err);
      toast.error(err.message || 'Failed to add connection');
      throw err; // Re-throw to be handled by the form component
    }
  };
  
  // Check a connection's health
  const checkConnectionHealth = async (connectionId: number) => {
    try {
      const healthData = await connectionApi.checkHealth(connectionId);
      
      // Update the connection in the list with health data
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, ...healthData }
            : conn
        )
      );
      
      // Show appropriate message based on health check
      if (!healthData.is_valid) {
        toast.error(`Connection is invalid. Please check the database path.`);
      }
    } catch (err: any) {
      console.error('Failed to check connection health:', err);
      // Don't show a toast for this error as it's non-critical
    }
  };
  
  // Delete a connection
  const handleDeleteConnection = async (connectionId: number) => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }
    
    try {
      await connectionApi.delete(connectionId.toString());
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      toast.success('Connection deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete connection:', err);
      toast.error(err.message || 'Failed to delete connection');
    }
  };
  
  // Refresh connections list
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="space-y-6">
      {/* Toast notifications container */}
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Database Connections</h1>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors text-sm"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connection Form */}
        <div className="md:col-span-1">
          <ConnectionForm onAddConnection={handleAddConnection} />
        </div>
        
        {/* Connection List */}
        <div className="md:col-span-2">
          <ConnectionList 
            connections={connections} 
            loading={loading} 
            error={error}
            onDeleteConnection={handleDeleteConnection}
            onCheckHealth={checkConnectionHealth}
          />
        </div>
      </div>
    </div>
  )
}

export default Connections
