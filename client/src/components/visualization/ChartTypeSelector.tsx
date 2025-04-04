interface ChartType {
  id: string;
  label: string;
  description: string;
}

interface ChartTypeSelectorProps {
  selected: string;
  onChange: (chartType: string) => void;
}

/**
 * Chart Type Selector Component
 * 
 * Allows users to select the type of chart for their visualization
 */
function ChartTypeSelector({ selected, onChange }: ChartTypeSelectorProps) {
  const chartTypes: ChartType[] = [
    { id: 'bar', label: 'Bar Chart', description: 'Compare values across categories' },
    { id: 'line', label: 'Line Chart', description: 'Show trends over time or categories' },
    { id: 'pie', label: 'Pie Chart', description: 'Show composition as parts of a whole' },
    { id: 'doughnut', label: 'Doughnut Chart', description: 'Similar to pie chart with center hole' },
    { id: 'scatter', label: 'Scatter Plot', description: 'Show relationship between two variables' }
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
          }`}
          onClick={() => onChange && onChange(chartType.id)}
        >
          <div className="flex items-center">
            <div
              className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${
                selected === chartType.id
                  ? 'border-primary'
                  : 'border-slate-400'
              }`}
            >
              {selected === chartType.id && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
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
      ))}
    </div>
  );
}

export default ChartTypeSelector;
