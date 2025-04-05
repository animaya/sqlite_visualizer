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
        
        // Parse field mappings for aggregations
        // Format: fieldName|aggregation (e.g., "sales|sum")
        const parsedMappings: Record<string, { field: string, aggregation?: string }> = {};
        
        Object.entries(fieldMappings).forEach(([key, value]) => {
          if (typeof value === 'string' && value.includes('|')) {
            const [field, aggregation] = value.split('|');
            parsedMappings[key] = { field, aggregation };
          } else {
            parsedMappings[key] = { field: value as string };
          }
        });
        
        // Apply aggregations if needed
        const processedData = applyAggregations(sample.data, parsedMappings, chartType);
        
        // Transform the data into a format suitable for Chart.js
        let chartData: ChartData;
        
        switch (chartType) {
          case 'bar':
          case 'line':
            chartData = processBarOrLineChartData(processedData, parsedMappings);
            break;
          case 'pie':
          case 'doughnut':
            chartData = processPieChartData(processedData, parsedMappings);
            break;
          case 'scatter':
            chartData = processScatterChartData(processedData, parsedMappings);
            break;
          default:
            chartData = processBarOrLineChartData(processedData, parsedMappings);
        }
        
        setChartData(chartData);
        setError(null);
      } catch (err) {
        console.error('Error generating chart data:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate chart data');
      } finally {
        setLoading(false);
      }
    };
    
    generateChartData();
  }, [selectedConnection, selectedTable, chartType, fieldMappings, tableSchema]);
  
  // Helper function to apply aggregations to data
  const applyAggregations = (
    data: any[], 
    mappings: Record<string, { field: string, aggregation?: string }>,
    chartType: string
  ) => {
    // Return original data if no aggregations needed
    const hasAggregations = Object.values(mappings).some(m => m.aggregation && m.aggregation !== 'none');
    if (!hasAggregations) return data;
    
    // Determine grouping field based on chart type
    let groupByField = '';
    if (chartType === 'bar' || chartType === 'line') {
      groupByField = mappings.x?.field || '';
    } else if (chartType === 'pie' || chartType === 'doughnut') {
      groupByField = mappings.labels?.field || '';
    } else if (chartType === 'scatter') {
      // Scatter plots typically don't use aggregation, but we'll support it anyway
      return data;
    }
    
    if (!groupByField) return data;
    
    // Group data by the grouping field
    const groupedData: Record<string, any[]> = {};
    data.forEach(row => {
      const groupValue = String(row[groupByField] || '');
      if (!groupedData[groupValue]) {
        groupedData[groupValue] = [];
      }
      groupedData[groupValue].push(row);
    });
    
    // Apply aggregations to each group
    const result = Object.entries(groupedData).map(([groupValue, rows]) => {
      const resultRow: Record<string, any> = { [groupByField]: groupValue };
      
      // Apply aggregations for each mapping that has one
      Object.entries(mappings).forEach(([mappingKey, { field, aggregation }]) => {
        if (!aggregation || aggregation === 'none' || field === groupByField) {
          return;
        }
        
        // Extract numeric values for the field
        const values = rows
          .map(row => parseFloat(row[field]))
          .filter(value => !isNaN(value));
        
        // Apply the aggregation function
        let aggregatedValue = 0;
        switch (aggregation) {
          case 'sum':
            aggregatedValue = values.reduce((sum, value) => sum + value, 0);
            break;
          case 'avg':
            aggregatedValue = values.length > 0 
              ? values.reduce((sum, value) => sum + value, 0) / values.length 
              : 0;
            break;
          case 'min':
            aggregatedValue = values.length > 0 
              ? Math.min(...values) 
              : 0;
            break;
          case 'max':
            aggregatedValue = values.length > 0 
              ? Math.max(...values) 
              : 0;
            break;
          case 'count':
            aggregatedValue = values.length;
            break;
          default:
            aggregatedValue = 0;
        }
        
        resultRow[field] = aggregatedValue;
      });
      
      // Copy non-aggregated fields
      Object.entries(mappings).forEach(([mappingKey, { field, aggregation }]) => {
        if ((!aggregation || aggregation === 'none') && field !== groupByField) {
          // For non-aggregated fields, use the first row's value
          resultRow[field] = rows[0][field];
        }
      });
      
      return resultRow;
    });
    
    return result;
  };
  
  // Helper function to process data for bar or line charts
  const processBarOrLineChartData = (
    data: any[],
    mappings: Record<string, { field: string, aggregation?: string }>
  ): ChartData => {
    const xField = mappings.x?.field || '';
    const yField = mappings.y?.field || '';
    const colorField = mappings.color?.field;
    
    // Handle case with color field (creates multiple datasets)
    if (colorField) {
      // Group data by the color field
      const groupedByColor: Record<string, any[]> = {};
      data.forEach(row => {
        const colorValue = String(row[colorField] || 'Unknown');
        if (!groupedByColor[colorValue]) {
          groupedByColor[colorValue] = [];
        }
        groupedByColor[colorValue].push(row);
      });
      
      // Sort data by x-axis values for line charts (improves line rendering)
      if (chartType === 'line') {
        Object.keys(groupedByColor).forEach(colorValue => {
          groupedByColor[colorValue].sort((a, b) => {
            // Try to sort numerically first
            const numA = parseFloat(a[xField]);
            const numB = parseFloat(b[xField]);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            // Fall back to string comparison
            return String(a[xField]).localeCompare(String(b[xField]));
          });
        });
      }
      
      // Get unique x values across all datasets
      const allXValues = Array.from(new Set(data.map(row => row[xField])));
      
      // Prepare datasets
      const datasets = Object.entries(groupedByColor).map(([colorValue, rows], index) => {
        const color = [
          '#2563EB', // blue-600
          '#D946EF', // fuchsia-500
          '#F59E0B', // amber-500
          '#10B981', // emerald-500
          '#6366F1', // indigo-500
          '#EF4444', // red-500
          '#8B5CF6', // violet-500
          '#EC4899', // pink-500
          '#06B6D4', // cyan-500
          '#84CC16'  // lime-500
        ][index % 10];
        
        return {
          label: colorValue,
          data: rows.map(row => parseFloat(row[yField]) || 0),
          backgroundColor: chartType === 'bar' ? color : `${color}33`,
          borderColor: color,
          borderWidth: 2,
          tension: chartType === 'line' ? 0.2 : undefined,
          fill: chartType === 'line' ? true : undefined
        };
      });
      
      return {
        labels: data.map(row => String(row[xField])),
        datasets
      };
    } 
    // Handle simple case (single dataset)
    else {
      // Sort data by x-axis values for line charts
      let processedData = [...data];
      if (chartType === 'line') {
        processedData.sort((a, b) => {
          // Try to sort numerically first
          const numA = parseFloat(a[xField]);
          const numB = parseFloat(b[xField]);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          // Fall back to string comparison
          return String(a[xField]).localeCompare(String(b[xField]));
        });
      }
      
      const labels = processedData.map(row => String(row[xField]));
      const values = processedData.map(row => parseFloat(row[yField]) || 0);
      
      return {
        labels,
        datasets: [
          {
            label: yField,
            data: values,
            backgroundColor: chartType === 'bar' ? '#2563EB' : 'rgba(37, 99, 235, 0.2)',
            borderColor: chartType === 'line' ? '#2563EB' : undefined,
            borderWidth: 2,
            tension: chartType === 'line' ? 0.2 : undefined,
            fill: chartType === 'line' ? true : undefined
          }
        ]
      };
    }
  };
  
  // Helper function to process data for pie and doughnut charts
  const processPieChartData = (
    data: any[],
    mappings: Record<string, { field: string, aggregation?: string }>
  ): ChartData => {
    const labelsField = mappings.labels?.field || '';
    const valuesField = mappings.values?.field || '';
    
    const labels = data.map(row => String(row[labelsField]));
    const values = data.map(row => parseFloat(row[valuesField]) || 0);
    
    // Generate colors for each segment
    const baseColors = [
      '#2563EB', // blue-600
      '#D946EF', // fuchsia-500
      '#F59E0B', // amber-500
      '#10B981', // emerald-500
      '#6366F1', // indigo-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#EC4899', // pink-500
      '#06B6D4', // cyan-500
      '#84CC16'  // lime-500
    ];
    
    // Repeat colors if needed
    const colors = labels.map((_, i) => baseColors[i % baseColors.length]);
    
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: '#FFFFFF',
          borderWidth: 2
        }
      ]
    };
  };
  
  // Helper function to process data for scatter charts
  const processScatterChartData = (
    data: any[],
    mappings: Record<string, { field: string, aggregation?: string }>
  ): ChartData => {
    const xField = mappings.x?.field || '';
    const yField = mappings.y?.field || '';
    const sizeField = mappings.size?.field;
    const colorField = mappings.color?.field;
    
    // Transform data for scatter chart
    // For scatter charts, we need to transform the data into a format that Chart.js expects
    if (colorField) {
      // Group data by the color field
      const groupedByColor: Record<string, any[]> = {};
      data.forEach(row => {
        const colorValue = String(row[colorField] || 'Unknown');
        if (!groupedByColor[colorValue]) {
          groupedByColor[colorValue] = [];
        }
        groupedByColor[colorValue].push(row);
      });
      
      // Create datasets for each color group
      const datasets = Object.entries(groupedByColor).map(([colorValue, rows], index) => {
        const color = [
          '#2563EB', // blue-600
          '#D946EF', // fuchsia-500
          '#F59E0B', // amber-500
          '#10B981', // emerald-500
          '#6366F1', // indigo-500
          '#EF4444', // red-500
          '#8B5CF6', // violet-500
          '#EC4899', // pink-500
          '#06B6D4', // cyan-500
          '#84CC16'  // lime-500
        ][index % 10];
        
        return {
          label: colorValue,
          data: rows.map(row => ({
            x: parseFloat(row[xField]) || 0,
            y: parseFloat(row[yField]) || 0,
            r: sizeField ? (parseFloat(row[sizeField]) / 5 || 3) : 5
          })),
          backgroundColor: `${color}88`,
          borderColor: color,
          borderWidth: 1
        };
      });
      
      return {
        labels: [],
        datasets
      };
    } else {
      // Single dataset for scatter
      return {
        labels: [],
        datasets: [
          {
            label: 'Data Points',
            data: data.map(row => ({
              x: parseFloat(row[xField]) || 0,
              y: parseFloat(row[yField]) || 0,
              r: sizeField ? (parseFloat(row[sizeField]) / 5 || 3) : 5
            })),
            backgroundColor: 'rgba(37, 99, 235, 0.6)',
            borderColor: '#2563EB',
            borderWidth: 1
          }
        ]
      };
    }
  };
  
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
      
      // Extract aggregation information from field mappings
      const parsedMappings: Record<string, { field: string, aggregation?: string }> = {};
      let hasAdvancedSettings = false;
      
      Object.entries(fieldMappings).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes('|')) {
          const [field, aggregation] = value.split('|');
          parsedMappings[key] = { field, aggregation };
          hasAdvancedSettings = true;
        } else {
          parsedMappings[key] = { field: value as string };
        }
      });
      
      // Create a human-readable name for the visualization
      let vizName = `${selectedTable} ${chartType} chart`;
      
      // If using color field, add that to the name
      if (fieldMappings.color) {
        const colorField = typeof fieldMappings.color === 'string' && fieldMappings.color.includes('|') 
          ? fieldMappings.color.split('|')[0] 
          : fieldMappings.color;
        vizName += ` by ${colorField}`;
      }
      
      // If using aggregations, note that in the name
      if (hasAdvancedSettings) {
        vizName += " (with aggregations)";
      }
      
      // Create visualization data object with the structure expected by the API
      const visualizationData = {
        name: vizName,
        type: chartType,
        connectionId: parseInt(selectedConnection, 10),
        tableName: selectedTable,
        config: {
          mappings: fieldMappings,
          parsedMappings,
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
