import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateConfigurator from '../components/templates/TemplateConfigurator';

/**
 * TemplateApplication Page
 * 
 * Page for applying templates to data
 */
const TemplateApplication: FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/templates');
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <TemplateConfigurator onBack={handleBack} />
    </div>
  );
};

export default TemplateApplication;
