import { FC } from 'react';
import { Template, ChartData } from '../../types';
import ChartPreview from '../visualization/ChartPreview';

interface TemplatePreviewProps {
  template: Template;
  previewData: ChartData | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * TemplatePreview Component
 * 
 * Displays a preview of a template with sample data
 */
const TemplatePreview: FC<TemplatePreviewProps> = ({
  template,
  previewData,
  isLoading = false,
  error = null,
  className = ''
}) => {
  // Render loading state
  if (isLoading) {
    return (
      <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
        <h3 className="text-lg font-medium text-slate-900 mb-4">{template.name} Preview</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-slate-500">Loading preview data...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
        <h3 className="text-lg font-medium text-slate-900 mb-4">{template.name} Preview</h3>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (!previewData) {
    return (
      <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
        <h3 className="text-lg font-medium text-slate-900 mb-4">{template.name} Preview</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-slate-500">Configure the template to see a preview</p>
        </div>
      </div>
    );
  }
  
  // Render preview chart
  return (
    <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
      <h3 className="text-lg font-medium text-slate-900 mb-4">{template.name} Preview</h3>
      <div className="h-64">
        <ChartPreview 
          type={template.type}
          data={previewData}
          options={{
            title: template.name,
            responsive: true,
            maintainAspectRatio: false
          }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        This is a preview with sample data. Apply the template to see the full visualization.
      </p>
    </div>
  );
};

export default TemplatePreview;
