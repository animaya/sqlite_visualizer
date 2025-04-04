import { FC } from 'react';

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
}

/**
 * Data Table Component
 * 
 * Displays table data with sorting, filtering, and pagination
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
  filters = {}
}) => {
  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);
  
  // Get column headers from first row
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 flex justify-center items-center h-[300px]">
        <p className="text-slate-500">Loading data...</p>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => onSortChange && onSortChange(column, 'asc')}
                >
                  {column}
                  {/* TODO: Add sort indicator */}
                </th>
              ))}
            </tr>
            {/* Filter row */}
            <tr>
              {columns.map((column) => (
                <th key={`filter-${column}`} className="px-4 py-2">
                  <input
                    type="text"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                    placeholder={`Filter ${column}`}
                    value={filters[column] || ''}
                    onChange={(e) => {
                      onFilterChange({
                        ...filters,
                        [column]: e.target.value
                      });
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="px-4 py-3 text-sm text-slate-900">
                    {row[column] !== null && row[column] !== undefined ? String(row[column]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-slate-200">
        <div className="text-sm text-slate-500">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{total}</span> results
        </div>
        
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          
          <button
            className="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
