import { FC } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Connections from './pages/Connections';
import TableViewer from './pages/TableViewer';
import VisualizationBuilder from './pages/VisualizationBuilder';
import SavedVisualizations from './pages/SavedVisualizations';
import Templates from './pages/Templates';
import NotFound from './pages/NotFound';

const App: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Connections />} />
        <Route path="connections/:id/tables" element={<TableViewer />} />
        <Route path="visualize" element={<VisualizationBuilder />} />
        <Route path="gallery" element={<SavedVisualizations />} />
        <Route path="templates" element={<Templates />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
