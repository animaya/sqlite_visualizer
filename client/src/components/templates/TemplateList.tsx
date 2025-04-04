import { FC } from 'react';
import { Template } from '../../types';

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
  // Group templates by category
  const groupedTemplates = templates.reduce<Record<string, Template[]>>((groups, template) => {
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
      <div className="py-10 text-center">
        <p className="text-slate-500">Loading templates...</p>
      </div>
    );
  }
  
  if (templates.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-slate-500">No templates available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-10">
      {sortedCategories.map(category => (
        <div key={category}>
          <h2 className="text-xl font-medium text-slate-900 mb-4 capitalize">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedTemplates[category].map(template => (
              <div key={template.id} className="bg-white p-6 rounded-md border border-slate-200 shadow-sm hover:shadow transition-shadow">
                <h3 className="text-lg font-medium text-slate-900 mb-1">{template.name}</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {template.description || 'No description available'}
                </p>
                <div className="text-xs text-slate-500 mb-4 flex flex-wrap gap-2">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    {template.type} Chart
                  </span>
                  {template.category && (
                    <span className="inline-block px-2 py-1 bg-green-50 text-green-700 rounded capitalize">
                      {template.category}
                    </span>
                  )}
                  {template.isDefault && (
                    <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 rounded">
                      Built-in
                    </span>
                  )}
                </div>
                <button 
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!selectedConnectionId}
                  onClick={() => onApplyTemplate(template.id)}
                >
                  Apply Template
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TemplateList;
