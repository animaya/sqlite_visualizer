import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import ChartTypeSelector from '../components/visualization/ChartTypeSelector'
import FieldMapper from '../components/visualization/FieldMapper'
import ChartRenderer from '../components/visualization/ChartRenderer'
import { connectionApi, tableApi, visualizationApi } from '../services/api'

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

interface TableInfo {
  name: string;
  type: string;
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

interface TableSchema {
  columns: Column[];
}

interface FieldMapping {
  [key: string]: string;
}

interface ChartData {
  labels?: string[];
  datasets: {
    label?: string;
    data: any[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    tension?: number;
    fill?: boolean;
    pointRadius?: number;
    pointHoverRadius?: number;
  }[];
}

interface LocationState {
  connectionId?: number;
  tableName?: string;
}

/**
 * Visualization Builder Page
 * 
 * Allows users to create custom visualizations from database data
 */
function VisualizationBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get initial values from location state (if coming from TableViewer)
  const state = location.state as LocationState;
  const initialConnectionId = state?.connectionId;
  const initialTableName = state?.tableName;
  
  // State for connections and tables
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<number | null>(initialConnectionId || null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(initialTableName || null);
  
  // State for visualization configuration
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  const [tableSample, setTableSample] = useState<Record<string, any>[]>([]);
  const [chartType, setChartType] = useState<string>('bar');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>({});
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [visualizationName, setVisualizationName] = useState<string>('');
  
  // Loading and error states
  const [connectionsLoading, setConnectionsLoading] = useState<boolean>(true);
  const [tablesLoading, setTablesLoading] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all connections when component mounts
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setConnectionsLoading(true);
        const data = await connectionApi.getAll();
        setConnections(data);
      } catch (err) {
        console.error('Failed to fetch connections:', err);
        toast.error('Failed to load database connections');
      } finally {
        setConnectionsLoading(false);
      }
    };

