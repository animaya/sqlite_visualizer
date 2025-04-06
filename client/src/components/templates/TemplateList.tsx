import { FC, useEffect } from 'react';
import { Template } from '../../types';
import TemplateCard from './TemplateCard';

interface TemplateListProps {
  templates: Template[];
  selectedConnectionId: string | null;
  onApplyTemplate: (templateId: string | number) => void;
  isLoading?: boolean;
}

/**
 * TemplateList Component
 * 
 * Displays a grid of available templates
 */
const TemplateList: FC<TemplateListProps> = ({
  templates,
  selectedConnectionId,
  onApplyTemplate,
  isLoading = false
}) => {
  // Log when connection or templates change
  useEffect(() => {
    console.log('TemplateList - selectedConnectionId:', selectedConnectionId);
    console.log('TemplateList - templates count:', templates?.length);
  }, [selectedConnectionId, templates]);
  // Group templates by category
  const groupedTemplates = (templates || []).reduce<Record<string, Template[]>>((groups, template) => {
    // Skip null or undefined templates
    if (!template) return groups;
    
    const category = template.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(template);
    return groups;
  }, {});
  
  // Sort categories for consistent display
  const sortedCategories = Object.keys(groupedTemplates).sort((a, b) => {
    // Always put "Other" at the end
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });
  
  if (isLoading) {
    return (
      <div className="py-10 text-center bg-white rounded-md border border-slate-200 shadow-sm">
        <p className="text-slate-500">Loading templates...</p>
      </div>
    );
  }
  
  if (!templates || templates.length === 0) {
    return (
      <div className="py-10 text-center bg-white rounded-md border border-slate-200 shadow-sm">
        <p className="text-slate-500">No templates available</p>
      </div>
    );
  }
  
  if (!selectedConnectionId) {
    return (
      <div className="py-10 text-center bg-white rounded-md border border-slate-200 shadow-sm">
        <p className="text-slate-500">Please select a database connection to view available templates</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-10">
      {sortedCategories.map(category => (
        <div key={category} className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
          <h2 className="text-xl font-medium text-slate-900 mb-4 capitalize">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedTemplates[category].map(template => (
              <TemplateCard 
                key={template.id}
                template={template}
                connectionId={selectedConnectionId}
                onApply={onApplyTemplate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateList;