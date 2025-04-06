import { FC, useState, useEffect } from 'react';
import { TableSchema, FieldMapping, ColumnInfo } from '../../types';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FieldMapperProps {
  schema: TableSchema | null;
  chartType: string;
  mappings: FieldMapping;
  onChange: (mappings: FieldMapping) => void;
}

// Type for aggregation functions
type AggregationFunction = 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count';

// Type for field mapping configurations
interface MappingConfig {
  id: string;
  label: string;
  description: string;
  required: boolean;
  preferredTypes: string[]; // Types that are ideal for this mapping (e.g., 'number', 'text', 'date')
  supportsAggregation: boolean;
}

/**
 * Field Mapper Component
 * 
 * An enhanced component for mapping table fields to chart elements with intelligent
 * recommendations, data type validation, and aggregation options.
 */
const FieldMapper: FC<FieldMapperProps> = ({ schema, chartType, mappings, onChange }) => {
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [aggregations, setAggregations] = useState<Record<string, AggregationFunction>>({});
  const [tooltips, setTooltips] = useState<Record<string, boolean>>({});
  
  // Reset aggregations when chart type changes
  useEffect(() => {
    setAggregations({});
  }, [chartType]);
  
  if (!schema) {
    return <p className="text-slate-500">No schema available</p>;
  }
  
  // Define mapping configurations by chart type
  const mappingConfigsByType: Record<string, MappingConfig[]> = {
    bar: [
      {
        id: 'x',
        label: 'X-Axis (Categories)',
        description: 'Categories to display on the horizontal axis. Usually text or dates.',
        required: true,
        preferredTypes: ['text', 'date', 'timestamp'],
        supportsAggregation: false
      },
      {
        id: 'y',
        label: 'Y-Axis (Values)',
        description: 'Numeric values to display on the vertical axis.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      },
      {
        id: 'color',
        label: 'Color (Optional)',
        description: 'Field to use for color differentiation between bars.',
        required: false,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      }
    ],
    line: [
      {
        id: 'x',
        label: 'X-Axis (Timeline)',
        description: 'Time or sequence field for the horizontal axis. Dates work best.',
        required: true,
        preferredTypes: ['date', 'timestamp', 'time', 'text', 'number'],
        supportsAggregation: false
      },
      {
        id: 'y',
        label: 'Y-Axis (Values)',
        description: 'Numeric values to track over time on the vertical axis.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      },
      {
        id: 'color',
        label: 'Series (Optional)',
        description: 'Field to split data into multiple lines.',
        required: false,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      }
    ],
    pie: [
      {
        id: 'labels',
        label: 'Segments',
        description: 'Categories to display as pie segments.',
        required: true,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      },
      {
        id: 'values',
        label: 'Values',
        description: 'Numeric values determining segment size.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      }
    ],
    doughnut: [
      {
        id: 'labels',
        label: 'Segments',
        description: 'Categories to display as doughnut segments.',
        required: true,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      },
      {
        id: 'values',
        label: 'Values',
        description: 'Numeric values determining segment size.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      }
    ],
    scatter: [
      {
        id: 'x',
        label: 'X-Axis (Horizontal)',
        description: 'Values for the horizontal axis, typically numeric.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: false
      },
      {
        id: 'y',
        label: 'Y-Axis (Vertical)',
        description: 'Values for the vertical axis, typically numeric.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: false
      },
      {
        id: 'size',
        label: 'Point Size (Optional)',
        description: 'Numeric field to determine the size of points.',
        required: false,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      },
      {
        id: 'color',
        label: 'Color (Optional)',
        description: 'Field to use for color grouping of points.',
        required: false,
        preferredTypes: ['text', 'category', 'number'],
        supportsAggregation: false
      }
    ],
    radar: [
      {
        id: 'labels',
        label: 'Categories',
        description: 'Categories to display around the radar chart.',
        required: true,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      },
      {
        id: 'values',
        label: 'Values',
        description: 'Numeric values determining the radar chart shape.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      },
      {
        id: 'series',
        label: 'Series (Optional)',
        description: 'Field to create multiple radar shapes.',
        required: false,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      }
    ],
    polarArea: [
      {
        id: 'labels',
        label: 'Segments',
        description: 'Categories to display as segments.',
        required: true,
        preferredTypes: ['text', 'category'],
        supportsAggregation: false
      },
      {
        id: 'values',
        label: 'Values',
        description: 'Numeric values determining segment size.',
        required: true,
        preferredTypes: ['number', 'integer', 'float', 'double', 'decimal'],
        supportsAggregation: true
      }
    ]
  };
  
  // Fallback to bar chart configs if chart type not found
  const activeConfigs = mappingConfigsByType[chartType] || mappingConfigsByType.bar;
  
  // Helper to check if a column is numeric
  const isNumeric = (column: ColumnInfo): boolean => {
    if (column.isNumeric) return true;
    const numericTypes = ['int', 'float', 'double', 'decimal', 'number', 'real', 'numeric'];
    return numericTypes.some(type => column.type.toLowerCase().includes(type));
  };
  
  // Helper to check if a column is date/time
  const isDateTime = (column: ColumnInfo): boolean => {
    if (column.isDate) return true;
    const dateTypes = ['date', 'time', 'timestamp', 'datetime'];
    return dateTypes.some(type => column.type.toLowerCase().includes(type));
  };
  
  // Helper to check if a column is text/category
  const isText = (column: ColumnInfo): boolean => {
    if (column.isText) return true;
    const textTypes = ['text', 'char', 'varchar', 'string', 'nvarchar'];
    return textTypes.some(type => column.type.toLowerCase().includes(type));
  };
  
  // Get recommended columns for a specific mapping
  const getRecommendedColumns = (mappingConfig: MappingConfig): ColumnInfo[] => {
    return schema.columns.filter(column => {
      // Check if column type matches any preferred type
      return mappingConfig.preferredTypes.some(type => {
        if (type === 'number' && isNumeric(column)) return true;
        if ((type === 'date' || type === 'timestamp' || type === 'time') && isDateTime(column)) return true;
        if ((type === 'text' || type === 'category') && isText(column)) return true;
        return column.type.toLowerCase().includes(type.toLowerCase());
      });
    });
  };
  
  // Handle field mapping change
  const handleMappingChange = (mappingType: string, field: string) => {
    // If field is cleared, also clear the aggregation
    if (!field && aggregations[mappingType]) {
      const newAggregations = { ...aggregations };
      delete newAggregations[mappingType];
      setAggregations(newAggregations);
    }
    
    const newMappings = {
      ...mappings,
      [mappingType]: field
    };
    
    onChange(newMappings);
  };
  
  // Handle aggregation change
  const handleAggregationChange = (mappingType: string, aggregation: AggregationFunction) => {
    const newAggregations = {
      ...aggregations,
      [mappingType]: aggregation
    };
    
    // If 'none' is selected, remove the aggregation
    if (aggregation === 'none') {
      delete newAggregations[mappingType];
    }
    
    setAggregations(newAggregations);
    
    // Update the mappings to include aggregation information
    // Format: fieldName|aggregation (e.g., "sales|sum")
    const currentField = mappings[mappingType] || '';
    const fieldName = currentField.includes('|') ? currentField.split('|')[0] : currentField;
    
    if (!fieldName) return; // Skip if no field selected
    
    const newFieldValue = aggregation === 'none' ? fieldName : `${fieldName}|${aggregation}`;
    handleMappingChange(mappingType, newFieldValue);
  };
  
  // Toggle tooltip visibility
  const toggleTooltip = (mappingType: string) => {
    setTooltips(prev => ({
      ...prev,
      [mappingType]: !prev[mappingType]
    }));
  };
  
  return (
    <div className="space-y-4">
      {/* Toggle for advanced mode */}
      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm text-primary flex items-center"
          onClick={() => setAdvancedMode(!advancedMode)}
        >
          {advancedMode ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Simple Mode
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Advanced Mode
            </>
          )}
        </button>
      </div>
      
      {/* Field Mapping UI */}
      {activeConfigs.map((config) => {
        // Skip optional mappings in simple mode
        if (!advancedMode && !config.required) return null;
        
        // Get recommended columns
        const recommendedColumns = getRecommendedColumns(config);
        const otherColumns = schema.columns.filter(col => 
          !recommendedColumns.some(rec => rec.name === col.name)
        );
        
        // Parse current mapping value to check for aggregation
        const currentValue = mappings[config.id] || '';
        const [fieldName, fieldAggregation] = currentValue.includes('|') 
          ? currentValue.split('|') 
          : [currentValue, 'none'];
        
        // Get current column if selected
        const selectedColumn = schema.columns.find(col => col.name === fieldName);
        
        return (
          <div key={config.id} className="space-y-1 p-3 border border-slate-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-slate-700">
                  {config.label}
                  {config.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <button
                  type="button"
                  className="ml-2 text-slate-400 hover:text-slate-600"
                  onClick={() => toggleTooltip(config.id)}
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Tooltip */}
            {tooltips[config.id] && (
              <div className="bg-slate-100 p-2 rounded-md text-xs text-slate-600 mb-2">
                {config.description}
                {config.preferredTypes.length > 0 && (
                  <div className="mt-1">
                    <span className="font-medium">Recommended data types: </span>
                    {config.preferredTypes.join(', ')}
                  </div>
                )}
              </div>
            )}
            
            {/* Field Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                  value={fieldName}
                  onChange={(e) => handleMappingChange(config.id, e.target.value)}
                >
                  <option value="">Select a field</option>
                  
                  {/* Show recommended columns first */}
                  {recommendedColumns.length > 0 && (
                    <optgroup label="Recommended Fields">
                      {recommendedColumns.map((column) => (
                        <option key={`rec-${column.name}`} value={column.name}>
                          {column.name} ({column.type})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {/* Show other columns */}
                  {otherColumns.length > 0 && (
                    <optgroup label="Other Fields">
                      {otherColumns.map((column) => (
                        <option key={`other-${column.name}`} value={column.name}>
                          {column.name} ({column.type})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              
              {/* Aggregation selector (only for numeric fields that support aggregation) */}
              {config.supportsAggregation && selectedColumn && isNumeric(selectedColumn) && (
                <div>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
                    value={fieldAggregation}
                    onChange={(e) => handleAggregationChange(config.id, e.target.value as AggregationFunction)}
                  >
                    <option value="none">No Aggregation</option>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="count">Count</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Field preview indicator - show if a field is selected */}
            {fieldName && (
              <div className="text-xs text-slate-500 mt-1">
                {selectedColumn && isNumeric(selectedColumn) && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Numeric
                  </span>
                )}
                
                {selectedColumn && isDateTime(selectedColumn) && (
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded ml-1">
                    Date/Time
                  </span>
                )}
                
                {selectedColumn && isText(selectedColumn) && (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded ml-1">
                    Text
                  </span>
                )}
                
                {fieldAggregation && fieldAggregation !== 'none' && (
                  <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded ml-1">
                    {fieldAggregation.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Helper text for required fields */}
      <div className="text-xs text-slate-500 flex items-center">
        <span className="text-red-500 mr-1">*</span> Required fields
      </div>
    </div>
  );
};

export default FieldMapper;
