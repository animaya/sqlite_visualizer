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
  
  // Helper to heuristically score column names for specific fields
  const getColumnScore = (columnName: string, columnType: string, fieldName: string): number => {
    const colNameLower = columnName.toLowerCase();
    const fieldNameLower = fieldName.toLowerCase();
    let score = 0;
    
    // Direct name matches get highest score
    if (colNameLower === fieldNameLower) {
      score += 100;
    }
    
    // Partial name matches
    if (colNameLower.includes(fieldNameLower) || fieldNameLower.includes(colNameLower)) {
      score += 50;
    }
    
    // For x-axis and labels fields
    if (['x', 'labels', 'categories', 'dimension', 'group'].includes(fieldNameLower)) {
      // Common category column names
      if (colNameLower.includes('name') || 
          colNameLower.includes('category') || 
          colNameLower.includes('type') || 
          colNameLower.includes('department') ||
          colNameLower.includes('group') ||
          colNameLower.includes('class') ||
          colNameLower.includes('region')) {
        score += 30;
      }
      
      // Date columns are often good for x-axis
      if (isDateType(columnType)) {
        score += 25;
      }
      
      // String columns are good for labels
      if (isTextType(columnType)) {
        score += 20;
      }
      
      // ID columns are usually not good for labels
      if (colNameLower === 'id' || colNameLower.endsWith('_id')) {
        score -= 20;
      }
    }
    
    // For y-axis and values fields
    if (['y', 'values', 'metrics', 'measure', 'value'].includes(fieldNameLower)) {
      // Common metric column names
      if (colNameLower.includes('count') || 
          colNameLower.includes('total') || 
          colNameLower.includes('sum') || 
          colNameLower.includes('amount') ||
          colNameLower.includes('price') ||
          colNameLower.includes('cost') ||
          colNameLower.includes('revenue') ||
          colNameLower.includes('profit') ||
          colNameLower.includes('sales')) {
        score += 30;
      }
      
      // Numeric columns are essential for values
      if (isNumericType(columnType)) {
        score += 40;
      } else {
        // Non-numeric columns shouldn't be used for values
        score -= 50;
      }
    }
    
    return score;
  };
  
  // Determine which columns to recommend based on field name
  const getRecommendedColumns = (): ColumnInfo[] => {
    const fieldNameLower = field.name.toLowerCase();
    
    // Create a scored list of columns
    const scoredColumns = columns.map(col => ({
      ...col,
      score: getColumnScore(col.name, col.type, field.name)
    }));
    
    // Filter based on field type and score
    let relevantColumns: ColumnInfo[];
    
    // For x-axis, labels, categories, etc. - recommend text and date columns
    if (['x', 'labels', 'categories', 'dimension', 'group'].includes(fieldNameLower)) {
      relevantColumns = scoredColumns.filter(col => 
        col.isText || col.isDate || isTextType(col.type) || isDateType(col.type));
    }
    // For y-axis, values, metrics, etc. - recommend numeric columns
    else if (['y', 'values', 'metrics', 'measure', 'value'].includes(fieldNameLower)) {
      relevantColumns = scoredColumns.filter(col => col.isNumeric || isNumericType(col.type));
    }
    // For date fields - recommend date columns
    else if (['date', 'time', 'timestamp', 'datetime'].includes(fieldNameLower)) {
      relevantColumns = scoredColumns.filter(col => col.isDate || isDateType(col.type));
    }
    // Default case - use all columns
    else {
      relevantColumns = scoredColumns;
    }
    
    // Sort by score (highest first) and return
    return relevantColumns.sort((a, b) => (b as any).score - (a as any).score);
  };
  
  const recommendedColumns = getRecommendedColumns();
  
  // Find if there's a perfect match
  const perfectMatch = value ? 
    columns.find(col => col.name === value) : 
    (recommendedColumns.length > 0 && (recommendedColumns[0] as any).score >= 90) ? 
      recommendedColumns[0] : null;
  
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {perfectMatch && !value && (
          <button 
            className="text-xs text-blue-600 hover:text-blue-800"
            onClick={() => onChange(field.name, perfectMatch.name)}
            type="button"
          >
            Use best match: {perfectMatch.name}
          </button>
        )}
      </div>
      
      <select 
        className={`w-full px-3 py-2 border rounded-sm text-sm 
          ${value ? 'border-green-300 bg-green-50' : 'border-slate-300'} 
          ${field.required && !value ? 'border-amber-300 bg-amber-50' : ''}
          ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
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
            {recommendedColumns.slice(0, 5).map(col => (
              <option key={`rec-${col.name}`} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </optgroup>
        )}
        
        {/* Show all columns */}
        {columns.length > 5 && (
          <optgroup label="All Columns">
            {columns
              .filter(col => !recommendedColumns.slice(0, 5).some(rec => rec.name === col.name))
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
      
      {field.required && !value && (
        <p className="text-xs text-amber-600">This field is required</p>
      )}
      
      {value && (
        <p className="text-xs text-green-600">✓ Field mapped to "{value}"</p>
      )}
    </div>
  );
};

export default TemplateFieldMapper;
