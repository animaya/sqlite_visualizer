import { useState, useEffect } from 'react'
import ChartTypeSelector from '../components/visualization/ChartTypeSelector'
import FieldMapper from '../components/visualization/FieldMapper'
import ChartRenderer from '../components/visualization/ChartRenderer'

/**
 * Visualization Builder Page
 * 
 * Allows users to create custom visualizations from database data
 */
function VisualizationBuilder() {
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableSchema, setTableSchema] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [fieldMappings, setFieldMappings] = useState({});
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // TODO: Fetch connections from API
  }, []);
  
  useEffect(() => {
    if (selectedConnection) {
      // TODO: Fetch tables for the selected connection
    }
  }, [selectedConnection]);
  
  useEffect(() => {
    if (selectedConnection && selectedTable) {
      // TODO: Fetch table schema
    }
  }, [selectedConnection, selectedTable]);
  
  useEffect(() => {
    if (selectedConnection && selectedTable && Object.keys(fieldMappings).length > 0) {
      // TODO: Generate chart data based on mappings
    }
  }, [selectedConnection, selectedTable, chartType, fieldMappings]);
  
  const handleConnectionChange = (connectionId) => {
    setSelectedConnection(connectionId);
    setSelectedTable(null);
    setTableSchema(null);
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleTableChange = (tableName) => {
    setSelectedTable(tableName);
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleChartTypeChange = (type) => {
    setChartType(type);
  };
  
  const handleFieldMappingChange = (mappings) => {
    setFieldMappings(mappings);
  };
  
  const handleSaveVisualization = async () => {
    // TODO: Implement saving the visualization
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Visualization Builder</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Connection and Table Selection */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4">Data Source</h2>
            {/* TODO: Add connection and table selection UI */}
          </div>
          
          {/* Chart Type Selection */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4">Chart Type</h2>
            <ChartTypeSelector 
              selected={chartType}
              onChange={handleChartTypeChange}
            />
          </div>
          
          {/* Field Mapping */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4">Field Mapping</h2>
            {tableSchema ? (
              <FieldMapper 
                schema={tableSchema}
                chartType={chartType}
                mappings={fieldMappings}
                onChange={handleFieldMappingChange}
              />
            ) : (
              <p className="text-slate-500">Select a table to map fields</p>
            )}
          </div>
        </div>
        
        {/* Chart Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-md border border-slate-200 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-slate-900">Chart Preview</h2>
              {chartData && (
                <button
                  className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors"
                  onClick={handleSaveVisualization}
                >
                  Save Visualization
                </button>
              )}
            </div>
            
            <div className="h-[500px] flex items-center justify-center">
              {loading ? (
                <p className="text-slate-500">Loading chart data...</p>
              ) : chartData ? (
                <ChartRenderer 
                  type={chartType}
                  data={chartData}
                />
              ) : (
                <p className="text-slate-500">Select data source and map fields to generate a chart</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizationBuilder
