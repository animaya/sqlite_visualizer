import { FC, useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Template, Connection, TableInfo, ColumnInfo, ChartData } from '../../types';
import { templateApi, connectionApi, tableApi } from '../../services/api';
import { TemplateFieldMapper } from './index';
import TemplatePreview from './TemplatePreview';

interface TemplateConfiguratorProps {
  onBack?: () => void;
}

/**
 * TemplateConfigurator Component
 * 
 * Allows users to configure templates for visualization
 */
const TemplateConfigurator: FC<TemplateConfiguratorProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const connectionId = searchParams.get('connection');
  
  // State for template configuration
  const [template, setTemplate] = useState<Template | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<ChartData | null>(null);
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [requiredFields, setRequiredFields] = useState<{name: string, label: string}[]>([]);
  const [optionalFields, setOptionalFields] = useState<{name: string, label: string}[]>([]);
  
  // Load template and connection data
  useEffect(() => {
    const fetchData = async () => {
      if (!templateId || !connectionId) {
        setError('Missing template ID or connection ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch template details
        const templateData = await templateApi.getById(templateId);
        setTemplate(templateData);
        
        // Determine required fields based on chart type
        const fieldsConfig = getFieldsForChartType(templateData.type);
        setRequiredFields(fieldsConfig.required);
        setOptionalFields(fieldsConfig.optional);
        
        // Initialize mappings from template config defaults
        const initialMappings: Record<string, string> = {};
        fieldsConfig.required.forEach(field => {
          initialMappings[field.name] = templateData.config.mappings?.[field.name] || '';
        });
        fieldsConfig.optional.forEach(field => {
          initialMappings[field.name] = templateData.config.mappings?.[field.name] || '';
        });
        setMappings(initialMappings);
        
        // Fetch connection details
        const connectionData = await connectionApi.getById(connectionId);
        setConnection(connectionData);
        
        // Fetch tables for this connection
        const tablesData = await tableApi.getAll(connectionId);
        setTables(tablesData.map(t => ({ name: t.name })));
        
        // Set default table if there is one in the template
        if (templateData.config.tableName && tablesData.some(t => t.name === templateData.config.tableName)) {
          setSelectedTable(templateData.config.tableName);
        } else if (tablesData.length > 0) {
          setSelectedTable(tablesData[0].name);
        }
        
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load template data';
        setError(errorMessage);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [templateId, connectionId]);
  
=======
  // When selected table changes, fetch table schema for column mapping
  useEffect(() => {
    const fetchTableSchema = async () => {
      if (!connectionId || !selectedTable) return;
      
      try {
        setError(null);
        
        // Show a loading message while fetching schema
        setColumns([]);
        
        const schema = await tableApi.getSchema(connectionId, selectedTable);
        if (!schema || !schema.columns || schema.columns.length === 0) {
          setError(`No columns found in table "${selectedTable}"`);
          return;
        }
        
        // Process and categorize columns
        const processedColumns = schema.columns.map(col => ({
          name: col.name,
          type: col.type,
          isNumeric: isNumericType(col.type),
          isText: isTextType(col.type),
          isDate: isDateType(col.type)
        }));
        
        setColumns(processedColumns);
        
        // Provide some automatic suggestions for mappings based on column types and template
        if (template) {
          const newMappings = { ...mappings };
          
          // For bar/line charts
          if (template.type.toLowerCase() === 'bar' || template.type.toLowerCase() === 'line') {
            // Find a text/date column for x-axis
            if (!newMappings.x) {
              const textColumn = processedColumns.find(col => col.isText || col.isDate);
              if (textColumn) {
                newMappings.x = textColumn.name;
              }
            }
            
            // Find a numeric column for y-axis
            if (!newMappings.y) {
              const numericColumn = processedColumns.find(col => col.isNumeric);
              if (numericColumn) {
                newMappings.y = numericColumn.name;
              }
            }
          } 
          // For pie/doughnut charts
          else if (template.type.toLowerCase() === 'pie' || template.type.toLowerCase() === 'doughnut') {
            // Find a text column for labels
            if (!newMappings.labels) {
              const textColumn = processedColumns.find(col => col.isText);
              if (textColumn) {
                newMappings.labels = textColumn.name;
              }
            }
            
            // Find a numeric column for values
            if (!newMappings.values) {
              const numericColumn = processedColumns.find(col => col.isNumeric);
              if (numericColumn) {
                newMappings.values = numericColumn.name;
              }
            }
          }
          
          // Update mappings if we made any changes
          if (JSON.stringify(newMappings) !== JSON.stringify(mappings)) {
            setMappings(newMappings);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load table schema';
        setError(errorMessage);
      }
    };
    
    fetchTableSchema();
  }, [connectionId, selectedTable, template]);
  
  // Generate preview data when mappings or selected table changes
  useEffect(() => {
    const generatePreview = async () => {
      if (!template || !connectionId || !selectedTable) return;
      
      // Check if all required fields are mapped
      const requiredMappingsMissing = requiredFields.some(field => !mappings[field.name]);
      if (requiredMappingsMissing) {
        return;
      }
      
      try {
        setPreviewLoading(true);
        
        // Apply template with current mappings
        const result = await templateApi.apply(template.id, {
          connectionId: Number(connectionId),
          tableNames: [selectedTable],
          mappings
        });
        
        setPreviewData(result.data as ChartData);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
        setError(errorMessage);
      } finally {
        setPreviewLoading(false);
      }
    };
    
    // Debounce preview generation
    const timer = setTimeout(() => {
      generatePreview();
    }, 800);
    
    return () => clearTimeout(timer);
  }, [mappings, connectionId, selectedTable, template, requiredFields]);
  
  // Handle field mapping changes
  const handleMappingChange = (fieldName: string, columnName: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldName]: columnName
    }));
  };
  
  // Handle table selection change
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    
    // Reset mappings when table changes
    const resetMappings: Record<string, string> = {};
    Object.keys(mappings).forEach(key => {
      resetMappings[key] = '';
    });
    setMappings(resetMappings);
  };
  
=======
  // Apply template and save visualization
  const handleApplyTemplate = async () => {
    if (!template || !connectionId || !selectedTable) {
      setError('Missing required configuration');
      return;
    }
    
    // Validate that all required fields are mapped
    const requiredMappingsMissing = requiredFields.some(field => !mappings[field.name]);
    if (requiredMappingsMissing) {
      setError('Please map all required fields');
      return;
    }
    
    // Show specific validation messages for each required field
    for (const field of requiredFields) {
      if (!mappings[field.name]) {
        setError(`Please select a value for "${field.label}"`);
        return;
      }
    }
    
    try {
      setLoading(true);
      
      // Apply template to get visualization data
      const result = await templateApi.apply(template.id, {
        connectionId: Number(connectionId),
        tableNames: [selectedTable],
        mappings
      });
      
      // Check if the result has valid data
      if (!result.data || 
          !result.data.labels || 
          !result.data.datasets || 
          result.data.labels.length === 0 || 
          result.data.datasets.length === 0) {
        setError('The template did not generate any visualization data. Please try different field mappings or another table.');
        setLoading(false);
        return;
      }
      
      // Redirect to visualization builder with the data
      navigate(`/visualize?template=${template.id}&connection=${connectionId}&table=${selectedTable}`, {
        state: {
          templateResult: result,
          mappings,
          sourceName: template.name
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply template';
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  // Helper to check if a column type is numeric
  const isNumericType = (type: string): boolean => {
    return /int|float|double|decimal|number|real/i.test(type);
  };
  
  // Helper to check if a column type is text
  const isTextType = (type: string): boolean => {
    return /text|char|string|var/i.test(type);
  };
  
  // Helper to check if a column type is a date
  const isDateType = (type: string): boolean => {
    return /date|time/i.test(type);
  };
  
  // Get required and optional fields based on chart type
  const getFieldsForChartType = (chartType: string): { 
    required: {name: string, label: string}[], 
    optional: {name: string, label: string}[] 
  } => {
    switch (chartType) {
      case 'bar':
      case 'line':
        return {
          required: [
            { name: 'x', label: 'X-Axis (Categories)' },
            { name: 'y', label: 'Y-Axis (Values)' }
          ],
          optional: [
            { name: 'groupBy', label: 'Group By' },
            { name: 'sort', label: 'Sort Direction' },
            { name: 'limit', label: 'Limit Results' }
          ]
        };
      case 'pie':
      case 'doughnut':
        return {
          required: [
            { name: 'labels', label: 'Labels (Categories)' },
            { name: 'values', label: 'Values (Sizes)' }
          ],
          optional: [
            { name: 'limit', label: 'Limit Results' }
          ]
        };
      default:
        return { required: [], optional: [] };
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-md border border-slate-200">
        <p className="text-center text-slate-500">Loading template configuration...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-6 bg-white rounded-md border border-slate-200">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
        <div className="mt-4 flex justify-center">
          <button 
            className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium text-sm hover:bg-slate-200"
            onClick={() => navigate('/templates')}
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }
  
  // Render if no template found
  if (!template || !connection) {
    return (
      <div className="p-6 bg-white rounded-md border border-slate-200">
        <p className="text-center text-slate-500">Template or connection not found</p>
        <div className="mt-4 flex justify-center">
          <button 
            className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium text-sm hover:bg-slate-200"
            onClick={() => navigate('/templates')}
          >
            Back to Templates
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900">Configure "{template.name}" Template</h1>
        <button 
          className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded font-medium text-sm hover:bg-slate-200"
          onClick={() => onBack ? onBack() : navigate('/templates')}
        >
          Back
        </button>
      </div>
      
      {/* Template Info */}
      <div className="bg-white p-6 rounded-md border border-slate-200">
        <div className="flex items-center mb-4">
          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded mr-2">
            {template.type} Chart
          </span>
          {template.category && (
            <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded">
              {template.category}
            </span>
          )}
        </div>
        
        <p className="text-sm text-slate-500 mb-4">{template.description}</p>
        
        <h3 className="text-lg font-medium text-slate-900 mb-2">Database Connection</h3>
        <p className="text-sm text-slate-700">{connection.name}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-white p-6 rounded-md border border-slate-200">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Configure Data Source</h2>
          
          {/* Table Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Table</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
              value={selectedTable}
              onChange={(e) => handleTableChange(e.target.value)}
              disabled={tables.length === 0}
            >
              {tables.length === 0 && (
                <option value="">No tables available</option>
              )}
              {tables.map((table) => (
                <option key={table.name} value={table.name}>
                  {table.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Field Mappings */}
          <div className="space-y-4">
            <h3 className="text-md font-medium text-slate-800">Required Field Mappings</h3>
            
            {requiredFields.map((field) => (
              <TemplateFieldMapper
                key={field.name}
                field={{...field, required: true}}
                columns={columns}
                value={mappings[field.name] || ''}
                onChange={handleMappingChange}
                disabled={columns.length === 0}
                className="mb-4"
              />
            ))}
            
            {optionalFields.length > 0 && (
              <>
                <h3 className="text-md font-medium text-slate-800 mt-6">Optional Field Mappings</h3>
                
                {optionalFields.map((field) => {
                  // For special fields like sort and limit, create custom components
                  if (field.name === 'sort') {
                    return (
                      <div key={field.name} className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {field.label}
                        </label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                          value={mappings[field.name] || ''}
                          onChange={(e) => handleMappingChange(field.name, e.target.value)}
                        >
                          <option value="">No sorting</option>
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    );
                  } else if (field.name === 'limit') {
                    return (
                      <div key={field.name} className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {field.label}
                        </label>
                        <select 
                          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                          value={mappings[field.name] || ''}
                          onChange={(e) => handleMappingChange(field.name, e.target.value)}
                        >
                          <option value="">Default (10)</option>
                          <option value="5">5 results</option>
                          <option value="10">10 results</option>
                          <option value="20">20 results</option>
                          <option value="50">50 results</option>
                          <option value="100">100 results</option>
                        </select>
                      </div>
                    );
                  } else {
                    return (
                      <TemplateFieldMapper
                        key={field.name}
                        field={field}
                        columns={columns}
                        value={mappings[field.name] || ''}
                        onChange={handleMappingChange}
                        disabled={columns.length === 0}
                        className="mb-4"
                      />
                    );
                  }
                })}
              </>
            )}
          </div>
          
          {/* Apply Button */}
          <div className="mt-6">
            <button 
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleApplyTemplate}
              disabled={
                !selectedTable || 
                requiredFields.some(field => !mappings[field.name]) ||
                loading
              }
            >
              Apply Template
            </button>
          </div>
        </div>
        
        {/* Preview Panel */}
        <div className="bg-white p-6 rounded-md border border-slate-200">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Preview</h2>
          
          {template && (
            <TemplatePreview
              template={template}
              previewData={previewData}
              isLoading={previewLoading}
              error={
                columns.length === 0 ? null :
                requiredFields.some(field => !mappings[field.name]) ? 
                'Map all required fields to see a preview' : 
                error
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateConfigurator;
