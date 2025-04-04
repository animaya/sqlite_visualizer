import { useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import { 
  BarChart, 
  PieChart, 
  LineChart, 
  ScatterPlot, 
  Loader2, 
  Download, 
  RotateCcw, 
  MaximizeIcon, 
  MinimizeIcon
} from 'lucide-react';

// Define types for chart data
interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  tension?: number;
  fill?: boolean;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointBackgroundColor?: string | string[];
  pointBorderColor?: string | string[];
  barThickness?: number;
  maxBarThickness?: number;
  minBarLength?: number;
  borderRadius?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ChartRendererProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  data: ChartData | null;
  title?: string;
  height?: string;
  isLoading?: boolean;
  error?: string | null;
  onExport?: () => void;
  onRefresh?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

/**
 * Chart Renderer Component
 * 
 * Renders various types of charts using Chart.js with styling from the design system
 */
function ChartRenderer({ 
  type, 
  data, 
  title, 
  height = "h-[300px]", 
  isLoading = false,
  error = null,
  onExport,
  onRefresh,
  onToggleFullscreen,
  isFullscreen = false
}: ChartRendererProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Chart color palette from design system
  const chartColors = [
    '#2563EB', // blue-600
    '#D946EF', // fuchsia-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#6366F1', // indigo-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16', // lime-500
  ];

  // Get the appropriate chart icon
  const getChartIcon = () => {
    switch(type) {
      case 'bar':
        return <BarChart className="w-5 h-5 text-slate-500" />;
      case 'line':
        return <LineChart className="w-5 h-5 text-slate-500" />;
      case 'pie':
      case 'doughnut':
        return <PieChart className="w-5 h-5 text-slate-500" />;
      case 'scatter':
        return <ScatterPlot className="w-5 h-5 text-slate-500" />;
      default:
        return <BarChart className="w-5 h-5 text-slate-500" />;
    }
  };
  
  // Get chart-specific configurations
  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            boxWidth: 12,
            padding: 15,
            font: {
              family: "'Inter', sans-serif",
              size: 12
            },
            color: '#64748B' // slate-500
          }
        },
        tooltip: {
          backgroundColor: '#0F172A', // slate-900
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          padding: 12,
          cornerRadius: 4,
          titleFont: {
            family: "'Inter', sans-serif",
            size: 14,
            weight: 'medium'
          },
          bodyFont: {
            family: "'Inter', sans-serif",
            size: 12
          }
        },
        title: {
          display: !!title,
          text: title || '',
          padding: {
            top: 10,
            bottom: 20
          },
          font: {
            family: "'Inter', sans-serif",
            size: 16,
            weight: 'medium'
          },
          color: '#0F172A' // slate-900
        }
      }
    };
    
    // Chart-specific options
    switch(type) {
      case 'bar':
        return {
          ...baseOptions,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#E2E8F0' // slate-200
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                },
                color: '#64748B' // slate-500
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                },
                color: '#64748B' // slate-500
              }
            }
          }
        };
      case 'line':
        return {
          ...baseOptions,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#E2E8F0' // slate-200
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                },
                color: '#64748B' // slate-500
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                },
                color: '#64748B' // slate-500
              }
            }
          }
        };
      case 'pie':
      case 'doughnut':
        return baseOptions;
      case 'scatter':
        return {
          ...baseOptions,
          scales: {
            y: {
              grid: {
                color: '#E2E8F0' // slate-200
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                },
                color: '#64748B' // slate-500
              }
            },
            x: {
              grid: {
                color: '#E2E8F0' // slate-200
              },
              ticks: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 12
                },
                color: '#64748B' // slate-500
              }
            }
          }
        };
      default:
        return baseOptions;
    }
  };
  
  // Apply chart style defaults based on chart type
  const applyChartTypeDefaults = (chartData: ChartData): ChartData => {
    if (!chartData || !chartData.datasets) return chartData;
    
    const newData = { ...chartData };
    
    newData.datasets = chartData.datasets.map((dataset, index) => {
      const color = chartColors[index % chartColors.length];
      
      // Base styling for all chart types
      const baseDataset = {
        ...dataset,
        backgroundColor: dataset.backgroundColor || color,
        borderColor: dataset.borderColor || color
      };
      
      // Chart type specific styling
      switch(type) {
        case 'bar':
          return {
            ...baseDataset,
            borderWidth: dataset.borderWidth || 0,
            borderRadius: dataset.borderRadius || 4,
            maxBarThickness: dataset.maxBarThickness || 40
          };
        case 'line':
          return {
            ...baseDataset,
            borderWidth: dataset.borderWidth || 2,
            tension: dataset.tension || 0.2,
            pointRadius: dataset.pointRadius || 3,
            pointHoverRadius: dataset.pointHoverRadius || 5,
            pointBackgroundColor: dataset.pointBackgroundColor || '#FFFFFF',
            pointBorderColor: dataset.pointBorderColor || color,
            fill: dataset.fill || false
          };
        case 'pie':
        case 'doughnut':
          return {
            ...baseDataset,
            backgroundColor: dataset.backgroundColor || chartColors,
            borderWidth: dataset.borderWidth || 2,
            borderColor: dataset.borderColor || '#FFFFFF'
          };
        case 'scatter':
          return {
            ...baseDataset,
            pointRadius: dataset.pointRadius || 6,
            pointHoverRadius: dataset.pointHoverRadius || 8,
            pointBackgroundColor: dataset.pointBackgroundColor || color,
            borderWidth: 0
          };
        default:
          return baseDataset;
      }
    });
    
    return newData;
  };
  
  useEffect(() => {
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    if (chartRef.current && data && !isLoading && !error) {
      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        const enhancedData = applyChartTypeDefaults(data);
        const options = getChartOptions();
        
        chartInstance.current = new Chart(ctx, {
          type: type,
          data: enhancedData,
          options: options
        });
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data, isLoading, error, title, isFullscreen]);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="p-4 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <h3 className="text-base font-medium text-slate-900">{title || 'Loading Chart'}</h3>
          </div>
        </div>
        <div className={`flex items-center justify-center ${height}`}>
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-slate-500">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="p-4 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <h3 className="text-base font-medium text-slate-900">{title || 'Chart Error'}</h3>
          </div>
        </div>
        <div className={`flex items-center justify-center ${height}`}>
          <div className="text-center p-6 max-w-md">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded text-sm font-medium hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (!data) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-md shadow-sm">
        <div className="p-4 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <h3 className="text-base font-medium text-slate-900">{title || 'No Data'}</h3>
          </div>
        </div>
        <div className={`flex items-center justify-center ${height}`}>
          <p className="text-sm text-slate-500">No data available to display</p>
        </div>
      </div>
    );
  }
  
  // Render chart
  return (
    <div className="w-full bg-white border border-slate-200 rounded-md shadow-sm">
      <div className="p-4 flex justify-between items-center border-b border-slate-200">
        <div className="flex items-center gap-2">
          {getChartIcon()}
          <h3 className="text-base font-medium text-slate-900">{title || 'Chart'}</h3>
        </div>
        <div className="flex space-x-2">
          {onExport && (
            <button 
              onClick={onExport}
              className="p-2 text-slate-500 rounded hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              title="Export data"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2 text-slate-500 rounded hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              title="Refresh data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {onToggleFullscreen && (
            <button 
              onClick={onToggleFullscreen}
              className="p-2 text-slate-500 rounded hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <MinimizeIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      <div className={`p-4 ${height}`}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}

export default ChartRenderer;