    fetchConnections();
  }, []);
  
  // Fetch tables when connection is selected
  useEffect(() => {
    const fetchTables = async () => {
      if (!selectedConnection) return;
      
      try {
        setTablesLoading(true);
        const data = await tableApi.getAll(selectedConnection);
        setTables(data);
      } catch (err) {
        console.error('Failed to fetch tables:', err);
        toast.error('Failed to load database tables');
      } finally {
        setTablesLoading(false);
      }
    };

    fetchTables();
  }, [selectedConnection]);
  
  // Fetch table schema and sample data when table is selected
  useEffect(() => {
    const fetchTableData = async () => {
      if (!selectedConnection || !selectedTable) return;
      
      try {
        setDataLoading(true);
        
        // Get table schema
        const schemaData = await tableApi.getSchema(selectedConnection, selectedTable);
        setTableSchema(schemaData);
        
        // Get sample data
        const sampleData = await tableApi.getSample(selectedConnection, selectedTable, 100);
        setTableSample(sampleData.data);
        
        // Generate default visualization name
        setVisualizationName(`${selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1)} ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`);
      } catch (err) {
        console.error('Failed to fetch table schema or sample:', err);
        toast.error('Failed to load table data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchTableData();
  }, [selectedConnection, selectedTable]);
  
  // Generate chart data when mappings or chart type changes
  useEffect(() => {
    if (!tableSchema || !tableSample.length || Object.keys(fieldMappings).length === 0) {
      setChartData(null);
      return;
    }
    
    try {
      // Generate chart data based on mappings and chart type
      const generateChartData = (): ChartData | null => {
        // Get the required mappings for the chart type
        const requiredMappings: Record<string, string[]> = {
          bar: ['x', 'y'],
          line: ['x', 'y'],
          pie: ['labels', 'values'],
          doughnut: ['labels', 'values'],
          scatter: ['x', 'y']
        };
        
        const required = requiredMappings[chartType] || [];
        
        // Check if all required mappings are provided
        const hasAllRequiredMappings = required.every(key => fieldMappings[key]);
        if (!hasAllRequiredMappings) return null;
        
        // Process data based on chart type
        if (chartType === 'bar' || chartType === 'line') {
          // Extract values
          const labels = tableSample.map(row => row[fieldMappings.x]);
          const values = tableSample.map(row => row[fieldMappings.y]);
          
          // Create dataset
          return {
            labels,
            datasets: [
              {
                label: fieldMappings.y,
                data: values,
                backgroundColor: chartType === 'bar' 
                  ? [
                      '#2563EB', '#D946EF', '#F59E0B', '#10B981', '#6366F1',
                      '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                    ]
                  : '#2563EB',
                borderColor: chartType === 'line' ? '#2563EB' : undefined,
                borderWidth: chartType === 'line' ? 2 : undefined,
                tension: chartType === 'line' ? 0.2 : undefined,
                fill: chartType === 'line' ? false : undefined,
              }
            ]
          };
        } else if (chartType === 'pie' || chartType === 'doughnut') {
          // Extract values
          const labels = tableSample.map(row => row[fieldMappings.labels]);
          const values = tableSample.map(row => row[fieldMappings.values]);
          
          // Create dataset
          return {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: [
                  '#2563EB', '#D946EF', '#F59E0B', '#10B981', '#6366F1',
                  '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
                ],
                borderWidth: 2,
                borderColor: '#FFFFFF'
              }
            ]
          };
        } else if (chartType === 'scatter') {
          // Extract values
          const data = tableSample.map(row => ({
            x: row[fieldMappings.x],
            y: row[fieldMappings.y],
            r: fieldMappings.size ? row[fieldMappings.size] : 5,
          }));
          
          // Create dataset
          return {
            datasets: [
              {
                label: 'Scatter Data',
                data,
                backgroundColor: '#2563EB',
                borderColor: '#1E40AF',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
              }
            ]
          };
        }
        
        return null;
      };
      
      setChartData(generateChartData());
    } catch (err) {
      console.error('Failed to generate chart data:', err);
      setChartData(null);
    }
  }, [tableSample, tableSchema, fieldMappings, chartType]);
  
  const handleConnectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const connectionId = parseInt(e.target.value);
    setSelectedConnection(connectionId || null);
    setSelectedTable(null);
    setTableSchema(null);
    setTableSample([]);
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tableName = e.target.value;
    setSelectedTable(tableName || null);
    setTableSchema(null);
    setTableSample([]);
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleChartTypeChange = (type: string) => {
    setChartType(type);
    // Clear field mappings when changing chart type
    setFieldMappings({});
    setChartData(null);
    // Update visualization name
    if (selectedTable) {
      setVisualizationName(`${selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)} Chart`);
    }
  };
  
  const handleFieldMappingChange = (mappings: FieldMapping) => {
    setFieldMappings(mappings);
  };
  
  const handleSaveVisualization = async () => {
    if (!chartData || !selectedConnection || !selectedTable || !visualizationName) {
      toast.error('Please complete all required fields');
      return;
    }
    
    try {
      setSaveLoading(true);
      
      // Prepare visualization data
      const visualizationData = {
        name: visualizationName,
        connection_id: selectedConnection,
        table_name: selectedTable,
        type: chartType,
        config: JSON.stringify({
          mappings: fieldMappings,
          chartType
        })
      };
      
      // Save visualization
      const result = await visualizationApi.create(visualizationData);
      
      toast.success('Visualization saved successfully');
      
      // Navigate to the visualization gallery
      navigate('/gallery');
    } catch (err) {
      console.error('Failed to save visualization:', err);
      toast.error('Failed to save visualization');
    } finally {
      setSaveLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Visualization Builder</h1>
        <button
          className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          onClick={() => navigate('/gallery')}
        >
          View Saved Visualizations
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <p>Error: {error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Connection and Table Selection */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4">Data Source</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Database Connection
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm bg-white"
                  value={selectedConnection || ''}
                  onChange={handleConnectionChange}
                  disabled={connectionsLoading}
                >
                  <option value="">Select a connection</option>
                  {connections.map(conn => (
                    <option key={conn.id.toString()} value={conn.id}>
                      {conn.name}
                    </option>
                  ))}
                </select>
                {connectionsLoading && (
                  <p className="text-xs text-slate-500">Loading connections...</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Database Table
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm bg-white"
                  value={selectedTable || ''}
                  onChange={handleTableChange}
                  disabled={!selectedConnection || tablesLoading}
                >
                  <option value="">Select a table</option>
                  {tables.map(table => (
                    <option key={table.name} value={table.name}>
                      {table.name}
                    </option>
                  ))}
                </select>
                {tablesLoading && (
                  <p className="text-xs text-slate-500">Loading tables...</p>
                )}
              </div>
            </div>
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
            {dataLoading ? (
              <p className="text-slate-500">Loading table schema...</p>
            ) : tableSchema ? (
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
          
          {/* Visualization Name */}
          {chartData && (
            <div className="bg-white p-6 rounded-md border border-slate-200">
              <h2 className="text-xl font-medium text-slate-900 mb-4">Visualization Name</h2>
              <input
                type="text"
                value={visualizationName}
                onChange={(e) => setVisualizationName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter a name for this visualization"
              />
            </div>
          )}
        </div>
        
        {/* Chart Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-md border border-slate-200 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-slate-900">Chart Preview</h2>
              {chartData && (
                <button
                  className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSaveVisualization}
                  disabled={saveLoading || !visualizationName}
                >
                  {saveLoading ? 'Saving...' : 'Save Visualization'}
                </button>
              )}
            </div>
            
            <div className="h-[500px] flex items-center justify-center">
              {dataLoading ? (
                <p className="text-slate-500">Loading data...</p>
              ) : chartData ? (
                <ChartRenderer 
                  type={chartType}
                  data={chartData}
                />
              ) : (
                <p className="text-slate-500">
                  {!selectedTable 
                    ? 'Select a data source to get started' 
                    : !Object.keys(fieldMappings).length
                      ? 'Map fields to generate a chart'
                      : 'Configuring chart...'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisualizationBuilder
