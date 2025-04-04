import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Templates Page
 * 
 * Displays and applies pre-configured insight templates
 */
function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // TODO: Fetch templates and connections from API
    setLoading(false);
  }, []);
  
  const handleApplyTemplate = (templateId) => {
    if (!selectedConnection) {
      // TODO: Show error that connection needs to be selected
      return;
    }
    
    // TODO: Navigate to a template configuration page or show a modal
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Insight Templates</h1>
      </div>
      
      {/* Connection Selector */}
      <div className="bg-white p-6 rounded-md border border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Select Database Connection</h2>
        <select 
          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
          value={selectedConnection || ''}
          onChange={(e) => setSelectedConnection(e.target.value)}
        >
          <option value="">Select a connection</option>
          {/* TODO: Map through connections */}
          <option value="example">Example Connection</option>
        </select>
      </div>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="text-center p-6">
          <p className="text-slate-500">Loading templates...</p>
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* TODO: Map through templates and render cards */}
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
            <h3 className="text-lg font-medium text-slate-900 mb-1">Top Selling Products</h3>
            <p className="text-sm text-slate-500 mb-4">
              Visualizes your top selling products by revenue or quantity
            </p>
            <div className="text-xs text-slate-500 mb-4">
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded mr-2">Bar Chart</span>
              <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded">Sales</span>
            </div>
            <button 
              className="w-full px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedConnection}
              onClick={() => handleApplyTemplate('example')}
            >
              Apply Template
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
          <p className="text-slate-500">No templates available</p>
        </div>
      )}
    </div>
  )
}

export default Templates
