import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import TableSelector from '../components/table/TableSelector'
import DataTable from '../components/table/DataTable'
import { tableApi, connectionApi, exportApi } from '../services/api'

interface TableViewerProps {}

/**
 * Table Viewer Page
 * 
 * Displays database tables and their data with filtering and sorting.
 * Allows users to browse, search, filter, and export table data.
 */
const TableViewer: React.FC<TableViewerProps> = () => {
  const { id: connectionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  /**
   * Handle error response from API
   * @param error Error object from catch block
   * @param defaultMessage Default error message
   * @param shouldToast Whether to show toast notification
   */
  const handleError = (error: any, defaultMessage: string, shouldToast = true): void => {
    const errorMessage = error.message || defaultMessage;
    console.error(defaultMessage, error);
    setError(errorMessage);
    if (shouldToast) {
      toast.error(errorMessage);
    }
  };

  // State for tables and data
  const [connectionName, setConnectionName] = useState<string>('');
  const [tables, setTables] = useState<Array<{ name: string; type: string }>>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{ data: Array<any>; total: number }>({ data: [], total: 0 });
  const [schema, setSchema] = useState<{ columns: Array<{ name: string; type: string; nullable: boolean }> } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination, sorting and filtering state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(100);
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  /**
   * Fetch connection details and table list on component mount
   * and when connection ID changes
   */
  useEffect(() => {
    const fetchConnectionAndTables = async (): Promise<void> => {
      if (!connectionId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get connection details to display the name
        const connectionDetails = await connectionApi.getById(connectionId);
        setConnectionName(connectionDetails.name);
        
        // Get tables list
        const tablesData = await tableApi.getAll(connectionId);
        setTables(tablesData);
        
        // Select the first table by default if available
        if (tablesData.length > 0 && !selectedTable) {
          setSelectedTable(tablesData[0].name);
        }
      } catch (err: any) {
        handleError(err, 'Failed to load database tables');
      } finally {
        setLoading(false);
      }
    };

    fetchConnectionAndTables();
  }, [connectionId]);
  
  /**
   * Fetch table schema and data when:
   * - Selected table changes
   * - Pagination, sorting, or filtering parameters change
   */
  useEffect(() => {
    const fetchTableData = async (): Promise<void> => {
      if (!connectionId || !selectedTable) return;
      
      try {
        setTableLoading(true);
        
        // Get table schema if we don't have it yet
        if (!schema) {
          const schemaData = await tableApi.getSchema(connectionId, selectedTable);
          setSchema(schemaData);
        }
        
        // Build query parameters
        const params: Record<string, any> = {
          page,
          limit,
          ...(sort && { sort: sort.column, order: sort.direction }),
          ...filters
        };
        
        // Get table data with pagination, sorting, and filtering
        const data = await tableApi.getData(connectionId, selectedTable, params);
        setTableData(data);
      } catch (err: any) {
        handleError(err, 'Failed to load table data');
      } finally {
        setTableLoading(false);
      }
    };

    fetchTableData();
  }, [connectionId, selectedTable, page, limit, sort, filters]);
  
  // Handle table selection
  const handleTableSelect = (tableName: string): void => {
    setSelectedTable(tableName);
    setPage(1); // Reset pagination when changing tables
    setSchema(null); // Reset schema for the new table
    setFilters({}); // Reset filters
  };
  
  // Handle pagination changes
  const handlePageChange = (newPage: number, newLimit?: number): void => {
    setPage(newPage);
    if (newLimit) {
      setLimit(newLimit);
    }
  };
  
  // Handle sorting
  const handleSortChange = (column: string, direction: 'asc' | 'desc'): void => {
    setSort({ column, direction });
  };
  
  // Handle filtering
  const handleFilterChange = (newFilters: Record<string, string>): void => {
    setFilters(newFilters);
    setPage(1); // Reset pagination when filters change
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Table Viewer</h1>
          {connectionName && (
            <p className="text-slate-500 mt-1">Connection: {connectionName}</p>
          )}
        </div>
        <div className="flex space-x-2">
          {selectedTable && (
            <>
              <button
                className="px-4 py-2 text-sm bg-primary-light text-primary rounded hover:bg-blue-100"
                onClick={() => navigate('/visualize', { 
                  state: { connectionId, tableName: selectedTable } 
                })}
              >
                Visualize This Table
              </button>
              <a
                href={exportApi.exportTable(connectionId, selectedTable)}
                download={`${selectedTable}_export.csv`}
                className="px-4 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
              >
                Export CSV
              </a>
            </>
          )}
          <button
            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
            onClick={() => navigate('/')}
          >
            Back to Connections
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          <p>Error: {error}</p>
        </div>
      )}
      
      {loading && tables.length === 0 ? (
        <div className="flex justify-center items-center h-[300px]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
            <p className="text-slate-500">Loading database information...</p>
          </div>
        </div>
      ) : (
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
            tableLoading && !tableData.data.length ? (
              <div className="bg-white p-6 rounded-md border border-slate-200 flex justify-center items-center h-[300px]">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                  <p className="text-slate-500">Loading table data...</p>
                </div>
              </div>
            ) : (
              <DataTable 
                schema={schema}
                data={tableData.data}
                total={tableData.total}
                page={page}
                limit={limit}
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                loading={tableLoading}
              />
            )
          ) : (
            <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
              <p className="text-slate-500">
                {tables.length > 0 
                  ? 'Select a table to view its data' 
                  : 'No tables found in this database'}
              </p>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  )
}

export default TableViewer;
