import { 
  ArrowLeftRight, 
  ArrowUpDown, 
  Tags, 
  Hash, 
  CircleDot, 
  Palette,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ColumnSchema {
  name: string;
  type?: string;
  jsType?: string;
  isNumeric?: boolean;
  isDate?: boolean;
  isText?: boolean;
}

interface TableSchema {
  columns: ColumnSchema[];
  tableName?: string;
}

interface FieldMappings {
  x?: string;
  y?: string;
  labels?: string;
  values?: string;
  size?: string;
  color?: string;
  [key: string]: string | undefined;
}

interface FieldMapperProps {
  schema: TableSchema | null;
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  mappings: FieldMappings;
  onChange: (mappings: FieldMappings) => void;
  disabled?: boolean;
}

/**
 * Field Mapper Component
 * 
 * Allows users to map table fields to chart elements (X-axis, Y-axis, etc.)
 * with additional features like type checking and recommendations
 */
function FieldMapper({ schema, chartType, mappings, onChange, disabled = false }: FieldMapperProps) {
  if (!schema) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-center">
        <p className="text-sm text-slate-500">No schema available</p>
      </div>
    );
  }
  
  // Define required mappings based on chart type
  const requiredMappings: Record<string, string[]> = {
    bar: ['x', 'y'],
    line: ['x', 'y'],
    pie: ['labels', 'values'],
    doughnut: ['labels', 'values'],
    scatter: ['x', 'y']
  };
  
  // Create human-readable names for mapping types with icons
  const mappingConfig: Record<string, { label: string; icon: JSX.Element; description: string; recommended: string[] }> = {
    x: { 
      label: 'X-Axis', 
      icon: <ArrowLeftRight className="w-4 h-4" />,
      description: 'Categories or independent variable',
      recommended: ['text', 'varchar', 'char', 'date']
    },
    y: { 
      label: 'Y-Axis', 
      icon: <ArrowUpDown className="w-4 h-4" />,
      description: 'Values or dependent variable',
      recommended: ['int', 'float', 'double', 'decimal', 'number']
    },
    labels: { 
      label: 'Labels', 
      icon: <Tags className="w-4 h-4" />,
      description: 'Categories for pie/doughnut segments',
      recommended: ['text', 'varchar', 'char']
    },
    values: { 
      label: 'Values', 
      icon: <Hash className="w-4 h-4" />,
      description: 'Numeric values for pie/doughnut segments',
      recommended: ['int', 'float', 'double', 'decimal', 'number']
    },
    size: { 
      label: 'Point Size', 
      icon: <CircleDot className="w-4 h-4" />,
      description: 'Controls the size of scatter plot points',
      recommended: ['int', 'float', 'double', 'decimal', 'number']
    },
    color: { 
      label: 'Color', 
      icon: <Palette className="w-4 h-4" />,
      description: 'Category to determine point/segment colors',
      recommended: ['text', 'varchar', 'char', 'boolean']
    }
  };
  
  // Get required mappings for selected chart type
  const chartMappings = requiredMappings[chartType] || [];
  
  // Check if a column is recommended for a mapping type
  const isRecommendedField = (mappingType: string, column: ColumnSchema): boolean => {
    if (!column.type && !column.jsType) return false;
    
    const config = mappingConfig[mappingType];
    if (!config || !config.recommended) return false;
    
    const columnType = (column.type || column.jsType || '').toLowerCase();
    
    return config.recommended.some(recType => 
      columnType.includes(recType) || 
      (recType === 'text' && column.isText) ||
      (recType === 'number' && column.isNumeric) ||
      (recType === 'date' && column.isDate)
    );
  };
  
  // Check if a mapping is valid
  const isValidMapping = (mappingType: string, columnName: string): boolean => {
    if (!columnName) return false;
    
    const column = schema.columns.find(col => col.name === columnName);
    if (!column) return false;
    
    // For Y-axis, values, and size, they should generally be numeric
    if (['y', 'values', 'size'].includes(mappingType)) {
      return column.isNumeric || 
        (column.type?.toLowerCase().includes('int') || false) ||
        (column.type?.toLowerCase().includes('float') || false) ||
        (column.type?.toLowerCase().includes('double') || false) ||
        (column.type?.toLowerCase().includes('decimal') || false) ||
        (column.type?.toLowerCase().includes('number') || false);
    }
    
    return true;
  };
  
  const handleMappingChange = (mappingType: string, field: string) => {
    if (disabled) return;
    
    const newMappings = {
      ...mappings,
      [mappingType]: field || undefined
    };
    
    onChange && onChange(newMappings);
  };
  
  // Sort columns to show recommended ones first for a mapping type
  const getSortedColumns = (mappingType: string): ColumnSchema[] => {
    if (!schema.columns) return [];
    
    return [...schema.columns].sort((a, b) => {
      const aRecommended = isRecommendedField(mappingType, a);
      const bRecommended = isRecommendedField(mappingType, b);
      
      if (aRecommended && !bRecommended) return -1;
      if (!aRecommended && bRecommended) return 1;
      return a.name.localeCompare(b.name);
    });
  };
  
  // Check if all required mappings are filled
  const allRequiredMappingsFilled = (): boolean => {
    return chartMappings.every(mappingType => !!mappings[mappingType]);
  };
  
  // Check if all mappings are valid
  const allMappingsValid = (): boolean => {
    return Object.entries(mappings).every(([type, value]) => 
      !value || isValidMapping(type, value)
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Required mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900">Required Fields</h3>
          {!allRequiredMappingsFilled() && (
            <div className="flex items-center gap-1 text-amber-500 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>All required fields must be mapped</span>
            </div>
          )}
        </div>
        
        {chartMappings.map((mappingType) => (
          <div key={mappingType} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                {mappingConfig[mappingType]?.icon}
                {mappingConfig[mappingType]?.label || mappingType}
                <div className="relative group">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                    {mappingConfig[mappingType]?.description}
                  </div>
                </div>
              </label>
              {!mappings[mappingType] && (
                <span className="text-xs text-amber-500">Required</span>
              )}
            </div>
            
            <select
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                ${!mappings[mappingType] 
                  ? 'border-amber-300 bg-amber-50' 
                  : !isValidMapping(mappingType, mappings[mappingType] || '')
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-300'
                }
                ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}
              `}
              value={mappings[mappingType] || ''}
              onChange={(e) => handleMappingChange(mappingType, e.target.value)}
              disabled={disabled}
            >
              <option value="">Select a field</option>
              {getSortedColumns(mappingType).map((column) => (
                <option 
                  key={column.name} 
                  value={column.name}
                  className={isRecommendedField(mappingType, column) ? 'font-medium' : ''}
                >
                  {column.name} {isRecommendedField(mappingType, column) ? '(Recommended)' : ''}
                </option>
              ))}
            </select>
            
            {mappings[mappingType] && !isValidMapping(mappingType, mappings[mappingType] || '') && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This field may not be appropriate for {mappingConfig[mappingType]?.label.toLowerCase()}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {/* Optional mappings */}
      {(['scatter'].includes(chartType) || chartType === 'bar') && (
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-900">Optional Fields</h3>
          
          {/* Size mapping for scatter plots */}
          {chartType === 'scatter' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  {mappingConfig['size']?.icon}
                  {mappingConfig['size']?.label}
                  <div className="relative group">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                      {mappingConfig['size']?.description}
                    </div>
                  </div>
                </label>
                <span className="text-xs text-slate-500">Optional</span>
              </div>
              
              <select
                className={`w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  ${mappings['size'] && !isValidMapping('size', mappings['size'] || '') 
                    ? 'border-red-300 bg-red-50'
                    : ''
                  }
                  ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}
                `}
                value={mappings['size'] || ''}
                onChange={(e) => handleMappingChange('size', e.target.value)}
                disabled={disabled}
              >
                <option value="">None</option>
                {getSortedColumns('size').map((column) => (
                  <option 
                    key={column.name} 
                    value={column.name}
                    className={isRecommendedField('size', column) ? 'font-medium' : ''}
                  >
                    {column.name} {isRecommendedField('size', column) ? '(Recommended)' : ''}
                  </option>
                ))}
              </select>
              
              {mappings['size'] && !isValidMapping('size', mappings['size'] || '') && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  This field may not be appropriate for point sizes
                </p>
              )}
            </div>
          )}
          
          {/* Color mapping for all chart types */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                {mappingConfig['color']?.icon}
                {mappingConfig['color']?.label}
                <div className="relative group">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                    {mappingConfig['color']?.description}
                  </div>
                </div>
              </label>
              <span className="text-xs text-slate-500">Optional</span>
            </div>
            
            <select
              className={`w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}
              `}
              value={mappings['color'] || ''}
              onChange={(e) => handleMappingChange('color', e.target.value)}
              disabled={disabled}
            >
              <option value="">None (use default colors)</option>
              {getSortedColumns('color').map((column) => (
                <option 
                  key={column.name} 
                  value={column.name}
                  className={isRecommendedField('color', column) ? 'font-medium' : ''}
                >
                  {column.name} {isRecommendedField('color', column) ? '(Recommended)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Validation summary */}
      {!allRequiredMappingsFilled() && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Please select fields for all required mappings to generate the chart.</span>
          </p>
        </div>
      )}
      
      {allRequiredMappingsFilled() && !allMappingsValid() && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Some selected fields may not be appropriate for their mappings. Your chart may not display correctly.</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default FieldMapper;
