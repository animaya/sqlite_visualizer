import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Connection, Template } from '../types';
import { connectionApi, templateApi } from '../services/api';
import TemplateList from '../components/templates/TemplateList';

/**
 * Templates Page
 * 
 * Displays and applies pre-configured insight templates
 */
const Templates: FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch templates and connections from API
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [templatesData, connectionsData] = await Promise.all([
          templateApi.getAll(),
          connectionApi.getAll()
        ]);
        
        setTemplates(templatesData);
        setConnections(connectionsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleApplyTemplate = (templateId: string | number) => {
    if (!selectedConnection) {
      setError('Please select a connection first');
      return;
    }
    
    // Navigate to a template configuration page
    navigate(`/templates/${templateId}/apply?connection=${selectedConnection}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Insight Templates</h1>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {/* Connection Selector */}
      <div className="bg-white p-6 rounded-md border border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Select Database Connection</h2>
        <select 
          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
          value={selectedConnection || ''}
          onChange={(e) => setSelectedConnection(e.target.value)}
          disabled={loading || connections.length === 0}
        >
          <option value="">Select a connection</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id.toString()}>
              {connection.name}
            </option>
          ))}
        </select>
        {!selectedConnection && (
          <p className="mt-2 text-sm text-slate-500">
            Please select a database connection to apply templates
          </p>
        )}
      </div>
      
      {/* Templates List */}
      <TemplateList 
        templates={templates}
        selectedConnectionId={selectedConnection}
        onApplyTemplate={handleApplyTemplate}
        isLoading={loading}
      />
    </div>
  );
};

export default Templates;
