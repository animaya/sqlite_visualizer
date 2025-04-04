import { 
  BarChart, 
  LineChart, 
  PieChart, 
  CircleDashed,
  ScatterChart
} from 'lucide-react';

interface ChartType {
  id: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface ChartTypeSelectorProps {
  selected: string;
  onChange: (chartType: string) => void;
  disabled?: boolean;
}

/**
 * Chart Type Selector Component
 * 
 * Allows users to select the type of chart for their visualization
 * with icons and descriptions for each chart type
 */
function ChartTypeSelector({ selected, onChange, disabled = false }: ChartTypeSelectorProps) {
  const chartTypes: ChartType[] = [
    { 
      id: 'bar', 
      label: 'Bar Chart', 
      description: 'Compare values across categories', 
      icon: <BarChart className="w-5 h-5" />
    },
    { 
      id: 'line', 
      label: 'Line Chart', 
      description: 'Show trends over time or continuous data',
      icon: <LineChart className="w-5 h-5" />
    },
    { 
      id: 'pie', 
      label: 'Pie Chart', 
      description: 'Show composition as parts of a whole',
      icon: <PieChart className="w-5 h-5" />
    },
    { 
      id: 'doughnut', 
      label: 'Doughnut Chart', 
      description: 'Similar to pie chart with center hole',
      icon: <CircleDashed className="w-5 h-5" />
    },
    { 
      id: 'scatter', 
      label: 'Scatter Plot', 
      description: 'Show relationship between two variables',
      icon: <ScatterChart className="w-5 h-5" />
    }
  ];
  
  return (
    <div className="space-y-2">
      {chartTypes.map((chartType) => (
        <div
          key={chartType.id}
          className={`p-3 border rounded cursor-pointer transition-colors ${
            selected === chartType.id
              ? 'border-primary bg-primary-light'
              : 'border-slate-200 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onChange && onChange(chartType.id)}
          role="radio"
          aria-checked={selected === chartType.id}
          tabIndex={0}
        >
          <div className="flex items-center">
            <div
              className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${
                selected === chartType.id
                  ? 'border-primary'
                  : 'border-slate-400'
              }`}
            >
              {selected === chartType.id && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex items-center gap-3 flex-1">
              <div className={`flex items-center justify-center p-2 rounded-full ${
                selected === chartType.id 
                  ? 'bg-primary-light text-primary'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {chartType.icon}
              </div>
              <div>
                <h3 className={`text-sm font-medium ${
                  selected === chartType.id ? 'text-primary' : 'text-slate-900'
                }`}>
                  {chartType.label}
                </h3>
                <p className="text-xs text-slate-500">{chartType.description}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChartTypeSelector;
