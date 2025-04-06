import { FC } from 'react';
import { Template } from '../../types';
import TemplateApplyButton from './TemplateApplyButton';

interface TemplateCardProps {
  template: Template;
  connectionId: string | null;
  onApply: (templateId: string | number) => void;
  className?: string;
}

/**
 * TemplateCard Component
 * 
 * Displays a single template card with description and apply button
 */
const TemplateCard: FC<TemplateCardProps> = ({
  template,
  connectionId,
  onApply,
  className = ''
}) => {
  // Get appropriate icon based on chart type
  const getChartIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'bar':
        return '📊';
      case 'line':
        return '📈';
      case 'pie':
      case 'doughnut':
        return '🍩';
      case 'scatter':
        return '🔵';
      case 'radar':
        return '🕸️';
      case 'area':
        return '📉';
      default:
        return '📊';
    }
  };
  
  return (
    <div className={`bg-white p-6 rounded-md border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium text-slate-900">{template.name}</h3>
        <span className="text-2xl" title={`${template.type} Chart`}>
          {getChartIcon(template.type)}
        </span>
      </div>
      
      <p className="text-sm text-slate-500 mb-4 min-h-[40px]">
        {template.description || 'No description available'}
      </p>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full capitalize">
          {template.type} Chart
        </span>
        
        {template.category && (
          <span className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full capitalize">
            {template.category}
          </span>
        )}
        
        {template.is_default && (
          <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
            Built-in
          </span>
        )}
      </div>
      
      <TemplateApplyButton 
        templateId={template.id}
        connectionId={connectionId}
        onClick={onApply}
        className="w-full mt-2 transition-all duration-300"
      />
    </div>
  );
};

export default TemplateCard;
