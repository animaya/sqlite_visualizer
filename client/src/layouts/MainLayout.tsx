import { FC } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';

/**
 * Main application layout with sidebar navigation
 */
const MainLayout: FC = () => {
  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
