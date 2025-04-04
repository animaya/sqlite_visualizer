import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { visualizationApi, exportApi } from '../services/api'
import ChartRenderer from '../components/visualization/ChartRenderer'

// TypeScript interfaces
interface Visualization {
  id: number;
  connection_id: number | null;
  name: string;
  type: string;
  config: string | any;
  table_name: string | null;
  created_at: string;
  updated_at: string;
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

/**
 * Saved Visualizations Page
 * 
 * Displays and manages saved visualizations
 */
function SavedVisualizations() {
  const navigate = useNavigate();
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<number, ChartData | null>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});
  const [selectedVisualization, setSelectedVisualization] = useState<Visualization | null>(null);
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [fullChartData, setFullChartData] = useState<ChartData | null>(null);
  const [fullChartLoading, setFullChartLoading] = useState<boolean>(false);
  
  // Fetch all saved visualizations on component mount
  useEffect(() => {
    const fetchVisualizations = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching visualizations...');
        const data = await visualizationApi.getAll();
        console.log('Visualizations data:', data);
        setVisualizations(data);
      } catch (err: any) {
        console.error('Failed to fetch visualizations:', err);
        setError(err.message || 'Failed to load saved visualizations');
      } finally {
        setLoading(false);
      }
    };

    fetchVisualizations();
  }, []);
  
  // Load visualization previews after we have the visualization list
  useEffect(() => {
    const loadVisualizationPreviews = async () => {
      // Only load previews for visualizations with valid connection_id
      const visualizationsToPreview = visualizations
        .filter(viz => viz.connection_id) // Filter out visualizations with no connection_id
        .slice(0, 6); // Limit to first 6 to avoid too many requests
      
      for (const viz of visualizationsToPreview) {
        await generatePreviewData(viz);
      }
    };
    
    if (visualizations.length > 0) {
      loadVisualizationPreviews();
    }
  }, [visualizations]);
  
  // Generate preview data for a visualization
  const generatePreviewData = async (visualization: Visualization) => {
    if (previewData[visualization.id]) return;
    
    // Skip if connection_id or table_name is missing
    if (!visualization.connection_id || !visualization.table_name) {
      console.warn(`Skipping preview for visualization ${visualization.id}: Missing connection_id or table_name`);
      setPreviewData(prev => ({ ...prev, [visualization.id]: null }));
      return;
    }
    
    try {
      setPreviewLoading(prev => ({ ...prev, [visualization.id]: true }));
      
      // Get the config data
      let config;
      try {
        config = JSON.parse(visualization.config);
      } catch (err) {
        console.error(`Failed to parse config for visualization ${visualization.id}:`, err);
        setPreviewData(prev => ({ ...prev, [visualization.id]: null }));
        setPreviewLoading(prev => ({ ...prev, [visualization.id]: false }));
        return;
      }
      
      // Fetch a sample of the data from the table
      const tableSample = await visualizationApi.getSampleData(
        visualization.connection_id,
        visualization.table_name,
        config.mappings
      );
      
      // Generate chart data based on the sample and config
      const chartData = generateChartData(
        tableSample,
        config.mappings,
        visualization.type
      );
      
      setPreviewData(prev => ({ ...prev, [visualization.id]: chartData }));
    } catch (err) {
      console.error(`Failed to generate preview for visualization ${visualization.id}:`, err);
      // Set null for the preview data to indicate it failed to load
      setPreviewData(prev => ({ ...prev, [visualization.id]: null }));
    } finally {
      setPreviewLoading(prev => ({ ...prev, [visualization.id]: false }));
    }
  };
  
  // Generate chart data based on sample data, mappings, and chart type
  const generateChartData = (
    sampleData: any[], 
    mappings: Record<string, string>, 
    chartType: string
  ): ChartData | null => {
    if (!sampleData || !sampleData.length || !mappings) return null;
    
    try {
      // Process data based on chart type
      if (chartType === 'bar' || chartType === 'line') {
        // Extract values
        const labels = sampleData.map(row => row[mappings.x]);
        const values = sampleData.map(row => row[mappings.y]);
        
        // Create dataset
        return {
          labels,
          datasets: [
            {
              label: mappings.y,
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
        const labels = sampleData.map(row => row[mappings.labels]);
        const values = sampleData.map(row => row[mappings.values]);
        
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
        const data = sampleData.map(row => ({
          x: row[mappings.x],
          y: row[mappings.y],
          r: mappings.size ? row[mappings.size] : 5,
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
    } catch (err) {
      console.error('Error generating chart data:', err);
    }
    
    return null;
  };
  
  // Load full visualization data for view mode
  const loadFullVisualizationData = async (visualization: Visualization) => {
    // Skip if connection_id or table_name is missing
    if (!visualization.connection_id || !visualization.table_name) {
      setError("This visualization can't be loaded because it doesn't have a valid connection or table");
      return;
    }
    
    try {
      setFullChartLoading(true);
      setError(null);
      
      // Get the config data
      let config;
      try {
        config = JSON.parse(visualization.config);
      } catch (err) {
        setError("Failed to parse visualization configuration");
        setFullChartLoading(false);
        return;
      }
      
      // Fetch all data from the table for this visualization
      const response = await visualizationApi.getFullData(
        visualization.connection_id,
        visualization.table_name,
        config.mappings
      );
      
      // Generate chart data based on the full data and config
      const chartData = generateChartData(
        response.data,
        config.mappings,
        visualization.type
      );
      
      setFullChartData(chartData);
    } catch (err: any) {
      console.error('Failed to load full visualization data:', err);
      setError(err.message || 'Failed to load visualization data');
    } finally {
      setFullChartLoading(false);
    }
  };
  
  // Handle visualization deletion
  const handleDeleteVisualization = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this visualization?')) {
      return;
    }
    
    try {
      await visualizationApi.delete(id);
      setVisualizations(visualizations.filter(viz => viz.id !== id));
      
      // Clear preview data for this visualization
      setPreviewData(prev => {
        const newData = { ...prev };
        delete newData[id];
        return newData;
      });
      
      toast.success('Visualization deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete visualization:', err);
      toast.error(err.message || 'Failed to delete visualization');
    }
  };
  
  // Handle view visualization (opens in full view mode)
  const handleViewVisualization = async (visualization: Visualization) => {
    setSelectedVisualization(visualization);
    setViewMode(true);
    await loadFullVisualizationData(visualization);
  };
  
  // Handle edit visualization (navigates to the builder with the visualization loaded)
  const handleEditVisualization = (visualization: Visualization) => {
    // Check if connection_id and table_name exist
    if (!visualization.connection_id || !visualization.table_name) {
      toast.error("This visualization can't be edited because it doesn't have a valid connection or table");
      return;
    }
    
    // Get the config and mappings
    let config;
    if (typeof visualization.config === 'string') {
      try {
        config = JSON.parse(visualization.config);
      } catch (err) {
        toast.error("Failed to parse visualization configuration");
        return;
      }
    } else {
      config = visualization.config;
    }
    
    navigate('/visualize', { 
      state: { 
        editMode: true,
        visualizationId: visualization.id,
        connectionId: visualization.connection_id,
        tableName: visualization.table_name,
        chartType: visualization.type,
        configData: visualization.config,
        name: visualization.name
      } 
    });
  };
  
  // Handle export visualization as CSV
  const handleExportVisualization = (id: number) => {
    const url = exportApi.exportVisualization(id);
    window.open(url, '_blank');
  };
  
  // Handle closing the full view mode
  const handleCloseViewMode = () => {
    setViewMode(false);
    setSelectedVisualization(null);
    setFullChartData(null);
  };
  
  // Render the full view mode component
  const renderFullView = () => {
    if (!selectedVisualization) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedVisualization.name}
            </h2>
            
            <div className="flex items-center space-x-2">
              <button 
                className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                onClick={() => handleExportVisualization(selectedVisualization.id)}
              >
                Export CSV
              </button>
              <button 
                className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                onClick={() => {
                  handleCloseViewMode();
                  handleEditVisualization(selectedVisualization);
                }}
              >
                Edit
              </button>
              <button
                className="p-2 text-slate-500 hover:text-slate-700"
                onClick={handleCloseViewMode}
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Chart container */}
          <div className="flex-1 overflow-hidden p-6">
            {fullChartLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">Loading visualization data...</p>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-red-600">{error}</p>
              </div>
            ) : fullChartData ? (
              <div className="h-full">
                <ChartRenderer 
                  type={selectedVisualization.type}
                  data={fullChartData}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-500">No visualization data available</p>
              </div>
            )}
          </div>
          
          {/* Footer with info */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <p>Table: <span className="font-medium">{selectedVisualization.table_name || 'Unknown'}</span></p>
            <p>Last updated: <span className="font-medium">{new Date(selectedVisualization.updated_at).toLocaleString()}</span></p>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Saved Visualizations</h1>
        <button
          className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors"
          onClick={() => navigate('/visualize')}
        >
          Create New Visualization
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-6 bg-white rounded-md border border-slate-200">
          <p className="text-slate-500">Loading visualizations...</p>
        </div>
      ) : visualizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visualizations.map(visualization => (
            <div 
              key={visualization.id} 
              className="bg-white p-6 rounded-md border border-slate-200 shadow-sm hover:shadow transition-shadow"
            >
              <div 
                className="h-48 bg-slate-50 mb-4 rounded flex items-center justify-center relative cursor-pointer"
                onClick={() => {
                  // Only allow viewing if connection_id and table_name exist
                  if (visualization.connection_id && visualization.table_name) {
                    handleViewVisualization(visualization);
                  } else {
                    toast.error("This visualization can't be viewed because it doesn't have a valid connection or table");
                  }
                }}
              >
                {previewLoading[visualization.id] ? (
                  <p className="text-slate-400">Loading preview...</p>
                ) : previewData[visualization.id] ? (
                  <ChartRenderer 
                    type={visualization.type}
                    data={previewData[visualization.id]!}
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-slate-400">{visualization.type.charAt(0).toUpperCase() + visualization.type.slice(1)} Chart</p>
                    {visualization.connection_id && visualization.table_name ? (
                      <button
                        className="mt-2 text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePreviewData(visualization);
                        }}
                      >
                        Load Preview
                      </button>
                    ) : (
                      <p className="mt-2 text-xs text-red-500">
                        Missing connection or table
                      </p>
                    )}
                  </div>
                )}
                
                {/* View overlay on hover - only show if connection and table exist */}
                {visualization.connection_id && visualization.table_name && (
                  <div className="absolute inset-0 bg-slate-900 bg-opacity-0 hover:bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded">
                    <span className="px-4 py-2 bg-white text-slate-900 font-medium rounded text-sm">
                      View Full Visualization
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-medium text-slate-900 mb-1">{visualization.name}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {visualization.type.charAt(0).toUpperCase() + visualization.type.slice(1)} chart 
                {visualization.table_name ? (
                  <> using <span className="font-medium">{visualization.table_name}</span> table</>
                ) : (
                  <> <span className="text-red-500">(missing table)</span></>
                )}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  className={`px-3 py-1.5 text-xs ${
                    visualization.connection_id && visualization.table_name
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  } rounded`}
                  onClick={() => {
                    if (visualization.connection_id && visualization.table_name) {
                      handleViewVisualization(visualization);
                    } else {
                      toast.error("This visualization can't be viewed because it doesn't have a valid connection or table");
                    }
                  }}
                >
                  View
                </button>
                <button 
                  className={`px-3 py-1.5 text-xs ${
                    visualization.connection_id && visualization.table_name
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-blue-50 text-blue-400 cursor-not-allowed'
                  } rounded`}
                  onClick={() => {
                    if (visualization.connection_id && visualization.table_name) {
                      handleEditVisualization(visualization);
                    } else {
                      toast.error("This visualization can't be edited because it doesn't have a valid connection or table");
                    }
                  }}
                >
                  Edit
                </button>
                <button 
                  className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100"
                  onClick={() => handleExportVisualization(visualization.id)}
                >
                  Export CSV
                </button>
                <button 
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                  onClick={() => handleDeleteVisualization(visualization.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-md border border-slate-200 text-center">
          <div className="mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-slate-500 mb-6">No saved visualizations yet</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors"
            onClick={() => navigate('/visualize')}
          >
            Create Your First Visualization
          </button>
        </div>
      )}
      
      {/* Render full view modal when in view mode */}
      {viewMode && renderFullView()}
    </div>
  )
}

export default SavedVisualizations