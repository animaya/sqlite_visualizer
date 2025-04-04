import { FC, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TableSelector from '../components/table/TableSelector';
import DataTable from '../components/table/DataTable';
import { TableInfo, TableSchema } from '../types';
import { tableApi } from '../services/api';

/**
 * Table Viewer Page
 * 
 * Displays database tables and their data with filtering and sorting
 */
const TableViewer: FC = () => {
  const { id: connectionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{ data: any[], total: number }>({ data: [], total: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(100);
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Fetch tables from the selected connection
    const fetchTables = async () => {
      if (!connectionId) return;
      
      try {
        setLoading(true);
        const data = await tableApi.getAll(connectionId);
        setTables(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTables();
  }, [connectionId]);
  
  useEffect(() => {
    // Fetch table data with pagination, sorting, and filtering
    const fetchTableData = async () => {
      if (!connectionId || !selectedTable) return;
      
      try {
        setLoading(true);
        
        const params: Record<string, any> = {
          page,
          limit,
        };
        
        if (sort) {
          params.sort = sort.column;
          params.direction = sort.direction;
        }
        
        if (Object.keys(filters).length > 0) {
          params.filter = JSON.stringify(filters);
        }
        
        const data = await tableApi.getData(connectionId, selectedTable, params);
        setTableData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load table data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTableData();
  }, [connectionId, selectedTable, page, limit, sort, filters]);
  
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1); // Reset pagination when changing tables
  };
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  
  const handleSortChange = (column: string, direction: 'asc' | 'desc') => {
    setSort({ column, direction });
  };
  
  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    setPage(1); // Reset pagination when filters change
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-slate-900">Table Viewer</h1>
        <button
          className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          onClick={() => navigate('/')}
        >
          Back to Connections
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Table Selector */}
        <div className="md:col-span-1">
          <TableSelector 
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={handleTableSelect}
            loading={loading}
          />
        </div>
        
        {/* Data Table */}
        <div className="md:col-span-3">
          {selectedTable ? (
            <DataTable 
              data={tableData.data}
              total={tableData.total}
              page={page}
              limit={limit}
              onPageChange={handlePageChange}
              onSortChange={handleSortChange}
              onFilterChange={handleFilterChange}
              loading={loading}
              filters={filters}
            />
          ) : (
            <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
              <p className="text-slate-500">Select a table to view its data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableViewer;
