import { FC, useState, useEffect } from 'react';
import ChartTypeSelector from '../components/visualization/ChartTypeSelector';
import FieldMapper from '../components/visualization/FieldMapper';
import ChartRenderer from '../components/visualization/ChartRenderer';
import { Connection, TableInfo, TableSchema, FieldMapping, ChartData } from '../types';
import { connectionApi, tableApi, visualizationApi } from '../services/api';

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';

/**
 * Visualization Builder Page
 * 
 * Allows users to create custom visualizations from database data
 */
const VisualizationBuilder: FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>({});
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
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
  
  useEffect(() => {
    // Fetch tables for the selected connection
    const fetchTables = async () => {
      if (!selectedConnection) return;
      
      try {
        setLoading(true);
        const data = await tableApi.getAll(selectedConnection);
        setTables(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
  }, [selectedConnection]);
  
  useEffect(() => {
    // Fetch table schema for the selected table
    const fetchTableSchema = async () => {
      if (!selectedConnection || !selectedTable) return;
      
      try {
        setLoading(true);
        const schema = await tableApi.getSchema(selectedConnection, selectedTable);
        setTableSchema(schema);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load table schema');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTableSchema();
  }, [selectedConnection, selectedTable]);
  
  useEffect(() => {
    // Generate chart data based on field mappings
    const generateChartData = async () => {
      if (
        !selectedConnection || 
        !selectedTable || 
        !tableSchema || 
        Object.keys(fieldMappings).length === 0
      ) {
        return;
      }
      
      try {
        setLoading(true);
        
        // Get a sample of data from the table
        const sample = await tableApi.getSample(selectedConnection, selectedTable);
        
        // Transform the data into a format suitable for Chart.js
        // This is a simplified example - the actual transformation will depend on the chart type
        const labels: string[] = [];
        const values: number[] = [];
        
        sample.data.forEach((row: any) => {
          if (chartType === 'bar' || chartType === 'line') {
            labels.push(row[fieldMappings.x]);
            values.push(parseFloat(row[fieldMappings.y]) || 0);
          } else if (chartType === 'pie' || chartType === 'doughnut') {
            labels.push(row[fieldMappings.labels]);
            values.push(parseFloat(row[fieldMappings.values]) || 0);
          } else if (chartType === 'scatter') {
            // For scatter, we'll handle it differently since we need x/y coordinates
            // This is simplified
            labels.push(row[fieldMappings.x]);
            values.push(parseFloat(row[fieldMappings.y]) || 0);
          }
        });
        
        // Create chart data object
        const data: ChartData = {
          labels,
          datasets: [
            {
              label: 'Dataset',
              data: values,
              backgroundColor: 
                chartType === 'bar' ? '#2563EB' :
                chartType === 'line' ? 'rgba(37, 99, 235, 0.2)' :
                [
                  '#2563EB', // blue-600
                  '#D946EF', // fuchsia-500
                  '#F59E0B', // amber-500
                  '#10B981', // emerald-500
                  '#6366F1', // indigo-500
                  '#EF4444', // red-500
                  '#8B5CF6', // violet-500
                  '#EC4899', // pink-500
                  '#06B6D4', // cyan-500
                  '#84CC16', // lime-500
                ],
              borderColor: chartType === 'line' ? '#2563EB' : undefined,
              borderWidth: 2
            }
          ]
        };
        
        setChartData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate chart data');
      } finally {
        setLoading(false);
      }
    };
    
    generateChartData();
  }, [selectedConnection, selectedTable, chartType, fieldMappings, tableSchema]);
  
  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnection(connectionId);
    setSelectedTable(null);
    setTableSchema(null);
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    // Reset field mappings when changing chart type as they may be incompatible
    setFieldMappings({});
    setChartData(null);
  };
  
  const handleFieldMappingChange = (mappings: FieldMapping) => {
    setFieldMappings(mappings);
  };
  
  const handleSaveVisualization = async () => {
    if (!selectedConnection || !selectedTable || !chartData) {
      setError('Cannot save visualization: missing data');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create visualization data object
      const visualizationData = {
        name: `${selectedTable} ${chartType} chart`,
        type: chartType,
        connectionId: selectedConnection,
        tableName: selectedTable,
        config: {
          mappings: fieldMappings,
          chartType
        }
      };
      
      // Save to API
      await visualizationApi.create(visualizationData);
      
      // Show success message
      alert('Visualization saved successfully!');
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save visualization');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Visualization Builder</h1>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Connection and Table Selection */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4">Data Source</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Connection
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                  value={selectedConnection || ''}
                  onChange={(e) => handleConnectionChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a connection</option>
                  {connections.map((connection) => (
                    <option key={connection.id} value={connection.id.toString()}>
                      {connection.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedConnection && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Table
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                    value={selectedTable || ''}
                    onChange={(e) => handleTableChange(e.target.value)}
                    disabled={loading || tables.length === 0}
                  >
                    <option value="">Select a table</option>
                    {tables.map((table) => (
                      <option key={table.name} value={table.name}>
                        {table.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  disabled={loading}
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
  );
};

export default VisualizationBuilder;
