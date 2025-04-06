import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import TableSelector from '../components/table/TableSelector';
import DataTable from '../components/table/DataTable';
import { TableInfo, TableSchema, Connection } from '../types';
import { tableApi, connectionApi, exportApi } from '../services/api';
import { ArrowLeft, Database, FileSpreadsheet, Download, Search, Loader2 } from 'lucide-react';

/**
 * Table Viewer Page
 * 
 * Displays database tables and their data with filtering, sorting and pagination
 * Supports URL-based state for sharing specific views
 */
const TableViewer: FC = () => {
  const { id: connectionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Connection information
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Table data
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(true);
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  
  // Table data pagination and filtering
  const [tableData, setTableData] = useState<{ data: any[], total: number }>({ data: [], total: 0 });
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [tableError, setTableError] = useState<string | null>(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredTables, setFilteredTables] = useState<TableInfo[]>([]);
  
  // Refs to prevent infinite loops
  const lastQueryRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(true);
  
  // Get parameters from URL search params to enable shareable links
  const selectedTable = searchParams.get('table') || null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const sortColumn = searchParams.get('sort') || '';
  const sortDirection = searchParams.get('direction') as 'asc' | 'desc' || 'asc';
  
  // Parse filters from URL
  const getFiltersFromParams = (): Record<string, string> => {
    const filtersParam = searchParams.get('filters');
    if (!filtersParam) return {};
    
    try {
      return JSON.parse(decodeURIComponent(filtersParam));
    } catch (e) {
      console.error('Failed to parse filters from URL', e);
      return {};
    }
  };
  
  const filters = getFiltersFromParams();
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Update URL search params when state changes.
  // This keeps the URL in sync with the table view state (pagination, sorting, filtering),
  // allowing for shareable links to specific table views.
  const updateSearchParams = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    let hasChanges = false;
    
    // Apply updates, but only if values are actually different to avoid infinite loops
    Object.entries(updates).forEach(([key, value]) => {
      const currentValue = searchParams.get(key);
      if (value === null) {
        if (currentValue !== null) {
          newParams.delete(key);
          hasChanges = true;
        }
      } else if (currentValue !== value) {
        newParams.set(key, value);
        hasChanges = true;
      }
    });
    
    // Only update URL if there are actual changes
    if (hasChanges) {
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch connection info
  useEffect(() => {
    if (!connectionId) return;
    
    const fetchConnection = async () => {
      try {
        const connectionData = await connectionApi.getById(connectionId);
        if (isMountedRef.current) {
          setConnection(connectionData);
          setConnectionError(null);
          // Update document title with connection name
          document.title = `${connectionData.name} - SQLite Visualizer`;
        }
      } catch (err) {
        console.error('Failed to fetch connection:', err);
        if (isMountedRef.current) {
          setConnectionError(err instanceof Error ? err.message : 'Failed to load connection');
          setConnection(null);
        }
      }
    };
    
    fetchConnection();
    
    // Cleanup
    return () => {
      document.title = 'SQLite Visualizer';
    };
  }, [connectionId]);

  // Fetch tables from the selected connection
  useEffect(() => {
    if (!connectionId) return;
    
    const fetchTables = async () => {
      try {
        setLoadingTables(true);
        const data = await tableApi.getAll(connectionId);
        if (isMountedRef.current) {
          setTables(data);
          setFilteredTables(data);
        }
      } catch (err) {
        console.error('Failed to fetch tables:', err);
        if (isMountedRef.current) {
          setTableError(err instanceof Error ? err.message : 'Failed to load tables');
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingTables(false);
        }
      }
    };
    
    fetchTables();
  }, [connectionId]);
  
  // Filter tables based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTables(tables);
      return;
    }
    
    const filtered = tables.filter(table => 
      table.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTables(filtered);
  }, [tables, searchQuery]);
  
  // Fetch table schema when table changes
  useEffect(() => {
    if (!connectionId || !selectedTable) {
      setTableSchema(null);
      return;
    }
    
    const fetchTableSchema = async () => {
      try {
        const schema = await tableApi.getSchema(connectionId, selectedTable);
        if (isMountedRef.current) {
          setTableSchema(schema);
        }
      } catch (err) {
        console.error('Failed to fetch table schema:', err);
      }
    };
    
    fetchTableSchema();
  }, [connectionId, selectedTable]);

  // Fetch table data with pagination, sorting, and filtering
  useEffect(() => {
    if (!connectionId || !selectedTable) return;
    
    const fetchTableData = async () => {
      // Create a query string to use as cache key and for comparing requests
      const queryString = new URLSearchParams();
      queryString.set('page', page.toString());
      queryString.set('limit', limit.toString());
      if (sortColumn) {
        queryString.set('sort', sortColumn);
        queryString.set('direction', sortDirection);
      }
      if (Object.keys(filters).length > 0) {
        queryString.set('filters', JSON.stringify(filters));
      }
      
      const currentQuery = queryString.toString();
      
      // Skip duplicate requests - this prevents infinite loops
      if (lastQueryRef.current === currentQuery) {
        console.log('Skipping duplicate table data request:', currentQuery);
        return;
      }
      
      // Update last query immediately to prevent concurrent requests with same parameters
      lastQueryRef.current = currentQuery;
      
      try {
        setLoadingData(true);
        setTableError(null);
        
        const params: Record<string, any> = {
          page,
          limit,
        };
        
        if (sortColumn) {
          params.sort = sortColumn;
          params.direction = sortDirection;
        }
        
        if (Object.keys(filters).length > 0) {
          params.filter = JSON.stringify(filters);
        }
        
        const data = await tableApi.getData(connectionId, selectedTable, params);
        
        if (isMountedRef.current) {
          setTableData(data);
        }
      } catch (err) {
        console.error('Failed to fetch table data:', err);
        if (isMountedRef.current) {
          setTableError(err instanceof Error ? err.message : 'Failed to load table data');
          setTableData({ data: [], total: 0 });
        }
      } finally {
        if (isMountedRef.current) {
          setLoadingData(false);
        }
      }
    };
    
    fetchTableData();
  // We're using a query string for comparison in the effect, 
  // so we don't need all these individual dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, selectedTable, searchParams.toString()]);
  
  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    // Reset filters and sort when changing tables
    updateSearchParams({
      table: tableName,
      page: '1',
      sort: null,
      direction: null,
      filters: null
    });
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() });
  };
  
  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    updateSearchParams({ 
      limit: newLimit.toString(),
      page: '1' // Reset to first page
    });
  };
  
  // Handle sort change
  const handleSortChange = (column: string, direction: 'asc' | 'desc') => {
    updateSearchParams({ 
      sort: column,
      direction: direction
    });
  };
  
  // Handle filter change
  const handleFilterChange = (newFilters: Record<string, string>) => {
    // Only keep non-empty filters
    const cleanedFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, value]) => value.trim() !== '')
    );
    
    // Convert filters to JSON and encode for URL
    const filtersString = Object.keys(cleanedFilters).length > 0
      ? encodeURIComponent(JSON.stringify(cleanedFilters))
      : null;
    
    updateSearchParams({ 
      filters: filtersString,
      page: '1' // Reset to first page when filters change
    });
  };
  
  // Handle export to CSV
  const handleExportCsv = () => {
    if (!connectionId || !selectedTable) return;
    
    const exportUrl = exportApi.exportTable(connectionId, selectedTable);
    window.open(exportUrl, '_blank');
  };
  
  // Handle table search
  const handleTableSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Error display
  if (connectionError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md text-center">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Connection Error</h2>
        <p className="text-red-600 mb-4">{connectionError}</p>
        <button
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="inline-block mr-1 h-4 w-4" />
          Back to Connections
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with connection info and navigation */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center">
          <button
            className="mr-4 p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            onClick={() => navigate('/')}
            aria-label="Back to connections"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-primary" />
              {connection?.name || 'Database'}
            </h1>
            {connection && (
              <div className="text-sm text-slate-500 mt-1">
                <span className="font-medium">{tables.length}</span> tables | 
                {connection.size_bytes ? (
                  <span className="ml-1">{Math.round(connection.size_bytes / 1024)} KB</span>
                ) : (
                  <span className="ml-1">Unknown size</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {selectedTable && (
          <div className="flex items-center space-x-2">
            <button
              className="px-4 py-2 bg-white border border-slate-300 rounded-sm text-sm text-slate-700 hover:bg-slate-50 flex items-center"
              onClick={handleExportCsv}
              disabled={loadingData}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </button>
          </div>
        )}
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table Selector with search */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900 flex items-center">
                <FileSpreadsheet className="h-5 w-5 mr-2 text-primary" />
                Database Tables
              </h2>
              
              <div className="mt-3 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search tables..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={searchQuery}
                  onChange={handleTableSearch}
                />
              </div>
            </div>
            
            {loadingTables ? (
              <div className="p-6 text-center">
                <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto mb-2" />
                <p className="text-slate-500">Loading tables...</p>
              </div>
            ) : (
              <TableSelector 
                tables={filteredTables}
                selectedTable={selectedTable}
                onSelectTable={handleTableSelect}
                loading={false}
              />
            )}
          </div>
        </div>
        
        {/* Data Table */}
        <div className="lg:col-span-3">
          {tableError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-red-600">{tableError}</p>
            </div>
          )}
          
          {selectedTable ? (
            <>
              {/* Schema information is hidden in the UI but still available for internal use */}
              
              <DataTable 
                data={tableData.data}
                total={tableData.total}
                page={page}
                limit={limit}
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                loading={loadingData}
                filters={filters}
                highlightPattern={searchQuery}
                connectionId={Number(connectionId)}
                tableName={selectedTable}
                showExport={true}
              />
            </>
          ) : (
            <div className="bg-white p-8 rounded-md border border-slate-200 text-center">
              <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-700 font-medium mb-2">Select a table to view its data</p>
              <p className="text-slate-500 text-sm">Choose a table from the list on the left to explore its contents</p>
              
              {filteredTables.length === 0 && tables.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md inline-block">
                  <p className="text-amber-700 text-sm">No tables match your search criteria</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableViewer;