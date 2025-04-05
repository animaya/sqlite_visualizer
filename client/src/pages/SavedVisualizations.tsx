import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Visualization } from '../types';
import { visualizationApi, exportApi } from '../services/api';

/**
 * Saved Visualizations Page
 * 
 * Displays and manages saved visualizations
 */
const SavedVisualizations: FC = () => {
  const navigate = useNavigate();
  const [visualizations, setVisualizations] = useState<Visualization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch saved visualizations from API
    const fetchVisualizations = async () => {
      try {
        setLoading(true);
        const data = await visualizationApi.getAll();
        // Transform the API data to match the expected Visualization type
        const formattedData: Visualization[] = data.map(item => {
          // Handle config safely
          let config = {};
          try {
            config = typeof item.config === 'string' ? JSON.parse(item.config) : (item.config || {});
          } catch (parseError) {
            console.error(`Error parsing config for visualization ${item.id}:`, parseError);
          }
          
          return {
            id: item.id,
            name: item.name,
            type: item.type,
            connectionId: item.connectionId || item.connection_id || 0,
            tableName: item.tableName || item.table_name || '',
            config,
            createdAt: item.createdAt || item.created_at,
            updatedAt: item.updatedAt || item.updated_at
          };
        });
        setVisualizations(formattedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load visualizations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisualizations();
  }, []);
  
  const handleDeleteVisualization = async (id: string | number) => {
    try {
      await visualizationApi.delete(id.toString());
      setVisualizations(visualizations.filter(viz => viz.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete visualization');
    }
  };
  
  const handleViewVisualization = (id: string | number) => {
    // Navigate to a separate view page or show a modal
    // For now, we'll simply alert
    alert(`Viewing visualization ${id}`);
  };
  
  const handleEditVisualization = (id: string | number) => {
    // Navigate to visualization builder with this visualization loaded
    navigate(`/visualize?edit=${id}`);
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
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-6">
          <p className="text-slate-500">Loading visualizations...</p>
        </div>
      ) : visualizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visualizations.map((visualization) => (
            <div key={visualization.id} className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
              <div className="h-48 bg-slate-100 mb-4 rounded flex items-center justify-center">
                {/* --- Visualization Preview Placeholder ---
                    Currently, this is just a static placeholder.
                    TODO: Implement actual chart previews. Considerations:
                    1. Fetch sample data via visualizationApi.getSampleData on demand? (Potential performance issue with many charts)
                    2. Generate and cache preview images/data on the backend when saving? (More complex but performant)
                    3. Use lazy loading (Intersection Observer) to load previews only when visible.
                --- */}
                <span className="text-slate-400">Chart Preview</span>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">{visualization.name}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {visualization.type} chart showing {visualization.tableName} data
              </p>
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                  onClick={() => handleViewVisualization(visualization.id)}
                >
                  View
                </button>
                <button 
                  className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  onClick={() => handleEditVisualization(visualization.id)}
                >
                  Edit
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
        <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
          <p className="text-slate-500 mb-4">No saved visualizations yet</p>
          <button
            className="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark transition-colors"
            onClick={() => navigate('/visualize')}
          >
            Create Your First Visualization
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedVisualizations;
