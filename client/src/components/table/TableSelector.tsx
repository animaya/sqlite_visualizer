import { useState, useEffect } from 'react';

/**
 * Table Selector Component
 * 
 * Displays a list of tables in a database and allows selection
 */
function TableSelector({ tables = [], selectedTable, onSelectTable, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTables, setFilteredTables] = useState(tables);
  
  // Filter tables based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTables(tables);
    } else {
      const filtered = tables.filter(table => 
        table.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTables(filtered);
    }
  }, [tables, searchTerm]);
  
  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">Loading tables...</p>
      </div>
    );
  }
  
  // Empty state
  if (tables.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">No tables found in this database.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-md border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-medium text-slate-900">Database Tables</h2>
        <p className="text-sm text-slate-500 mt-1">{tables.length} tables found</p>
      </div>
      
      <div className="p-2">
        <input
          type="text"
          placeholder="Search tables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary mb-2"
        />
      </div>
      
      <ul className="max-h-[500px] overflow-y-auto">
        {filteredTables.length === 0 ? (
          <li className="p-4 text-center text-sm text-slate-500">
            No tables matching "{searchTerm}"
          </li>
        ) : (
          filteredTables.map((table) => (
            <li key={table.name}>
              <button
                className={`w-full text-left px-4 py-2 text-sm ${
                  selectedTable === table.name 
                    ? 'bg-primary-light text-primary font-medium' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => onSelectTable(table.name)}
              >
                {table.name}
                {table.row_count !== undefined && (
                  <span className="text-xs text-slate-500 ml-2">
                    ({table.row_count.toLocaleString()} rows)
                  </span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default TableSelector
