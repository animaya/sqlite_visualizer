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
  // Get placeholder data based on chart type
  const getPlaceholderData = (): ChartData => {
    switch (template.type.toLowerCase()) {
      case 'bar':
      case 'line':
        return {
          labels: ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
          datasets: [{
            label: 'Sample Data',
            data: [12, 19, 8, 15, 10],
            backgroundColor: [
              'rgba(37, 99, 235, 0.2)', 
              'rgba(217, 70, 239, 0.2)', 
              'rgba(245, 158, 11, 0.2)', 
              'rgba(16, 185, 129, 0.2)', 
              'rgba(99, 102, 241, 0.2)'
            ],
            borderColor: [
              'rgb(37, 99, 235)', 
              'rgb(217, 70, 239)', 
              'rgb(245, 158, 11)', 
              'rgb(16, 185, 129)', 
              'rgb(99, 102, 241)'
            ],
            borderWidth: 1
          }]
        };
      case 'pie':
      case 'doughnut':
        return {
          labels: ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'],
          datasets: [{
            data: [12, 19, 8, 15, 10],
            backgroundColor: [
              'rgb(37, 99, 235)', 
              'rgb(217, 70, 239)', 
              'rgb(245, 158, 11)', 
              'rgb(16, 185, 129)', 
              'rgb(99, 102, 241)'
            ],
            borderColor: ['white', 'white', 'white', 'white', 'white'],
            borderWidth: 1
          }]
        };
      default:
        return {
          labels: [],
          datasets: []
        };
    }
  };

  // Check if preview data is empty
  const isEmptyData = previewData && 
    (!previewData.datasets || 
     !previewData.labels || 
     previewData.labels.length === 0 || 
     previewData.datasets.length === 0 || 
     previewData.datasets[0].data.length === 0);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
        <h3 className="text-lg font-medium text-slate-900 mb-4">
          {template.name} <span className="text-blue-600">Preview</span>
        </h3>
        <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded border border-slate-200 animate-pulse">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 mt-4">Loading preview data...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
        <h3 className="text-lg font-medium text-slate-900 mb-4">
          {template.name} <span className="text-blue-600">Preview</span>
        </h3>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
        <div className="h-52 flex items-center justify-center bg-slate-50 rounded border border-slate-200 mt-4">
          <div className="text-center p-4">
            <p className="text-slate-500 mb-2">Unable to generate preview</p>
            <p className="text-xs text-slate-400">Fix the errors above to see a preview</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (!previewData || isEmptyData) {
    // Show placeholder data with watermark
    const placeholderData = getPlaceholderData();
    
    return (
      <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
        <h3 className="text-lg font-medium text-slate-900 mb-4">
          {template.name} <span className="text-blue-600">Preview</span>
        </h3>
        <div className="relative h-64">
          <div className="opacity-30">
            <ChartPreview 
              type={template.type}
              data={placeholderData}
              options={{
                title: template.name,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white/80 p-4 rounded">
              <p className="text-slate-700">Complete the mapping to see a preview</p>
              <p className="text-xs text-slate-500 mt-1">Map the required fields to generate a preview</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          This is a sample layout. Your actual data will appear once fields are mapped.
        </p>
      </div>
    );
  }
  
  // Render preview chart
  return (
    <div className={`bg-white p-4 rounded-md border border-slate-200 ${className}`}>
      <h3 className="text-lg font-medium text-slate-900 mb-4">
        {template.name} <span className="text-blue-600">Preview</span>
      </h3>
      <div className="h-64">
        <ChartPreview 
          type={template.type}
          data={previewData}
          options={{
            title: template.name,
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 500
            },
            plugins: {
              legend: {
                display: true,
                position: 'bottom'
              },
              tooltip: {
                enabled: true
              }
            }
          }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        This is a preview with sample data. Apply the template to see the full visualization.
      </p>
    </div>
  );
};

export default TemplatePreview;
