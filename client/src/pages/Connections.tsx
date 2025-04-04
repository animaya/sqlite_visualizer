import { FC, useState, useEffect } from 'react';
import ConnectionForm from '../components/connection/ConnectionForm';
import ConnectionList from '../components/connection/ConnectionList';
import { Connection } from '../types';
import { connectionApi } from '../services/api';

/**
 * Connections Page
 * 
 * Manages database connections and displays connection history
 */
const Connections: FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch connections from API
    const fetchConnections = async () => {
      try {
        setLoading(true);
        const data = await connectionApi.getAll();
        setConnections(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load connections');
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, []);
  
  const handleAddConnection = async (connectionData: Omit<Connection, 'id'>) => {
    try {
      const newConnection = await connectionApi.create(connectionData);
      setConnections([...connections, newConnection]);
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  };
  
  const handleDeleteConnection = async (connectionId: string | number) => {
    try {
      await connectionApi.delete(connectionId.toString());
      setConnections(connections.filter(conn => conn.id !== connectionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete connection');
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Database Connections</h1>
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
          />
        </div>
      </div>
    </div>
  );
};

export default Connections;
