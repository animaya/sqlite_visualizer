import { FC } from 'react';
import { TableSchema, FieldMapping } from '../../types';

interface FieldMapperProps {
  schema: TableSchema | null;
  chartType: string;
  mappings: FieldMapping;
  onChange: (mappings: FieldMapping) => void;
}

/**
 * Field Mapper Component
 * 
 * Allows users to map table fields to chart elements (X-axis, Y-axis, etc.)
 */
const FieldMapper: FC<FieldMapperProps> = ({ schema, chartType, mappings, onChange }) => {
  if (!schema) {
    return <p className="text-slate-500">No schema available</p>;
  }
  
  // Define required mappings based on chart type
  const requiredMappings: Record<string, string[]> = {
    bar: ['x', 'y'],
    line: ['x', 'y'],
    pie: ['labels', 'values'],
    doughnut: ['labels', 'values'],
    scatter: ['x', 'y']
  };
  
  // Create human-readable names for mapping types
  const mappingLabels: Record<string, string> = {
    x: 'X-Axis',
    y: 'Y-Axis',
    labels: 'Labels',
    values: 'Values',
    size: 'Point Size',
    color: 'Color'
  };
  
  // Get required mappings for selected chart type
  const chartMappings = requiredMappings[chartType] || [];
  
  const handleMappingChange = (mappingType: string, field: string) => {
    const newMappings = {
      ...mappings,
      [mappingType]: field
    };
    
    onChange(newMappings);
  };
  
  return (
    <div className="space-y-4">
      {chartMappings.map((mappingType) => (
        <div key={mappingType} className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            {mappingLabels[mappingType]}
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
            value={mappings[mappingType] || ''}
            onChange={(e) => handleMappingChange(mappingType, e.target.value)}
          >
            <option value="">Select a field</option>
            {schema.columns && schema.columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      
      {/* Optional mappings based on chart type */}
      {chartType === 'scatter' && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Point Size (optional)
          </label>
          <select
            className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
            value={mappings.size || ''}
            onChange={(e) => handleMappingChange('size', e.target.value)}
          >
            <option value="">None</option>
            {schema.columns && schema.columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default FieldMapper;
