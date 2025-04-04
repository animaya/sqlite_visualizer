import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Connection, Template } from '../types';
import { connectionApi, templateApi } from '../services/api';

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
    
    // Navigate to a template configuration page or show modal
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
      </div>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="text-center p-6">
          <p className="text-slate-500">Loading templates...</p>
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
              <h3 className="text-lg font-medium text-slate-900 mb-1">{template.name}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {template.description}
              </p>
              <div className="text-xs text-slate-500 mb-4">
                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded mr-2">
                  {template.type} Chart
                </span>
                {template.category && (
                  <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded">
                    {template.category}
                  </span>
                )}
              </div>
              <button 
                className="w-full px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedConnection}
                onClick={() => handleApplyTemplate(template.id)}
              >
                Apply Template
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
          <p className="text-slate-500">No templates available</p>
        </div>
      )}
    </div>
  );
};

export default Templates;
