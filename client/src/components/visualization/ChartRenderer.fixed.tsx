import { FC, useRef, useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import { ChartData } from '../../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Valid chart types
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'polarArea';

interface ChartRendererProps {
  type: ChartType;
  data: ChartData;
  title?: string;
  height?: string | number;
  width?: string | number;
  customOptions?: any;
}

/**
 * Chart Renderer Component
 * 
 * Renders various types of charts using Chart.js with optimized configuration
 * for each chart type based on the application's style guide.
 */
const ChartRenderer: FC<ChartRendererProps> = ({
  type,
  data,
  title,
  height = '100%',
  width = '100%',
  customOptions = {}
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Style guide colors
  const baseColors = [
    '#2563EB', // blue-600
    '#D946EF', // fuchsia-500
    '#F59E0B', // amber-500
    '#10B981', // emerald-500
    '#6366F1', // indigo-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#84CC16'  // lime-500
  ];
  
  // Validate and parse chart type
  const getChartType = (chartType: string): Chart.ChartType => {
    const validTypes: Record<string, Chart.ChartType> = {
      bar: 'bar',
      line: 'line',
      pie: 'pie',
      doughnut: 'doughnut',
      scatter: 'scatter',
      radar: 'radar',
      polarArea: 'polarArea'
    };
    
    const normalizedType = chartType.toLowerCase();
    if (normalizedType in validTypes) {
      return validTypes[normalizedType];
    }
    
    console.warn(`Unsupported chart type: ${chartType}, defaulting to bar`);
    setError(`Unsupported chart type: ${chartType}`);
    return 'bar';
  };
  
  // Apply style based on chart type
  const getStyleForChartType = (chartType: ChartType, chartData: ChartData) => {
    // Make sure we have labels and datasets
    if (!chartData.labels) chartData.labels = [];
    if (!chartData.datasets) chartData.datasets = [];
    
    const defaultColors = baseColors.slice(0, Math.max(chartData.datasets.length, chartData.labels.length));
    
    // Common styling for all chart types
    let styledData: ChartData = {
      ...chartData,
      datasets: chartData.datasets.map((dataset, index) => {
        const color = defaultColors[index % defaultColors.length];
        
        // Create a new dataset with default styling
        return {
          ...dataset,
          backgroundColor: dataset.backgroundColor || color,
          borderColor: dataset.borderColor || color,
          borderWidth: dataset.borderWidth
        };
      })
    };
    
    // Apply chart-type specific styling
    switch (chartType) {
      case 'bar':
        styledData.datasets = styledData.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || defaultColors[index % defaultColors.length],
          borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
          borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 0,
          borderRadius: 4,
          maxBarThickness: 40
        }));
        break;
        
      case 'line':
        styledData.datasets = styledData.datasets.map((dataset, index) => {
          // For line charts, we typically want a single color per dataset
          const color = defaultColors[index % defaultColors.length];
          
          return {
            ...dataset,
            backgroundColor: dataset.backgroundColor || `${color}33`, // Add 20% opacity to color
            borderColor: dataset.borderColor || color,
            borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 2,
            tension: 0.2, // Slight curve for lines
            fill: true
          };
        });
        break;
        
      case 'pie':
      case 'doughnut':
        // For pie charts, we need an array of colors for segments
        const pieColors = baseColors.slice(0, chartData.labels.length);
        styledData.datasets = styledData.datasets.map((dataset) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || pieColors,
          borderColor: dataset.borderColor || '#FFFFFF',
          borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 2
        }));
        break;
        
      case 'scatter':
        styledData.datasets = styledData.datasets.map((dataset, index) => {
          const color = defaultColors[index % defaultColors.length];
          
          return {
            ...dataset,
            backgroundColor: dataset.backgroundColor || color,
            borderColor: dataset.borderColor || color,
            borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 1,
            radius: 5,
            pointHoverRadius: 7
          };
        });
        break;
        
      case 'radar':
        styledData.datasets = styledData.datasets.map((dataset, index) => {
          const color = defaultColors[index % defaultColors.length];
          
          return {
            ...dataset,
            backgroundColor: dataset.backgroundColor || `${color}33`, // Add 20% opacity
            borderColor: dataset.borderColor || color,
            borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 2,
            pointBackgroundColor: color
          };
        });
        break;
        
      case 'polarArea':
        // For polar area, we need an array of colors with opacity
        const polarColors = baseColors.slice(0, chartData.labels.length)
          .map(color => `${color}CC`); // Add 80% opacity
        
        styledData.datasets = styledData.datasets.map((dataset) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || polarColors,
          borderColor: dataset.borderColor || '#FFFFFF',
          borderWidth: dataset.borderWidth !== undefined ? dataset.borderWidth : 1
        }));
        break;
    }
    
    return styledData;
  };
  
  // Get chart options based on type
  const getOptionsForChartType = (chartType: ChartType): ChartOptions<any> => {
    // Common options for all chart types
    const commonOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
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
            weight: 'medium',
            family: "'Inter', sans-serif"
          },
          bodyFont: {
            family: "'Inter', sans-serif"
          }
        },
        title: {
          display: !!title,
          text: title || '',
          font: {
            weight: 'medium',
            size: 16,
            family: "'Inter', sans-serif"
          },
          color: '#0F172A', // slate-900
          padding: {
            bottom: 16
          }
        }
      }
    };
    
    // Chart-type specific options
    switch (chartType) {
      case 'bar':
        return {
          ...commonOptions,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              grid: {
                color: '#E2E8F0' // slate-200
              }
            },
            x: {
              ticks: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              grid: {
                display: false
              }
            }
          }
        };
        
      case 'line':
        return {
          ...commonOptions,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              grid: {
                color: '#E2E8F0' // slate-200
              }
            },
            x: {
              ticks: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              grid: {
                color: '#E2E8F0' // slate-200
              }
            }
          },
          elements: {
            line: {
              tension: 0.2
            },
            point: {
              radius: 3,
              hoverRadius: 5
            }
          }
        };
        
      case 'pie':
      case 'doughnut':
        return {
          ...commonOptions,
          cutout: chartType === 'doughnut' ? '50%' : undefined
        };
        
      case 'scatter':
        return {
          ...commonOptions,
          scales: {
            y: {
              ticks: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              grid: {
                color: '#E2E8F0' // slate-200
              }
            },
            x: {
              ticks: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              grid: {
                color: '#E2E8F0' // slate-200
              }
            }
          }
        };
        
      case 'radar':
        return {
          ...commonOptions,
          scales: {
            r: {
              angleLines: {
                color: '#E2E8F0' // slate-200
              },
              grid: {
                color: '#E2E8F0' // slate-200
              },
              pointLabels: {
                font: {
                  family: "'Inter', sans-serif"
                },
                color: '#64748B' // slate-500
              },
              ticks: {
                backdropColor: 'transparent',
                color: '#64748B' // slate-500
              }
            }
          },
          elements: {
            line: {
              borderWidth: 2
            },
            point: {
              radius: 3,
              hoverRadius: 5
            }
          }
        };
        
      case 'polarArea':
        return {
          ...commonOptions,
          scales: {
            r: {
              beginAtZero: true,
              ticks: {
                backdropColor: 'transparent',
                color: '#64748B' // slate-500
              },
              grid: {
                color: '#E2E8F0' // slate-200
              }
            }
          }
        };
        
      default:
        return commonOptions;
    }
  };
  
  useEffect(() => {
    // Clear any previous errors
    setError(null);
    
    // Validate data
    if (!data || !data.datasets || data.datasets.length === 0) {
      setError('No data available for chart');
      return;
    }
    
    // Get chart canvas context
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clean up existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    try {
      // Get Chart.js chart type
      const chartType = getChartType(type);
      
      // Apply styling and options
      const styledData = getStyleForChartType(type as ChartType, data);
      const chartOptions = {
        ...getOptionsForChartType(type as ChartType),
        ...customOptions
      };
      
      // Create chart
      chartInstance.current = new Chart(ctx, {
        type: chartType,
        data: styledData,
        options: chartOptions
      });
    } catch (err) {
      console.error('Error creating chart:', err);
      setError(err instanceof Error ? err.message : 'Error creating chart');
    }
    
    // Clean up on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data, title, customOptions]);
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }
  
  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 border border-slate-200 rounded p-4">
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div style={{ width, height }} className="relative">
      <canvas ref={chartRef} />
    </div>
  );
};

export default ChartRenderer;