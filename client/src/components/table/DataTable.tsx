import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, Search, X, Filter, ArrowLeft, ArrowRight } from 'lucide-react';
import ExportButton from '../common/ExportButton';

interface DataTableProps {
  data: any[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSortChange: (column: string, direction: 'asc' | 'desc') => void;
  onFilterChange: (filters: Record<string, string>) => void;
  loading?: boolean;
  filters?: Record<string, string>;
  highlightPattern?: string;
  connectionId?: number;
  tableName?: string;
  showExport?: boolean;
}

/**
 * DataTable Component
 * 
 * A responsive, accessible data table with:
 * - Sorting (click on column headers)
 * - Filtering (input fields in header)
 * - Pagination
 * - Keyboard navigation
 * - Responsive design
 */
const DataTable: FC<DataTableProps> = ({
  data = [],
  total = 0,
  page = 1,
  limit = 100,
  onPageChange,
  onSortChange,
  onFilterChange,
  loading = false,
  filters = {},
  highlightPattern = '',
  connectionId,
  tableName,
  showExport = false
}) => {
  // Keep track of current sort state
  const [currentSort, setCurrentSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  // Ref for managing keyboard focus in the table
  const tableRef = useRef<HTMLDivElement>(null);
  // Debounce timer ref for filter inputs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Filter input refs for clearing all filters
  const filterInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  
  // Get column headers from first row
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Handle sort toggle with direction control
  const handleSort = useCallback((column: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    // Toggle sort direction if already sorting by this column
    if (currentSort && currentSort.column === column) {
      direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    }
    
    setCurrentSort({ column, direction });
    onSortChange(column, direction);
  }, [currentSort, onSortChange]);

  // Debounced filter handler to prevent too many requests
  const handleFilterChange = useCallback((column: string, value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      onFilterChange({
        ...filters,
        [column]: value
      });
    }, 400); // 400ms debounce
  }, [filters, onFilterChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    // Clear all input fields
    Object.values(filterInputRefs.current).forEach(input => {
      if (input) input.value = '';
    });
    
    // Clear filters in state
    onFilterChange({});
  }, [onFilterChange]);

