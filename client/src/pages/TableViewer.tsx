import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import TableSelector from '../components/table/TableSelector'
import DataTable from '../components/table/DataTable'

/**
 * Table Viewer Page
 * 
 * Displays database tables and their data with filtering and sorting
 */
function TableViewer() {
  const { id: connectionId } = useParams();
  const navigate = useNavigate();
  
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [sort, setSort] = useState(null);
  const [filters, setFilters] = useState({});
  
  useEffect(() => {
    // TODO: Fetch tables from the selected connection
    setLoading(false);
  }, [connectionId]);
  
  useEffect(() => {
    if (selectedTable) {
      // TODO: Fetch table data with pagination, sorting, and filtering
    }
  }, [selectedTable, page, limit, sort, filters]);
  
  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    setPage(1); // Reset pagination when changing tables
  };
  
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  const handleSortChange = (column, direction) => {
    setSort({ column, direction });
  };
  
  const handleFilterChange = (newFilters) => {
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
            />
          ) : (
            <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
              <p className="text-slate-500">Select a table to view its data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TableViewer
