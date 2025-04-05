import { FC, useState } from 'react';
import { Download, ChevronDown, FileText, FileJson } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
}

export interface ExportButtonProps {
  /**
   * Type of export (table or visualization)
   */
  type: 'table' | 'visualization';
  
  /**
   * ID of the connection (for table exports)
   */
  connectionId?: number;
  
  /**
   * Table name (for table exports)
   */
  tableName?: string;
  
  /**
   * Visualization ID (for visualization exports)
   */
  visualizationId?: number;
  
  /**
   * Filters to apply to table export
   */
  filters?: Record<string, any>;
  
  /**
   * Sort configuration for table export
   */
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  
  /**
   * Max rows to export (for table exports)
   */
  limit?: number;
  
  /**
   * CSS classes for the button
   */
  className?: string;
  
  /**
   * Whether to include schema metadata (for JSON exports)
   */
  includeSchema?: boolean;
}

/**
 * ExportButton Component
 * 
 * A dropdown button that allows exporting data in various formats.
 * Supports exporting both tables and visualizations.
 */
const ExportButton: FC<ExportButtonProps> = ({
  type,
  connectionId,
  tableName,
  visualizationId,
  filters = {},
  sort,
  limit = 1000,
  className = '',
  includeSchema = true
}) => {
  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Available export formats
  const formats: ExportFormat[] = [
    { id: 'csv', name: 'CSV (Comma Separated Values)', extension: 'csv', mimeType: 'text/csv' },
    { id: 'json', name: 'JSON (JavaScript Object Notation)', extension: 'json', mimeType: 'application/json' }
  ];
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Close dropdown
  const closeDropdown = () => {
    setIsOpen(false);
  };
  
  // Handle export
  const handleExport = async (format: ExportFormat) => {
    closeDropdown();
    setIsExporting(true);
    
    try {
      // Build export URL based on type
      let url = `${API_BASE_URL}/export/${format.id}`;
      
      if (type === 'visualization' && visualizationId) {
        // Visualization export
        url = `${url}/${visualizationId}`;
      } else if (type === 'table' && connectionId && tableName) {
        // Table export
        url = `${url}/table/${connectionId}/${tableName}`;
        
        // Add query parameters for filtering, sorting, and pagination
        const queryParams = new URLSearchParams();
        
        // Add limit
        if (limit) {
          queryParams.append('limit', limit.toString());
        }
        
        // Add filters if any
        if (Object.keys(filters).length > 0) {
          queryParams.append('filter', JSON.stringify(filters));
        }
        
        // Add sort if any
        if (sort && sort.column) {
          queryParams.append('sort', JSON.stringify({
            column: sort.column,
            direction: sort.direction || 'asc'
          }));
        }
        
        // Add includeSchema for JSON exports
        if (format.id === 'json') {
          queryParams.append('includeSchema', includeSchema.toString());
        }
        
        // Append query parameters to URL
        if (queryParams.toString()) {
          url = `${url}?${queryParams.toString()}`;
        }
      } else {
        throw new Error('Invalid export configuration');
      }
      
      // Trigger download
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Validate props
  if ((type === 'visualization' && !visualizationId) || 
      (type === 'table' && (!connectionId || !tableName))) {
    console.warn('ExportButton: Missing required props for export type', { type, connectionId, tableName, visualizationId });
    return null;
  }
  
  return (
    <div className="relative">
      <button
        className={`px-3 py-2 bg-white border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex items-center space-x-1 ${className} ${isExporting ? 'opacity-75 cursor-wait' : ''}`}
        onClick={toggleDropdown}
        disabled={isExporting}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download className="h-4 w-4 mr-1" />
        <span>Export</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop for closing dropdown when clicking away */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={closeDropdown}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-1 py-1 w-60 bg-white border border-slate-200 rounded-md shadow-md z-20">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-100">
              Export as:
            </div>
            <div className="py-1">
              {formats.map((format) => (
                <button
                  key={format.id}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:outline-none focus:bg-slate-50 flex items-center"
                  onClick={() => handleExport(format)}
                  disabled={isExporting}
                >
                  {format.id === 'csv' ? (
                    <FileText className="h-4 w-4 mr-2 text-slate-400" />
                  ) : (
                    <FileJson className="h-4 w-4 mr-2 text-slate-400" />
                  )}
                  <span>{format.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Loading indicator (for accessibility) */}
      {isExporting && (
        <span className="sr-only" aria-live="polite">
          Exporting data, please wait...
        </span>
      )}
    </div>
  );
};

export default ExportButton;
