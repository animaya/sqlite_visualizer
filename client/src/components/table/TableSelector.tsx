/**
 * Table Selector Component
 * 
 * Displays a list of tables in a database and allows selection
 */
function TableSelector({ tables = [], selectedTable, onSelectTable, loading }) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-md border border-slate-200 text-center">
        <p className="text-slate-500">Loading tables...</p>
      </div>
    );
  }
  
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
      </div>
      
      <div className="p-2">
        <input
          type="text"
          placeholder="Search tables..."
          className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary mb-2"
        />
      </div>
      
      <ul className="max-h-[500px] overflow-y-auto">
        {/* TODO: Replace with actual tables */}
        <li>
          <button
            className={`w-full text-left px-4 py-2 text-sm ${
              selectedTable === 'users' 
                ? 'bg-primary-light text-primary font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => onSelectTable('users')}
          >
            users
          </button>
        </li>
        <li>
          <button
            className={`w-full text-left px-4 py-2 text-sm ${
              selectedTable === 'products' 
                ? 'bg-primary-light text-primary font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => onSelectTable('products')}
          >
            products
          </button>
        </li>
        <li>
          <button
            className={`w-full text-left px-4 py-2 text-sm ${
              selectedTable === 'orders' 
                ? 'bg-primary-light text-primary font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => onSelectTable('orders')}
          >
            orders
          </button>
        </li>
      </ul>
    </div>
  )
}

export default TableSelector
