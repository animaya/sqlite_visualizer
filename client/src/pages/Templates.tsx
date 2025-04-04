import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { connectionApi, tableApi, templateApi, visualizationApi } from '../services/api'

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
  const [tables, setTables] = useState([]);
  const [tableMappings, setTableMappings] = useState({});
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(null);
  const [error, setError] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  
  // Fetch templates and connections on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch templates
        const templatesData = await templateApi.getAll();
        setTemplates(templatesData);
        
        // Fetch connections
        setConnectionsLoading(true);
        const connectionsData = await connectionApi.getAll();
        setConnections(connectionsData);
        setConnectionsLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to load templates or connections');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Fetch tables when connection is selected
  useEffect(() => {
    const fetchTables = async () => {
      if (!selectedConnection) {
        setTables([]);
        return;
      }
      
      try {
        setTablesLoading(true);
        
        // Fetch tables for the selected connection
        const tablesData = await tableApi.getAll(selectedConnection);
        setTables(tablesData);
        
        // Initialize table mappings
        const newTableMappings = {};
        templates.forEach(template => {
          newTableMappings[template.id] = {
            selectedTable: '',
            fieldMappings: {}
          };
        });
        setTableMappings(newTableMappings);
      } catch (err) {
        console.error('Failed to fetch tables:', err);
        toast.error('Failed to load database tables');
      } finally {
        setTablesLoading(false);
      }
    };

    fetchTables();
  }, [selectedConnection]);
  
  // Handle connection selection
  const handleConnectionChange = (e) => {
    setSelectedConnection(e.target.value);
  };
  
  // Open template mapping modal
  const handleApplyTemplate = (template) => {
    if (!selectedConnection) {
      toast.error('Please select a database connection first');
      return;
    }
    
    if (tables.length === 0) {
      toast.error('No tables available in this database');
      return;
    }
    
    setCurrentTemplate(template);
    setShowMappingModal(true);
  };
  
  // Handle table selection in mapping modal
  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    
    setTableMappings(prev => ({
      ...prev,
      [currentTemplate.id]: {
        ...prev[currentTemplate.id],
        selectedTable: tableName,
        fieldMappings: {}
      }
    }));
    
    // Fetch table schema to get fields
    if (tableName) {
      fetchTableSchema(tableName);
    }
  };
  
  // Fetch table schema to get available fields
  const fetchTableSchema = async (tableName) => {
    try {
      const schema = await tableApi.getSchema(selectedConnection, tableName);
      
      // Store schema in the template mappings
      setTableMappings(prev => ({
        ...prev,
        [currentTemplate.id]: {
          ...prev[currentTemplate.id],
          schema
        }
      }));
    } catch (err) {
      console.error('Failed to fetch table schema:', err);
      toast.error('Failed to load table fields');
    }
  };
  
  // Handle field mapping selection
  const handleFieldMappingChange = (templateField, tableField) => {
    setTableMappings(prev => ({
      ...prev,
      [currentTemplate.id]: {
        ...prev[currentTemplate.id],
        fieldMappings: {
          ...prev[currentTemplate.id].fieldMappings,
          [templateField]: tableField
        }
      }
    }));
  };
  
  // Apply the template with the current mappings
  const handleApplyTemplateWithMappings = async () => {
    const { selectedTable, fieldMappings } = tableMappings[currentTemplate.id] || {};
    
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }
    
    // Check if all required fields are mapped
    const config = JSON.parse(currentTemplate.config);
    const requiredFields = Object.keys(config.mappings);
    
    const missingFields = requiredFields.filter(field => !fieldMappings[field]);
    if (missingFields.length > 0) {
      toast.error(`Please map all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      setTemplateLoading(currentTemplate.id);
      
      // Apply the template - Fix: Use the expected parameters format for the API
      const result = await templateApi.apply(currentTemplate.id, {
        connectionId: selectedConnection,
        tableNames: [selectedTable], // Pass as array to match API expectation
        mappings: fieldMappings
      });
      
      // Create visualization from the template result
      await visualizationApi.create({
        connection_id: selectedConnection,
        name: `${currentTemplate.name} - ${selectedTable}`,
        type: currentTemplate.type,
        config: JSON.stringify({
          ...config,
          mappings: fieldMappings
        }),
        table_name: selectedTable
      });
      
      // Close the modal
      setShowMappingModal(false);
      setCurrentTemplate(null);
      
      // Show success message
      toast.success('Template applied successfully');
      
      // Navigate to the visualization page
      navigate('/gallery');
    } catch (err) {
      console.error('Failed to apply template:', err);
      toast.error(err.message || 'Failed to apply template');
    } finally {
      setTemplateLoading(null);
    }
  };
  
  // Get table schema columns for the currently selected table
  const getSchemaColumns = () => {
    if (!currentTemplate) return [];
    
    const { schema } = tableMappings[currentTemplate.id] || {};
    return schema?.columns || [];
  };
  
  // Get required mappings for the current template
  const getRequiredMappings = () => {
    if (!currentTemplate) return [];
    
    const config = JSON.parse(currentTemplate.config);
    return Object.keys(config.mappings).map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1)
    }));
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Insight Templates</h1>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      {/* Connection Selector */}
      <div className="bg-white p-6 rounded-md border border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Select Database Connection</h2>
        
        {connectionsLoading ? (
          <p className="text-slate-500">Loading connections...</p>
        ) : connections.length === 0 ? (
          <div>
            <p className="text-slate-500 mb-2">No connections available</p>
            <button
              className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors"
              onClick={() => navigate('/')}
            >
              Add a Connection
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm bg-white"
              value={selectedConnection || ''}
              onChange={handleConnectionChange}
            >
              <option value="">Select a connection</option>
              {connections.map(connection => (
                <option key={connection.id} value={connection.id}>
                  {connection.name}
                </option>
              ))}
            </select>
            
            {tablesLoading && (
              <p className="text-sm text-slate-500">Loading tables...</p>
            )}
            
            {selectedConnection && tables.length === 0 && !tablesLoading && (
              <p className="text-sm text-slate-500">No tables found in this database</p>
            )}
          </div>
        )}
      </div>
      
      {/* Templates Grid */}
      {loading ? (
        <div className="text-center p-6 bg-white rounded-md border border-slate-200">
          <p className="text-slate-500">Loading templates...</p>
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(template => {
            const config = JSON.parse(template.config);
            return (
              <div key={template.id} className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                <h3 className="text-lg font-medium text-slate-900 mb-1">{template.name}</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {template.description}
                </p>
                <div className="text-xs text-slate-500 mb-4 flex flex-wrap gap-2">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    {template.type.charAt(0).toUpperCase() + template.type.slice(1)} Chart
                  </span>
                  {template.category && (
                    <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded">
                      {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                    </span>
                  )}
                </div>
                <button 
                  className="w-full px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedConnection || tablesLoading || templateLoading === template.id}
                  onClick={() => handleApplyTemplate(template)}
                >
                  {templateLoading === template.id ? 'Applying...' : 'Apply Template'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
          <p className="text-slate-500">No templates available</p>
        </div>
      )}
      
      {/* Template Mapping Modal */}
      {showMappingModal && currentTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Configure Template Mappings
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Table Selection */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Select Table
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm bg-white"
                          value={tableMappings[currentTemplate.id]?.selectedTable || ''}
                          onChange={handleTableSelect}
                        >
                          <option value="">Select a table</option>
                          {tables.map(table => (
                            <option key={table.name} value={table.name}>{table.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Field Mappings */}
                      {tableMappings[currentTemplate.id]?.selectedTable && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">
                            Map Template Fields
                          </h4>
                          
                          <div className="space-y-3">
                            {getRequiredMappings().map(field => (
                              <div key={field.key}>
                                <label className="block text-xs text-slate-500 mb-1">
                                  {field.label}
                                </label>
                                <select
                                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm bg-white"
                                  value={tableMappings[currentTemplate.id]?.fieldMappings[field.key] || ''}
                                  onChange={(e) => handleFieldMappingChange(field.key, e.target.value)}
                                >
                                  <option value="">Select a field</option>
                                  {getSchemaColumns().map(column => (
                                    <option key={column.name} value={column.name}>
                                      {column.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleApplyTemplateWithMappings}
                  disabled={!tableMappings[currentTemplate.id]?.selectedTable}
                >
                  Apply Template
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowMappingModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Templates
