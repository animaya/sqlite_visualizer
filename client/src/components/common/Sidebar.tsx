import { FC } from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Application sidebar navigation component
 */
const Sidebar: FC = () => {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">SQLite Visualizer</h1>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `block px-4 py-2 rounded text-sm ${
                  isActive 
                    ? 'bg-primary-light text-primary font-medium' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
              end
            >
              Connections
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/visualize"
              className={({ isActive }) =>
                `block px-4 py-2 rounded text-sm ${
                  isActive 
                    ? 'bg-primary-light text-primary font-medium' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              Visualization Builder
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/gallery"
              className={({ isActive }) =>
                `block px-4 py-2 rounded text-sm ${
                  isActive 
                    ? 'bg-primary-light text-primary font-medium' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              Saved Visualizations
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/templates"
              className={({ isActive }) =>
                `block px-4 py-2 rounded text-sm ${
                  isActive 
                    ? 'bg-primary-light text-primary font-medium' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              Insight Templates
            </NavLink>
          </li>
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">SQLite Visualizer v0.1.0</div>
      </div>
    </div>
  );
};

export default Sidebar;
