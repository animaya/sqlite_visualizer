import React, { useState, useEffect, useRef } from 'react';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

interface DataTableProps {
  schema: { columns: Column[] } | null;
  data: Array<Record<string, any>>;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number, limit?: number) => void;
  onSortChange: (column: string, direction: 'asc' | 'desc') => void;
  onFilterChange: (filters: Record<string, string>) => void;
  loading: boolean;
}

/**
 * Data Table Component
 * 
 * Displays table data with sorting, filtering, and pagination
 * Optimized for large datasets and includes accessibility features
 */
const DataTable: React.FC<DataTableProps> = ({
  schema,
  data = [],
  total = 0,
  page = 1,
  limit = 100,
  onPageChange,
  onSortChange,
  onFilterChange,
  loading
}) => {
  // Internal state for filters
  const [filters, setFilters] = useState<Record<string, string>>({});
  // Internal state for sort direction and column
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({ 
    column: null, 
    direction: null 
  });
  // Ref for the table container
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  
  // Get column headers from first row or schema
  const columns: string[] = schema?.columns 
    ? schema.columns.map(col => col.name) 
    : (data.length > 0 ? Object.keys(data[0]) : []);
  
  // Get column types from schema if available
  const columnTypes: Record<string, string> = {};
  if (schema?.columns) {
    schema.columns.forEach(col => {
      columnTypes[col.name] = col.type;
    });
  }
  
  // Handle filter changes
  const handleFilterChange = (column: string, value: string): void => {
    const newFilters = {
      ...filters,
      [column]: value
    };
    
    // Remove empty filters
    if (!value) {
      delete newFilters[column];
    }
    
    setFilters(newFilters);
    
    // Notify parent component
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };
  
  // Handle sort column click
  const handleSortClick = (column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    // If already sorting by this column, toggle direction
    if (sortConfig.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ column, direction });
    
    // Notify parent component
    if (onSortChange) {
      onSortChange(column, direction);
    }
  };
  
  // Format cell value based on type
  const formatCellValue = (value: any, column: string): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-slate-400">NULL</span>;
    
    const type = columnTypes[column]?.toLowerCase() || '';
    
    if (typeof value === 'boolean') {
      return (
        <span className={value ? "text-emerald-600" : "text-red-600"}>
          {value ? 'True' : 'False'}
        </span>
      );
    }
    
    // SQLite BLOB type - show as hex if it's a string representation of bytes
    if (type.includes('blob')) {
      return <span className="font-mono text-xs bg-slate-100 p-1 rounded">BLOB</span>;
    }
    
    // Date and time handling
    if (type.includes('date') || type.includes('time')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return <span className="text-blue-600">{date.toLocaleString()}</span>;
        }
      } catch (e) {
        // Fall back to string representation
      }
    }
    
    // Numeric types
    if (type.includes('int') || type.includes('float') || type.includes('real') || type.includes('double') || type.includes('num')) {
      if (typeof value === 'number' || !isNaN(Number(value))) {
        return <span className="font-mono">{typeof value === 'number' ? value.toLocaleString() : Number(value).toLocaleString()}</span>;
      }
    }
    
    // For large text fields, truncate
    if (typeof value === 'string') {
      if (value.length > 100) {
        return (
          <div className="relative group">
            <span>{value.substring(0, 100)}...</span>
            <div className="absolute left-0 top-full z-50 bg-white p-3 border border-slate-200 rounded shadow-lg w-64 max-h-48 overflow-auto opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity">
              {value}
            </div>
          </div>
        );
      }
      
      // URLs - make them clickable
      if (value.match(/^https?:\/\//i)) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {value}
          </a>
        );
      }
    }
    
    return String(value);
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' && page < totalPages) {
      onPageChange(page + 1);
    } else if (e.key === 'ArrowLeft' && page > 1) {
      onPageChange(page - 1);
    } else if (e.key === 'Home') {
      onPageChange(1);
    } else if (e.key === 'End') {
      onPageChange(totalPages);
    }
  };
  
  // Scroll to top when page changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [page]);
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 flex justify-center items-center h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Loading data...</p>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">
          {Object.keys(filters).length > 0
            ? 'No data matches your filters'
            : 'No data available'}
        </p>
        {Object.keys(filters).length > 0 && (
          <button
            className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200 transition-colors"
            onClick={() => {
              setFilters({});
              onFilterChange({});
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div 
      className="bg-white rounded-md border border-slate-200"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="p-3 border-b border-slate-200 flex flex-wrap justify-between items-center">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{total.toLocaleString()}</span> rows
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-slate-500">Rows per page:</label>
          <select 
            className="px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            value={limit}
            onChange={(e) => onPageChange && onPageChange(1, parseInt(e.target.value))}
            aria-label="Rows per page"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
          </select>
          
          {Object.keys(filters).length > 0 && (
            <button
              className="ml-4 px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 flex items-center"
              onClick={() => {
                setFilters({});
                onFilterChange({});
              }}
              aria-label="Clear all filters"
            >
              <span>Clear filters</span>
              <span className="ml-1 bg-slate-200 rounded-full px-2 py-0.5">{Object.keys(filters).length}</span>
            </button>
          )}
        </div>
      </div>
      
      <div ref={tableContainerRef} className="overflow-x-auto max-h-[600px]">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {/* Row number column */}
              <th className="w-10 px-2 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                #
              </th>
              
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 group"
                  onClick={() => handleSortClick(column)}
                  aria-sort={sortConfig.column === column 
                    ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') 
                    : 'none'}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column}</span>
                    {sortConfig.column === column ? (
                      <span className="text-primary">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    ) : (
                      <span className="text-slate-300 opacity-0 group-hover:opacity-100">↕</span>
                    )}
                  </div>
                  {columnTypes[column] && (
                    <span className="text-xs font-normal text-slate-400 block">
                      {columnTypes[column]}
                    </span>
                  )}
                </th>
              ))}
            </tr>
            {/* Filter row */}
            <tr>
              {/* Empty cell for row number column */}
              <th className="w-10 px-2 py-2"></th>
              
              {columns.map((column) => (
                <th key={`filter-${column}`} className="px-3 py-2">
                  <input
                    type="text"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder={`Filter ${column}`}
                    value={filters[column] || ''}
                    onChange={(e) => handleFilterChange(column, e.target.value)}
                    aria-label={`Filter by ${column}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50">
                {/* Row number cell */}
                <td className="w-10 px-2 py-3 text-xs text-slate-500 text-center">
                  {startItem + rowIndex}
                </td>
                
                {columns.map((column) => (
                  <td 
                    key={`${rowIndex}-${column}`} 
                    className="px-4 py-3 text-sm text-slate-900"
                  >
                    {formatCellValue(row[column], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between border-t border-slate-200 gap-4">
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange && onPageChange(1)}
            disabled={page === 1}
            aria-label="First page"
          >
            First
          </button>
          <button
            className="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange && onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
          >
            Previous
          </button>
        </div>
        
        <div className="text-sm text-slate-500">
          Page <span className="font-medium">{page}</span> of{' '}
          <span className="font-medium">{totalPages || 1}</span>
        </div>
        
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange && onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
          </button>
          <button
            className="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange && onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
