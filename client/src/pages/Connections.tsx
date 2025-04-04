import { useState, useEffect } from 'react'
import ConnectionForm from '../components/connection/ConnectionForm'
import ConnectionList from '../components/connection/ConnectionList'

/**
 * Connections Page
 * 
 * Manages database connections and displays connection history
 */
function Connections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // TODO: Fetch connections from API
    setLoading(false);
  }, []);
  
  const handleAddConnection = async (connectionData) => {
    // TODO: Implement adding a new connection
  };
  
  const handleDeleteConnection = async (connectionId) => {
    // TODO: Implement deleting a connection
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
  )
}

export default Connections
