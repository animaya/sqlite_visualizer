import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from './layouts/MainLayout'
import Connections from './pages/Connections'
import TableViewer from './pages/TableViewer'
import VisualizationBuilder from './pages/VisualizationBuilder'
import SavedVisualizations from './pages/SavedVisualizations'
import Templates from './pages/Templates'
import NotFound from './pages/NotFound'

function App() {
  return (
    <>
      {/* Toast notifications container */}
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#0F172A', // slate-900
          border: '1px solid #E2E8F0', // slate-200
        },
        success: {
          iconTheme: {
            primary: '#10B981', // emerald-500
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444', // red-500
            secondary: '#fff',
          },
        },
      }} />
      
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Connections />} />
          <Route path="connections/:id/tables" element={<TableViewer />} />
          <Route path="visualize" element={<VisualizationBuilder />} />
          <Route path="gallery" element={<SavedVisualizations />} />
          <Route path="gallery/:id" element={<SavedVisualizations />} />
          <Route path="templates" element={<Templates />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
