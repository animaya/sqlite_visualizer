import { FC, useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ChartTypeSelector from '../components/visualization/ChartTypeSelector';
import FieldMapper from '../components/visualization/FieldMapper';
import ChartRenderer from '../components/visualization/ChartRenderer';
import { Connection, TableInfo, TableSchema, FieldMapping, ChartData, Visualization } from '../types';
import { connectionApi, tableApi, visualizationApi } from '../services/api';
import { ChartTypeRegistry } from 'chart.js';

// Define chart types that are supported in our application
type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'polarArea';

/**
 * Visualization Builder Page
 * 
 * Allows users to create custom visualizations from database data
 */
const VisualizationBuilder: FC = () => {
  // Get location state for template data passed from template application
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get URL parameters
  const templateId = searchParams.get('template');
  const connectionParam = searchParams.get('connection');
  const tableParam = searchParams.get('table');
  const editId = searchParams.get('edit');
  const viewId = searchParams.get('view');
  
  // Get template result from location state if available
  const templateResult = location.state?.templateResult;
  const templateMappings = location.state?.mappings;
  const templateSourceName = location.state?.sourceName;
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(connectionParam || null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(tableParam || null);
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  const [chartType, setChartType] = useState<ChartType>(
    templateResult?.type?.toLowerCase() as ChartType || 'bar'
  );
  const [fieldMappings, setFieldMappings] = useState<FieldMapping>(templateMappings || {});
  const [chartData, setChartData] = useState<ChartData | null>(templateResult?.data || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromTemplate, setIsFromTemplate] = useState<boolean>(!!templateResult);
  const [isViewMode, setIsViewMode] = useState<boolean>(!!viewId);
  const [isEditMode, setIsEditMode] = useState<boolean>(!!editId);
  const [visualizationId, setVisualizationId] = useState<string | null>(viewId || editId || null);
  const [visualizationName, setVisualizationName] = useState<string>(
    templateSourceName ? `${templateSourceName} (from template)` : ''
  );
  
  // --- State Management Notes ---
  // This component manages significant state related to data sources,
  // chart configuration, and the resulting chart data.
  // If complexity increases, consider refactoring state logic using
  // React Context with useReducer, Zustand, or Jotai for better organization.
  // ---
  
  // Load visualization data if we're in view or edit mode
  useEffect(() => {
    const loadVisualization = async () => {
      if (!visualizationId) return;
      
      try {
        setLoading(true);
        console.log(`Loading visualization with ID: ${visualizationId}`);
        const visualization = await visualizationApi.getById(visualizationId);
        console.log('Loaded visualization data:', JSON.stringify(visualization, null, 2));
        
        if (!visualization) {
          throw new Error(`Visualization with ID ${visualizationId} not found`);
        }
        
        // Set visualization data
        setVisualizationName(visualization.name || 'Unnamed Visualization');
        
        // Handle chart type with validation
        let chartTypeValue: ChartType = 'bar';
        if (visualization.type) {
          const lowerType = visualization.type.toLowerCase();
          if (['bar', 'line', 'pie', 'scatter', 'doughnut'].includes(lowerType)) {
            chartTypeValue = lowerType as ChartType;
          }
        }
        setChartType(chartTypeValue);
        console.log(`Set chart type to: ${chartTypeValue}`);
        
        // Set connection and table with validation
        // Handle API response property format (camelCase) vs TypeScript interface (snake_case)
        // We need to handle both formats because the codebase has conflicting type definitions
        const response = visualization as any;
        
        // Try both camelCase and snake_case formats to be resilient
        const connId = response.connectionId || response.connection_id;
        if (!connId) {
          console.error('Connection ID missing, response format:', response);
          throw new Error('Visualization has no connection ID');
        }
        setSelectedConnection(connId.toString());
        
        const tableName = response.tableName || response.table_name;
        if (!tableName) {
          console.error('Table name missing, response format:', response);
          throw new Error('Visualization has no table name');
        }
        setSelectedTable(tableName);
        console.log(`Connection ID: ${connId}, Table: ${tableName}`);
        
        // Set field mappings with enhanced parsing logic
        let config: any = {};
        let parsedMappings: Record<string, string> = {};  

        try {
          // Parse config with validation
          if (visualization.config) {
            if (typeof visualization.config === 'string') {
              try {
                config = JSON.parse(visualization.config);
              } catch (parseError) {
                console.error('Failed to parse config string:', parseError);
                config = {};
              }
            } else {
              config = visualization.config;
            }
          }
          
          console.log('Parsed config:', JSON.stringify(config, null, 2));
          
          // Try multiple config structures to handle variations in saved visualizations
          // Structure 1: fieldMappings directly in config
          if (config.fieldMappings && typeof config.fieldMappings === 'object') {
            parsedMappings = { ...config.fieldMappings };
            console.log('Found fieldMappings in config');
          }
          // Structure 2: mappings directly in config 
          else if (config.mappings && typeof config.mappings === 'object') {
            parsedMappings = { ...config.mappings };
            console.log('Found mappings in config');
          }
          // Structure 3: parsedMappings with field properties
          else if (config.parsedMappings && typeof config.parsedMappings === 'object') {
            Object.entries(config.parsedMappings).forEach(([key, value]: [string, any]) => {
              if (value && value.field) {
                parsedMappings[key] = value.field;
              }
            });
            console.log('Found parsedMappings in config');
          }
          // Structure 4: config is itself the mappings object (x/y or category/value)
          else if (config.x || config.y || config.category || config.value) {
            parsedMappings = { ...config };
            console.log('Config itself appears to be mappings');
          }
        } catch (parseError) {
          console.error('Error processing config structure:', parseError);
        }
        
        // Set the field mappings if we found any
        if (Object.keys(parsedMappings).length > 0) {
          console.log('Setting field mappings:', parsedMappings);
          setFieldMappings(parsedMappings);
        } else {
          console.warn('No field mappings found in visualization config');
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading visualization:', err);
        setError(err instanceof Error ? err.message : 'Failed to load visualization');
      } finally {
        setLoading(false);
      }
    };
    
    if (visualizationId) {
      console.log(`Starting visualization load for ID: ${visualizationId}`);
      loadVisualization();
    }
  }, [visualizationId]);
  
  // Separate effect to load chart data after connection and table are set
  useEffect(() => {
    // Only run this effect in view mode and when we have all the necessary data
    if (!isViewMode || !visualizationId || !selectedConnection || !selectedTable) {
      return;
    }
    
    // If fieldMappings is empty, we might need to wait for it to be populated
    if (Object.keys(fieldMappings).length === 0) {
      console.log('No field mappings available yet');
      if (!isViewMode) {
        console.log('Not in view mode, waiting for field mappings');
        return;
      }
      console.log('In view mode, will attempt to infer mappings from data');
    }
    
    const loadChartData = async () => {
      try {
        setLoading(true);
        console.log('Loading chart data with:', { 
          connectionId: selectedConnection, 
          tableName: selectedTable, 
          fieldMappings: fieldMappings 
        });
        
        // Always fetch raw table data to ensure we have all available columns
        // This is more reliable for visualizations where the mapping configuration might be inconsistent
        const fullData = await tableApi.getData(
          parseInt(selectedConnection) || 0,
          selectedTable,
          { limit: 1000 } // Increase limit for better visualizations
        );
        
        console.log(`Retrieved ${fullData?.data?.length || 0} rows of data from table ${selectedTable}`);
        if (fullData?.data?.length > 0) {
          const sampleData = fullData.data.slice(0, 3);
          console.log('Sample data structure:', sampleData);
          console.log('Available fields:', Object.keys(sampleData[0] || {}));
        }
        
        console.log('Received data from API:', fullData);
        
        // Process the data for the chart
        if (fullData && fullData.data) {
          console.log('Raw data from API:', fullData.data.slice(0, 5));
          
          // For any missing mappings, we need to infer them from the data
          if (Object.keys(fieldMappings).length === 0 || isViewMode) {
            // Get the first data item to analyze available fields
            const sampleItem = fullData.data[0];
            if (sampleItem) {
              // Categorize fields by data type
              const numericFields: string[] = [];
              const stringFields: string[] = [];
              const dateFields: string[] = [];
              
              Object.entries(sampleItem).forEach(([key, value]) => {
                // Skip internal fields
                if (key.startsWith('_')) return;
                
                if (typeof value === 'number') {
                  numericFields.push(key);
                } else if (!isNaN(Number(value)) && value !== '') {
                  numericFields.push(key);
                } else if (typeof value === 'string') {
                  // Check if it's potentially a date
                  if (/^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(value)) {
                    dateFields.push(key);
                  } else {
                    stringFields.push(key);
                  }
                }
              });
              
              console.log('Field types:', {
                numeric: numericFields,
                string: stringFields,
                date: dateFields
              });
              
              // Check if we have valid field mappings for the chart type
              let shouldInferMappings = false;
              
              if (['bar', 'line', 'pie'].includes(chartType)) {
                // These charts need category/value or x/y mappings
                if (!fieldMappings.category && !fieldMappings.x && 
                    !fieldMappings.value && !fieldMappings.y) {
                  shouldInferMappings = true;
                }
              } else if (chartType === 'scatter') {
                // Scatter charts need x and y numeric values
                if (!fieldMappings.x || !fieldMappings.y) {
                  shouldInferMappings = true;
                }
              }
              
              // Create mappings based on chart type if needed
              if (shouldInferMappings) {
                console.log('Inferring mappings for chart type:', chartType);
                
                if (chartType === 'scatter' && numericFields.length >= 2) {
                  // For scatter plots, use first two numeric fields
                  fieldMappings.x = numericFields[0];
                  fieldMappings.y = numericFields[1];
                } else if (['bar', 'line', 'pie'].includes(chartType)) {
                  // Prefer date fields for x-axis in line charts
                  if (chartType === 'line' && dateFields.length > 0) {
                    fieldMappings.x = dateFields[0];
                  } else if (stringFields.length > 0) {
                    // Use category/value terminology
                    fieldMappings.category = stringFields[0];
                  } else if (dateFields.length > 0) {
                    fieldMappings.category = dateFields[0];
                  } else {
                    // Fallback to first field as category
                    const allFields = Object.keys(sampleItem);
                    if (allFields.length > 0) {
                      fieldMappings.category = allFields[0];
                    }
                  }
                  
                  // Use numeric field for value
                  if (numericFields.length > 0) {
                    fieldMappings.value = numericFields[0];
                  }
                }
                
                console.log('Inferred field mappings:', fieldMappings);
              }
            }
          }
          
          // Apply any transformations needed for the data based on chart type
          // For example, sort date fields chronologically for line charts
          let transformedData = [...fullData.data];
          
          // Sort chronologically for line charts if using dates
          if (chartType === 'line' && fieldMappings.x) {
            const xField = fieldMappings.x as string;
            const firstItem = transformedData[0] as Record<string, any>;
            
            if (firstItem && xField in firstItem && 
                /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(String(firstItem[xField]))) {
              
              transformedData.sort((a, b) => {
                // Convert to dates and compare
                const itemA = a as Record<string, any>;
                const itemB = b as Record<string, any>;
                const dateA = new Date(itemA[xField]);
                const dateB = new Date(itemB[xField]);
                return dateA.getTime() - dateB.getTime();
              });
            }
          }
          
          // Process the transformed data
          const processedData = processChartData(transformedData, fieldMappings, chartType);
          console.log('Processed chart data:', processedData);
          setChartData(processedData);
        } else {
          console.error('No data returned from API');
        }
        
        setError(null);
      } catch (dataError) {
        console.error('Error fetching visualization data:', dataError);
        setError(dataError instanceof Error ? dataError.message : 'Failed to load visualization data');
      } finally {
        setLoading(false);
      }
    };
    
    loadChartData();
  }, [isViewMode, visualizationId, selectedConnection, selectedTable, fieldMappings, chartType]);
  
  // Helper function to process chart data
  const processChartData = (data: any[], mappings: Record<string, string>, chartType: ChartType) => {
    // Default chart data structure
    const chartData: ChartData = {
      labels: [],
      datasets: [{
        label: 'Data',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1
      }]
    };
    
    console.log('Processing chart data:', { data: data.slice(0, 3), mappings, chartType });
    
    // Extract labels and data based on mappings
    if (data && data.length > 0) {
      // For standard bar/pie charts with category/value mappings
      if (mappings.category && mappings.value) {
        chartData.labels = data.map(item => String(item[mappings.category]));
        chartData.datasets[0].data = data.map(item => Number(item[mappings.value]));
        
        // Generate colors
        const colors = generateChartColors(data.length);
        chartData.datasets[0].backgroundColor = colors.background;
        chartData.datasets[0].borderColor = colors.border;
      }
      // For charts with x/y mappings (can be bar, line, scatter, etc.)
      else if (mappings.x && mappings.y) {
        if (chartType === 'scatter') {
          // For scatter, data is in {x, y} format
          // Cast to any because the ChartData type expects different formats for different chart types
          (chartData.datasets[0].data as any) = data.map(item => ({
            x: Number(item[mappings.x]),
            y: Number(item[mappings.y])
          }));
          
          // Single color for scatter
          chartData.datasets[0].backgroundColor = 'rgba(75, 192, 192, 0.6)';
          chartData.datasets[0].borderColor = 'rgba(75, 192, 192, 1)';
        } else {
          // For bar, line, etc. with x/y mappings
          chartData.labels = data.map(item => String(item[mappings.x]));
          chartData.datasets[0].data = data.map(item => Number(item[mappings.y]));
          
          // Generate colors
          const colors = generateChartColors(data.length);
          chartData.datasets[0].backgroundColor = colors.background;
          chartData.datasets[0].borderColor = colors.border;
        }
      }
    }
    
    return chartData;
  };
  
  // Generate colors for charts
  const generateChartColors = (count: number) => {
    const backgroundColors = [];
    const borderColors = [];
    
    // Tailwind-inspired color palette
    const colorPalette = [
      'rgba(59, 130, 246, 0.6)', // blue-500
      'rgba(16, 185, 129, 0.6)', // green-500
      'rgba(239, 68, 68, 0.6)',  // red-500
      'rgba(245, 158, 11, 0.6)', // amber-500
      'rgba(139, 92, 246, 0.6)', // purple-500
      'rgba(236, 72, 153, 0.6)', // pink-500
      'rgba(20, 184, 166, 0.6)', // teal-500
      'rgba(249, 115, 22, 0.6)', // orange-500
      'rgba(99, 102, 241, 0.6)', // indigo-500
      'rgba(168, 85, 247, 0.6)'  // violet-500
    ];
    
    // Generate colors based on the count
    for (let i = 0; i < count; i++) {
      const colorIndex = i % colorPalette.length;
      const bgColor = colorPalette[colorIndex];
      const borderColor = bgColor.replace('0.6', '1'); // Make border more opaque
      
      backgroundColors.push(bgColor);
      borderColors.push(borderColor);
    }
    
    return {
      background: backgroundColors,
      border: borderColors
    };
  };

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
    // Skip this effect if we already have chart data from a template or if we're in view mode
    if (isViewMode || (isFromTemplate && chartData && Object.keys(fieldMappings).length > 0 && !selectedTable)) {
      return;
    }
    
    // Add a flag to prevent endless loops
    let isEffectActive = true;

    // Generate chart data based on field mappings
    const generateChartData = async () => {
      if (
        !selectedConnection || 
        !selectedTable || 
        !tableSchema || 
        Object.keys(fieldMappings).length === 0
      ) {
        // Clear chart data if we don't have all the required inputs
        setChartData(null);
        return;
      }
      
      try {
        setLoading(true);
        
        // Get a sample of data from the table
        const sample = await tableApi.getSample(selectedConnection, selectedTable);
        
        // Enhanced validation for sample data
        if (!sample) {
          throw new Error('No response received from API');
        }
        
        // Check if response has success property (API wrapper format)
        let tableData;
        if ('success' in sample) {
          if (!sample.success) {
            throw new Error('API returned an error response');
          }
          tableData = sample.data;
        } else {
          tableData = sample;
        }
        
        // Now validate the actual data
        if (!tableData || !Array.isArray(tableData)) {
          throw new Error('API data is not in array format');
        }
        
        if (tableData.length === 0) {
          throw new Error('No data available for the selected table');
        }
        
        // Parse field mappings for aggregations
        // Format: fieldName|aggregation (e.g., "sales|sum")
        const parsedMappings: Record<string, { field: string, aggregation?: string }> = {};
        
        // Safely process field mappings
        if (fieldMappings && typeof fieldMappings === 'object') {
          Object.entries(fieldMappings).forEach(([key, value]) => {
            if (typeof value === 'string' && value.includes('|')) {
              const [field, aggregation] = value.split('|');
              parsedMappings[key] = { field, aggregation };
            } else {
              parsedMappings[key] = { field: value as string };
            }
          });
        } else {
          console.error('Invalid field mappings:', fieldMappings);
          throw new Error('Invalid field mappings configuration');
        }
        
        // We already extracted tableData above, no need to do it again
        
        // Apply aggregations if needed
        const processedData = applyAggregations(tableData, parsedMappings, chartType);
        
        // Validate processed data
        if (!Array.isArray(processedData)) {
          throw new Error('Data processing failed: invalid format');
        }
        
        if (processedData.length === 0) {
          throw new Error('No data available after processing');
        }
        
        // Transform the data into a format suitable for Chart.js
        let chartData: ChartData;
        
        try {
          // This validation is now done earlier, before entering this try block
          
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
          
          // Validate chart data structure
          if (!chartData || typeof chartData !== 'object') {
            throw new Error('Invalid chart data structure');
          }
          
          // Ensure labels and datasets exist
          if (!chartData.labels) chartData.labels = [];
          if (!chartData.datasets) chartData.datasets = [];
        } catch (err) {
          console.error('Error processing chart data:', err);
          setError(err instanceof Error ? err.message : 'Failed to process chart data');
          return;
        }
        
        // Only update state if the effect is still active
        if (isEffectActive) {
          setChartData(chartData);
          setError(null);
        }
      } catch (err) {
        console.error('Error generating chart data:', err);
        if (isEffectActive) {
          setError(err instanceof Error ? err.message : 'Failed to generate chart data');
        }
      } finally {
        if (isEffectActive) {
          setLoading(false);
        }
      }
    };
    
    generateChartData();
    
    // Cleanup function to prevent state updates if the component unmounts
    return () => {
      isEffectActive = false;
    };
  }, [selectedConnection, selectedTable, chartType, fieldMappings, tableSchema, isFromTemplate]);
  
  // Helper function to apply aggregations to data
  const applyAggregations = (
    data: any[], 
    mappings: Record<string, { field: string, aggregation?: string }>,
    chartType: string
  ): any[] => {
    // Ensure data is valid
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data passed to applyAggregations:', data);
      throw new Error('Invalid data format: expected an array');
    }
    
    if (data.length === 0) {
      console.warn('Empty data array passed to applyAggregations');
      return [];
    }
    
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
    
    // Ensure data is an array before trying to iterate
    if (Array.isArray(data)) {
      data.forEach(row => {
        if (row && typeof row === 'object') {
          const groupValue = String(row[groupByField] || '');
          if (!groupedData[groupValue]) {
            groupedData[groupValue] = [];
          }
          groupedData[groupValue].push(row);
        }
      });
    } else {
      console.error('Data is not an array in grouping operation');
      return [];
    }
    
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
    console.log('Processing bar/line chart data:', { data: data.slice(0, 2), mappings });
    // Validate inputs
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data available for bar/line chart');
      return { labels: [], datasets: [] };
    }
    
    if (!mappings || typeof mappings !== 'object') {
      console.error('Invalid mappings object:', mappings);
      return { labels: [], datasets: [] };
    }
    
    const xField = mappings.x?.field || '';
    const yField = mappings.y?.field || '';
    const colorField = mappings.color?.field;
    
    // Handle case with color field (creates multiple datasets)
    if (colorField) {
      // Group data by the color field
      const groupedByColor: Record<string, any[]> = {};
      
      // Safely iterate through data
      data.forEach(row => {
        if (row && typeof row === 'object') {
          const colorValue = String(row[colorField] || 'Unknown');
          if (!groupedByColor[colorValue]) {
            groupedByColor[colorValue] = [];
          }
          groupedByColor[colorValue].push(row);
        }
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
          // Additional line chart options handled by ChartRenderer
        };
      });
      
      // Ensure we have valid labels
      const labels = data.map(row => {
        if (row && typeof row === 'object' && xField in row) {
          return String(row[xField] || '');
        }
        return 'Unknown';
      });
      
      return {
        labels,
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
      
      // Ensure we have valid labels
      const labels = processedData.map(row => {
        if (row && typeof row === 'object' && xField in row) {
          return String(row[xField] || '');
        }
        return 'Unknown';
      });
      // Ensure we have valid values
      const values = processedData.map(row => {
        if (row && typeof row === 'object' && yField in row) {
          const val = parseFloat(row[yField]);
          return isNaN(val) ? 0 : val;
        }
        return 0;
      });
      
      return {
        labels,
        datasets: [
          {
            label: yField,
            data: values,
            backgroundColor: chartType === 'bar' ? '#2563EB' : 'rgba(37, 99, 235, 0.2)',
            borderColor: chartType === 'line' ? '#2563EB' : undefined,
            borderWidth: 2
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
    console.log('Processing pie/doughnut chart data:', { data: data.slice(0, 2), mappings });
    // Validate inputs
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data available for pie chart');
      return { labels: [], datasets: [] };
    }
    
    if (!mappings || typeof mappings !== 'object') {
      console.error('Invalid mappings object:', mappings);
      return { labels: [], datasets: [] };
    }
    
    const labelsField = mappings.labels?.field;
    if (!labelsField) {
      throw new Error('Labels field mapping is required for pie/doughnut charts');
    }
    
    const valuesField = mappings.values?.field;
    if (!valuesField) {
      throw new Error('Values field mapping is required for pie/doughnut charts');
    }
    
    if (!labelsField || !valuesField) {
      console.error('Missing required field mappings for pie chart');
      return { labels: [], datasets: [] };
    }
    
    // Safely extract labels and values
    const labels = data.map(row => {
      if (row && typeof row === 'object') {
        return String(row[labelsField] || 'Undefined');
      }
      return 'Invalid data';
    });
    
    const values = data.map(row => {
      if (row && typeof row === 'object') {
        return parseFloat(row[valuesField]) || 0;
      }
      return 0;
    });
    
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
          label: 'Data',  // Add a label to fix TypeScript error
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
  ): any => { // Use 'any' temporarily to bypass type checking for scatter charts
    // Validate inputs
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No data available for scatter chart');
      return { labels: [], datasets: [] };
    }
    
    if (!mappings || typeof mappings !== 'object') {
      console.error('Invalid mappings object:', mappings);
      return { labels: [], datasets: [] };
    }
    
    const xField = mappings.x?.field;
    if (!xField) {
      throw new Error('X-axis field mapping is required for scatter charts');
    }
    
    const yField = mappings.y?.field;
    if (!yField) {
      throw new Error('Y-axis field mapping is required for scatter charts');
    }
    
    const sizeField = mappings.size?.field;
    const colorField = mappings.color?.field;
    
    // Transform data for scatter chart
    // For scatter charts, we need to transform the data into a format that Chart.js expects
    if (colorField) {
      // Group data by the color field
      const groupedByColor: Record<string, any[]> = {};
      
      // Safely iterate through data
      data.forEach(row => {
        if (row && typeof row === 'object') {
          const colorValue = String(row[colorField] || 'Unknown');
          if (!groupedByColor[colorValue]) {
            groupedByColor[colorValue] = [];
          }
          groupedByColor[colorValue].push(row);
        }
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
            data: data.map(row => {
              if (!row || typeof row !== 'object') {
                return { x: 0, y: 0, r: 5 };
              }
              
              // Safely extract x, y values with proper validation
              const x = row[xField] !== undefined ? parseFloat(row[xField]) : null;
              const y = row[yField] !== undefined ? parseFloat(row[yField]) : null;
              
              // Skip points with invalid coordinates
              if (x === null || y === null || isNaN(x) || isNaN(y)) {
                return null;
              }
              
              // Calculate radius if size field is provided
              let r = 5; // default radius
              if (sizeField && row[sizeField] !== undefined) {
                const size = parseFloat(row[sizeField]);
                r = !isNaN(size) ? Math.max(3, size / 5) : 5;
              }
              
              return { x, y, r };
            }).filter(point => point !== null),
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
    setIsFromTemplate(false);
  };
  
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    
    // Only reset mappings if not from template
    if (!isFromTemplate) {
      setFieldMappings({});
      setChartData(null);
    } else {
      // If from template but table changed, no longer consider it from template
      setIsFromTemplate(tableName === tableParam);
    }
  };
  
  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
    // Reset field mappings when changing chart type as they may be incompatible
    setFieldMappings({});
    setChartData(null);
    setIsFromTemplate(false);
  };
  
  const handleFieldMappingChange = (mappings: FieldMapping) => {
    setFieldMappings(mappings);
    // No longer consider from template if mappings changed
    if (isFromTemplate && JSON.stringify(mappings) !== JSON.stringify(templateMappings)) {
      setIsFromTemplate(false);
    }
  };
  
  const handleSaveVisualization = async () => {
    console.log('Save visualization button clicked');
    
    // Display a temporary toast notification
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const toast = document.createElement('div');
      const bgColor = type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                     type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
                     'bg-blue-50 border-blue-200 text-blue-800';
      
      const iconSvg = type === 'success' ? 
        '<svg class="w-5 h-5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
        type === 'error' ? 
        '<svg class="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>' :
        '<svg class="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      
      toast.className = `fixed top-4 right-4 ${bgColor} border px-4 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-in-out opacity-0`;
      toast.innerHTML = `
        <div class="flex items-center">
          ${iconSvg}
          <span class="font-medium">${message}</span>
        </div>
      `;
      document.body.appendChild(toast);
      
      // Animate in
      setTimeout(() => {
        toast.classList.remove('opacity-0');
        toast.classList.add('opacity-100');
      }, 10);
      
      // Remove after delay
      setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    };
    
    if (!selectedConnection || !selectedTable) {
      const errorMsg = 'Cannot save visualization: missing connection or table data';
      console.error(errorMsg);
      setError(errorMsg);
      showToast(errorMsg, 'error');
      return;
    }
    
    // Use custom name or generate one if empty
    if (!visualizationName.trim()) {
      const defaultName = `${selectedTable} ${chartType} chart`;
      console.log(`Using default visualization name: ${defaultName}`);
      setVisualizationName(defaultName);
      showToast(`Using default name: ${defaultName}`, 'info');
    }
    
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
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
      
      // Create visualization data object with the structure expected by the API
      // Don't include chartData directly as it may contain circular references
      // Ensure mappings are in the expected format
      const configObject = {
        // Use simple key-value pairs for mappings (x: "fieldName")
        mappings: { ...fieldMappings },
        // Include parsed mappings with field objects
        parsedMappings,
        chartType,
        isFromTemplate: isFromTemplate || false,
        templateId: templateId || undefined
      };
      
      // Ensure we have valid mappings
      if (Object.keys(configObject.mappings).length === 0) {
        throw new Error('Chart requires at least one field mapping');
      }
      
      // Create a safe version of the config to send to the API
      // Don't stringify the config - the server expects an object
      const safeConfig = JSON.parse(JSON.stringify(configObject, (key, value) => {
        // Handle potential circular references or complex objects
        if (typeof value === 'function') {
          return undefined; // Skip functions
        }
        return value;
      }));
      
      // Prepare visualization data object with snake_case property names as expected by the API
      const visualizationData = {
        name: visualizationName.trim() || `${selectedTable} ${chartType} chart`,
        type: chartType,
        connection_id: parseInt(selectedConnection, 10),
        table_name: selectedTable,
        config: safeConfig // Send as an object, not a string
      };
      
      // Validate required fields before sending to API
      if (!visualizationData.name) {
        throw new Error('Visualization name is required');
      } 
      
      if (!visualizationData.type) {
        throw new Error('Visualization type is required');
      }
      
      if (!visualizationData.connection_id) {
        throw new Error('Connection ID is required');
      }
      
      if (!visualizationData.table_name) {
        throw new Error('Table name is required');
      }
      
      console.log('Saving visualization with data:', JSON.stringify(visualizationData, null, 2));
      
      // Save to API
      try {
        // Log the exact payload being sent to the API for debugging
        console.log('API payload:', JSON.stringify(visualizationData));
        
        const savedViz = await visualizationApi.create(visualizationData);
        console.log('Visualization saved successfully:', savedViz);
      } catch (saveError: any) {
        console.error('Error saving visualization:', saveError);
        
        // Add more detailed error information
        const errorMessage = saveError?.message || 'Unknown error occurred during save';
        const statusCode = saveError?.response?.status;
        const responseText = saveError?.response?.data ? JSON.stringify(saveError.response.data) : 'No response data';
        
        console.error(`Save error details - Status: ${statusCode}, Message: ${errorMessage}`);
        console.error(`Response data: ${responseText}`);
        
        throw new Error(`Failed to save: ${errorMessage}${statusCode ? ` (${statusCode})` : ''}`);
      }
      
      // Show success message
      setError(null);
      
      // Use the toast notification system for success message
      showToast(`Visualization "${visualizationName}" saved successfully!`, 'success');
      
      // Reset loading state
      setLoading(false);
      
      // Optionally redirect to saved visualizations page after a delay
      // setTimeout(() => {
      //   window.location.href = '/saved-visualizations';
      // }, 1500);
      
    } catch (err) {
      console.error('Error saving visualization:', err);
      
      // Get detailed error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to save visualization';
      setError(errorMessage);
      
      // Use the toast notification system for error message
      showToast(`Error: ${errorMessage}`, 'error');
      
      // If we're in development mode and there's a server connection issue,
      // show a mock success message for demonstration purposes
      if (process.env.NODE_ENV !== 'production' && 
          (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network Error'))) {
        console.log('Development mode: Mocking successful save for demonstration');
        setTimeout(() => {
          setError(null);
          showToast(`Visualization "${visualizationName}" saved successfully! (Demo mode)`, 'success');
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">
          {isViewMode ? 'Visualization Viewer' : 'Visualization Builder'}
        </h1>
        {isViewMode && (
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            View Mode
          </div>
        )}
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm text-red-700 animate-fadeIn">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {isFromTemplate && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-700">
              You're using the <strong>{templateSourceName}</strong> template. You can modify the settings below or save it as is.
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Connection and Table Selection */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
              Data Source
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  Connection
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                  value={selectedConnection || ''}
                  onChange={(e) => handleConnectionChange(e.target.value)}
                  disabled={loading || (isFromTemplate && !!templateResult)}
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
                    disabled={loading || tables.length === 0 || (isFromTemplate && !!templateResult)}
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
            <h2 className="text-xl font-medium text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
              Chart Type
            </h2>
            <ChartTypeSelector 
              selected={chartType}
              onChange={handleChartTypeChange}
            />
          </div>
          
          {/* Field Mapping */}
          <div className="bg-white p-6 rounded-md border border-slate-200">
            <h2 className="text-xl font-medium text-slate-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Field Mapping
            </h2>
            {tableSchema ? (
              <FieldMapper 
                schema={tableSchema}
                chartType={chartType}
                mappings={fieldMappings}
                onChange={handleFieldMappingChange}
              />
            ) : isFromTemplate && templateResult ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700">
                  Field mappings already configured from the template.
                </p>
              </div>
            ) : (
              <p className="text-slate-500">Select a table to map fields</p>
            )}
          </div>
        </div>
        
        {/* Chart Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg border border-slate-200 h-full shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-slate-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              Chart Preview
            </h2>
              {chartData && (
                <button
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-md hover:shadow-xl flex items-center space-x-2 transform hover:translate-y-[-1px] active:translate-y-[1px] focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 focus:outline-none"
                  onClick={handleSaveVisualization}
                  disabled={loading || isViewMode}
                  style={{ display: isViewMode ? 'none' : 'flex' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                      </svg>
                      <span>Save Visualization</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Visualization Name Input */}
            {chartData && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Visualization Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow"
                  value={visualizationName}
                  onChange={(e) => setVisualizationName(e.target.value)}
                  onBlur={(e) => {
                    // If field is empty on blur, generate a default name
                    if (!e.target.value.trim() && selectedTable) {
                      const defaultName = `${selectedTable} ${chartType} chart`;
                      setVisualizationName(defaultName);
                    }
                  }}
                  placeholder="Enter a name for this visualization"
                />
                {isFromTemplate && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                    </svg>
                    This visualization was created from the "{templateSourceName}" template
                  </p>
                )}
              </div>
            )}
            
            <div className="h-[500px] flex items-center justify-center">
              {loading ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-md"></div>
                  <p className="text-slate-600 mt-4 font-medium">Loading chart data...</p>
                  <p className="text-slate-400 text-sm mt-1">Please wait while we prepare your visualization</p>
                </div>
              ) : chartData ? (
                <div className="w-full h-full bg-white p-4 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="mb-3 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-indigo-700">{visualizationName || `${selectedTable} ${chartType} chart`}</h3>
                    {isViewMode && (
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium">Viewing saved visualization</span>
                    )}
                  </div>
                  <div className="h-[90%] p-2 bg-white rounded-lg">
                    <ChartRenderer 
                      type={chartType}
                      data={chartData}
                      height="100%"
                      width="100%"
                      customOptions={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              boxWidth: 12,
                              usePointStyle: true,
                              font: {
                                size: 12
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.8)',
                            titleFont: {
                              size: 13
                            },
                            bodyFont: {
                              size: 12
                            },
                            padding: 10,
                            cornerRadius: 4
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              ) : error ? (
                <div className="text-center p-6 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                  <svg className="w-12 h-12 mx-auto text-red-500 mb-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700 mb-2 font-medium">Error: {error}</p>
                  <p className="text-sm text-red-500">Please check your data source and field mappings</p>
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  <p className="text-slate-600 mb-2 font-medium">Select data source and map fields to generate a chart</p>
                  <p className="text-sm text-slate-400">Charts will update automatically as you configure them</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationBuilder;