  // Clear a single filter
  const clearFilter = useCallback((column: string) => {
    const input = filterInputRefs.current[column];
    if (input) input.value = '';
    
    const newFilters = { ...filters };
    delete newFilters[column];
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Format cell value for display
  const formatCellValue = useCallback((value: any): string => {
    if (value === null || value === undefined) return '—';
    
    // Handle different data types
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    
    return String(value);
  }, []);

  // Highlight matching text if a pattern is provided
  const highlightText = useCallback((text: string) => {
    if (!highlightPattern || !text) return text;
    
    try {
      const regex = new RegExp(`(${highlightPattern})`, 'gi');
      const parts = text.split(regex);
      
      if (parts.length <= 1) return text;
      
      return parts.map((part, i) => 
        regex.test(part) ? <mark key={i} className="bg-amber-200">{part}</mark> : part
      );
    } catch (e) {
      // If regex fails, return original text
      return text;
    }
  }, [highlightPattern]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is within the table
      if (!tableRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          if (e.altKey && page > 1) {
            e.preventDefault();
            onPageChange(page - 1);
          }
          break;
        case 'ArrowRight':
          if (e.altKey && page < totalPages) {
            e.preventDefault();
            onPageChange(page + 1);
          }
          break;
        case 'Home':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onPageChange(1);
          }
          break;
        case 'End':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            onPageChange(totalPages);
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [page, totalPages, onPageChange]);

  // Loading state
  if (loading) {
    return (
      <div 
        className="bg-white p-6 rounded-md border border-slate-200 flex justify-center items-center h-[300px]"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-primary rounded-full" />
          <p className="text-slate-500">Loading data...</p>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <div className="py-12 flex flex-col items-center">
          {Object.keys(filters).length > 0 ? (
            <>
              <Filter className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-700 font-medium mb-2">No results match your filters</p>
              <p className="text-slate-500 mb-4">Try adjusting your search or filter to find what you're looking for.</p>
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
              >
                Clear All Filters
              </button>
            </>
          ) : (
            <>
              <Search className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-700 font-medium">No data available</p>
              <p className="text-slate-500">This table appears to be empty.</p>
            </>
          )}
        </div>
      </div>
    );
  }
  
  // Calculate visible page numbers
  const visiblePageNumbers = () => {
    const delta = 2; // Number of pages to show before and after current page
    const range: number[] = [];
    
    // Always show page 1
    range.push(1);
    
    // Calculate start and end of range
    const rangeStart = Math.max(2, page - delta);
    const rangeEnd = Math.min(totalPages - 1, page + delta);
    
    // Add ellipsis after page 1 if needed
    if (rangeStart > 2) {
      range.push(-1); // -1 represents ellipsis
    }
    
    // Add pages in the middle
    for (let i = rangeStart; i <= rangeEnd; i++) {
      range.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      range.push(-2); // -2 represents ellipsis (different key from the first one)
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    return range;
  };
  
  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-sm" ref={tableRef}>
      {/* Active filters */}
      {Object.keys(filters).length > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Filters:</span>
          {Object.entries(filters).map(([column, value]) => 
            value && (
              <span 
                key={`filter-tag-${column}`} 
                className="inline-flex items-center py-1 pl-2 pr-1 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200"
              >
                <span className="font-medium mr-1">{column}:</span> {value}
                <button 
                  onClick={() => clearFilter(column)} 
                  className="ml-1 p-0.5 rounded-full hover:bg-slate-200"
                  aria-label={`Remove ${column} filter`}
                >
                  <X className="h-3 w-3 text-slate-500" />
                </button>
              </span>
            )
          )}
          <button 
            onClick={clearAllFilters} 
            className="ml-auto text-xs text-primary hover:text-primary-dark"
          >
            Clear all
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            {/* Column headers with sort indicators */}
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="group px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort(column)}
                  aria-sort={
                    currentSort && currentSort.column === column 
                      ? currentSort.direction === 'asc' ? 'ascending' : 'descending' 
                      : 'none'
                  }
                  scope="col"
                >
                  <div className="flex items-center">
                    <span className="mr-1">{column}</span>
                    <div className="flex flex-col">
                      {currentSort && currentSort.column === column ? (
                        currentSort.direction === 'asc' ? (
                          <ChevronUp className="h-3 w-3 text-primary" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-primary" />
                        )
                      ) : (
                        <div className="opacity-0 group-hover:opacity-30">
                          <ChevronUp className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
            
            {/* Filter inputs */}
            <tr>
              {columns.map((column) => (
                <th key={`filter-${column}`} className="px-4 py-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-2 py-1 pr-6 text-xs border border-slate-300 rounded-sm placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary"
                      placeholder={`Filter ${column}`}
                      defaultValue={filters[column] || ''}
                      onChange={(e) => handleFilterChange(column, e.target.value)}
                      aria-label={`Filter by ${column}`}
                      ref={(el) => filterInputRefs.current[column] = el}
                    />
                    {filters[column] && (
                      <button
                        onClick={() => clearFilter(column)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100"
                        aria-label={`Clear ${column} filter`}
                      >
                        <X className="h-3 w-3 text-slate-400" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="hover:bg-slate-50"
                tabIndex={0}
              >
                {columns.map((column) => {
                  const value = row[column];
                  const formattedValue = formatCellValue(value);
                  
                  return (
                    <td 
                      key={`${rowIndex}-${column}`} 
                      className="px-4 py-3 text-sm text-slate-900"
                      data-label={column}
                    >
                      {highlightPattern ? highlightText(formattedValue) : formattedValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 gap-3">
        <div className="flex items-center">
          <div className="text-sm text-slate-500 mr-4">
            {total > 0 ? (
              <>
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </>
            ) : (
              <span>No results</span>
            )}
          </div>
          
          {/* Export Button */}
          {showExport && connectionId && tableName && total > 0 && (
            <ExportButton
              type="table"
              connectionId={connectionId}
              tableName={tableName}
              filters={filters}
              sort={currentSort}
              limit={Math.min(10000, total)} // Cap at 10,000 rows or total rows (whichever is smaller)
            />
          )}
        </div>
        
        <div className="flex items-center justify-between sm:justify-end flex-wrap gap-2">
          {/* Rows per page selector */}
          <div className="flex items-center mr-4">
            <label htmlFor="limit-select" className="text-xs text-slate-500 mr-2">
              Rows per page:
            </label>
            <select
              id="limit-select"
              className="text-xs border-slate-300 rounded-sm focus:ring-primary focus:border-primary"
              value={limit}
              onChange={(e) => {
                const newLimit = Number(e.target.value);
                const newPage = Math.max(1, Math.min(Math.ceil(total / newLimit), page));
                setCurrentSort(null);
                onPageChange(newPage);
              }}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
              <option value="500">500</option>
            </select>
          </div>
          
          {/* Page navigation */}
          <nav className="flex" aria-label="Pagination">
            <ul className="flex items-center space-x-1">
              {/* Previous page button */}
              <li>
                <button
                  className="p-1.5 rounded-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </li>
              
              {/* Page numbers */}
              {visiblePageNumbers().map((pageNum, index) => 
                pageNum < 0 ? (
                  // Ellipsis
                  <li key={`ellipsis-${pageNum}`}>
                    <span className="px-1 text-slate-400">...</span>
                  </li>
                ) : (
                  // Page button
                  <li key={`page-${pageNum}`}>
                    <button
                      className={`px-3 py-1.5 text-sm rounded-sm ${
                        pageNum === page
                          ? 'bg-primary text-white font-medium'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                      onClick={() => onPageChange(pageNum)}
                      aria-current={pageNum === page ? 'page' : undefined}
                      aria-label={`Page ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  </li>
                )
              )}
              
              {/* Next page button */}
              <li>
                <button
                  className="p-1.5 rounded-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      
      {/* Accessibility features */}
      <div className="sr-only" aria-live="polite">
        {loading ? 'Loading data...' : `Showing page ${page} of ${totalPages}`}
      </div>
    </div>
  );
};

export default DataTable;
