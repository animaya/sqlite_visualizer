import { FC } from 'react';

interface TemplateApplyButtonProps {
  templateId: string | number;
  connectionId: string | null;
  onClick: (templateId: string | number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * TemplateApplyButton Component
 * 
 * A reusable button for applying templates
 */
const TemplateApplyButton: FC<TemplateApplyButtonProps> = ({
  templateId,
  connectionId,
  onClick,
  disabled = false,
  className = '',
  label = 'Apply Template'
}) => {
  return (
    <button 
      className={`px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium 
                 hover:bg-blue-700 transition-colors 
                 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={!connectionId || disabled}
      onClick={() => onClick(templateId)}
      title={!connectionId ? 'Select a database connection first' : undefined}
    >
      {label}
    </button>
  );
};

export default TemplateApplyButton;
