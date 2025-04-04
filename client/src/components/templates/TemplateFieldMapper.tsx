import { FC } from 'react';
import { ColumnInfo } from '../../types';

interface FieldDefinition {
  name: string;
  label: string;
  required?: boolean;
  description?: string;
}

interface TemplateFieldMapperProps {
  field: FieldDefinition;
  columns: ColumnInfo[];
  value: string;
  onChange: (fieldName: string, columnName: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * TemplateFieldMapper Component
 * 
 * Maps template fields to database columns with intelligent suggestions
 */
const TemplateFieldMapper: FC<TemplateFieldMapperProps> = ({
  field,
  columns,
  value,
  onChange,
  disabled = false,
  className = ''
}) => {
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
  
  // Determine which columns to recommend based on field name
  const getRecommendedColumns = (): ColumnInfo[] => {
    const fieldNameLower = field.name.toLowerCase();
    
    // For x-axis, labels, categories, etc. - recommend text and date columns
    if (['x', 'labels', 'categories', 'dimension', 'group'].includes(fieldNameLower)) {
      return columns.filter(col => col.isText || col.isDate || isTextType(col.type) || isDateType(col.type));
    }
    
    // For y-axis, values, metrics, etc. - recommend numeric columns
    if (['y', 'values', 'metrics', 'measure', 'value'].includes(fieldNameLower)) {
      return columns.filter(col => col.isNumeric || isNumericType(col.type));
    }
    
    // For date fields - recommend date columns
    if (['date', 'time', 'timestamp', 'datetime'].includes(fieldNameLower)) {
      return columns.filter(col => col.isDate || isDateType(col.type));
    }
    
    // Default case - return all columns
    return columns;
  };
  
  const recommendedColumns = getRecommendedColumns();
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      
      <select 
        className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm"
        value={value || ''}
        onChange={(e) => onChange(field.name, e.target.value)}
        disabled={disabled || columns.length === 0}
      >
        <option value="">
          {columns.length === 0 ? 'No columns available' : `Select a column for ${field.label}`}
        </option>
        
        {/* Show recommended columns first if they exist */}
        {recommendedColumns.length > 0 && (
          <optgroup label="Recommended Columns">
            {recommendedColumns.map(col => (
              <option key={`rec-${col.name}`} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </optgroup>
        )}
        
        {/* Show all columns */}
        {columns.length > recommendedColumns.length && (
          <optgroup label="All Columns">
            {columns
              .filter(col => !recommendedColumns.some(rec => rec.name === col.name))
              .map(col => (
                <option key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </option>
              ))}
          </optgroup>
        )}
      </select>
      
      {field.description && (
        <p className="text-xs text-slate-500">{field.description}</p>
      )}
    </div>
  );
};

export default TemplateFieldMapper;
