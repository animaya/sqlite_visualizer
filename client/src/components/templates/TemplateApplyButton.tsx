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
      className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium 
                 hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 ${className}`}
      disabled={!connectionId || disabled}
      onClick={() => onClick(templateId)}
      title={!connectionId ? 'Select a database connection first' : 'Apply this template to your data'}
    >
      {!connectionId ? 'Select Connection First' : label}
    </button>
  );
};

export default TemplateApplyButton;
