import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Connection, Template } from '../types';
import { connectionApi, templateApi } from '../services/api';
import TemplateList from '../components/templates/TemplateList';

/**
 * Templates Page
 * 
 * Displays and applies pre-configured insight templates
 */
const Templates: FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  
  // Load the last selected connection from localStorage if available
  useEffect(() => {
    const savedConnection = localStorage.getItem('selectedConnection');
    if (savedConnection) {
      setSelectedConnection(savedConnection);
    }
  }, []);
  
  // Save selected connection to localStorage when it changes
  useEffect(() => {
    if (selectedConnection) {
      localStorage.setItem('selectedConnection', selectedConnection);
    }
  }, [selectedConnection]);
  
  useEffect(() => {
    // Fetch templates and connections from API
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [templatesData, connectionsData, categoriesData] = await Promise.all([
          templateApi.getAll(),
          connectionApi.getAll(),
          templateApi.getCategories()
        ]);
        
        // Ensure we always have arrays even if API returns null or undefined
        const safeTemplatesData = Array.isArray(templatesData) ? templatesData : [];
        const safeConnectionsData = Array.isArray(connectionsData) ? connectionsData : [];
        const safeCategoriesData = Array.isArray(categoriesData) ? categoriesData : [];
        
        setTemplates(safeTemplatesData);
        setFilteredTemplates(safeTemplatesData);
        setConnections(safeConnectionsData);
        setCategories(safeCategoriesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching templates data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        // Initialize with empty arrays on error
        setTemplates([]);
        setFilteredTemplates([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Apply filters when templates, category, or search term changes
  useEffect(() => {
    let filtered = [...templates];
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(term) || 
        (template.description && template.description.toLowerCase().includes(term))
      );
    }
    
    setFilteredTemplates(filtered);
  }, [templates, selectedCategory, searchTerm]);
  
  const handleApplyTemplate = (templateId: string | number) => {
    if (!selectedConnection) {
      setError('Please select a connection first');
      return;
    }
    
    // Navigate to a template configuration page
    navigate(`/templates/${templateId}/apply?connection=${selectedConnection}`);
  };
  
  const handleClearFilters = () => {
    setSelectedCategory('');
    setSearchTerm('');
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Insight Templates</h1>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}
      
      {/* Connection Selector */}
      <div className="bg-white p-6 rounded-md border border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Select Database Connection</h2>
        <select 
          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
          value={selectedConnection || ''}
          onChange={(e) => setSelectedConnection(e.target.value)}
          disabled={loading || connections.length === 0}
        >
          <option value="">Select a connection</option>
          {connections.map((connection) => (
            <option key={connection.id} value={connection.id.toString()}>
              {connection.name}
            </option>
          ))}
        </select>
        {!selectedConnection && (
          <p className="mt-2 text-sm text-slate-500">
            Please select a database connection to apply templates
          </p>
        )}
      </div>
      
      {/* Filter Controls */}
      <div className="bg-white p-6 rounded-md border border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Filter Templates</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={loading || !categories || categories.length === 0}
            >
              <option value="">All Categories</option>
              {categories && categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          {/* Search Box */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Search
            </label>
            <input 
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              disabled={loading}
            />
          </div>
        </div>
        
        {/* Filter Status */}
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            Showing {filteredTemplates?.length || 0} of {templates?.length || 0} templates
          </p>
          
          {(selectedCategory || searchTerm) && (
            <button 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Templates List */}
      <TemplateList 
        templates={filteredTemplates}
        selectedConnectionId={selectedConnection}
        onApplyTemplate={handleApplyTemplate}
        isLoading={loading}
      />
    </div>
  );
};

export default Templates;