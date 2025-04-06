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
    // Navigate to visualization builder with this visualization loaded in view mode
    navigate(`/visualize?view=${id}`);
  };
  
  const handleEditVisualization = (id: string | number) => {
    // Navigate to visualization builder with this visualization loaded
    navigate(`/visualize?edit=${id}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <svg className="w-8 h-8 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
          Saved Visualizations
        </h1>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center"
          onClick={() => navigate('/visualize')}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Create New Visualization
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm text-red-700 animate-fadeIn mb-6">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-slate-100">
          <div className="flex justify-center mb-4">
            <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-500 font-medium">Loading visualizations...</p>
        </div>
      ) : visualizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visualizations.map((visualization) => (
            <div key={visualization.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
              <div className="h-48 bg-gradient-to-br from-slate-50 to-slate-100 mb-4 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:from-indigo-50 group-hover:to-slate-100 transition-colors duration-300">
                {/* Chart type icon based on visualization type */}
                {visualization.type === 'bar' && (
                  <svg className="w-16 h-16 text-slate-300 group-hover:text-indigo-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                )}
                {visualization.type === 'line' && (
                  <svg className="w-16 h-16 text-slate-300 group-hover:text-indigo-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                  </svg>
                )}
                {(visualization.type === 'pie' || visualization.type === 'doughnut') && (
                  <svg className="w-16 h-16 text-slate-300 group-hover:text-indigo-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
                  </svg>
                )}
                {visualization.type === 'scatter' && (
                  <svg className="w-16 h-16 text-slate-300 group-hover:text-indigo-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 11V9a2 2 0 00-2-2m2 4v4a2 2 0 104 0v-1m-4-3H9m2 0h4m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                )}
                {!['bar', 'line', 'pie', 'doughnut', 'scatter'].includes(visualization.type) && (
                  <svg className="w-16 h-16 text-slate-300 group-hover:text-indigo-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate group-hover:text-indigo-700 transition-colors duration-300">{visualization.name}</h3>
              <p className="text-sm text-slate-500 mb-4 truncate">
                <span className="capitalize">{visualization.type}</span> chart • {visualization.tableName} data
              </p>
              <div className="flex space-x-2">
                <button 
                  className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors duration-200 flex items-center"
                  onClick={() => handleViewVisualization(visualization.id)}
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                  View
                </button>
                <button 
                  className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors duration-200 flex items-center"
                  onClick={() => handleEditVisualization(visualization.id)}
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  Edit
                </button>
                <button 
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors duration-200 flex items-center"
                  onClick={() => handleDeleteVisualization(visualization.id)}
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No visualizations yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Create your first visualization to start analyzing your data with beautiful charts and insights.</p>
          <button
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center mx-auto"
            onClick={() => navigate('/visualize')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Create Your First Visualization
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedVisualizations;
