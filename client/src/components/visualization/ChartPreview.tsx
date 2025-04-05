import { FC, useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { ChartData } from '../../types';
import ExportButton from '../common/ExportButton';

interface ChartPreviewProps {
  type: string;
  data: ChartData;
  options?: Record<string, any>;
  visualizationId?: number;
  showExport?: boolean;
}

/**
 * ChartPreview Component
 * 
 * Renders a chart with Chart.js
 */
const ChartPreview: FC<ChartPreviewProps> = ({ 
  type, 
  data, 
  options = {}, 
  visualizationId,
  showExport = false 
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Parse chart type to match Chart.js format
  const parseChartType = (chartType: string): Chart.ChartType => {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return 'bar';
      case 'line':
        return 'line';
      case 'pie':
        return 'pie';
      case 'doughnut':
        return 'doughnut';
      default:
        console.warn(`Unsupported chart type: ${chartType}, defaulting to bar`);
        return 'bar';
    }
  };
  
  // Initialize and update chart
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Set up default options based on style guide
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
            font: {
              family: "'Inter', sans-serif"
            }
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
          display: options.title ? true : false,
          text: options.title || '',
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
      },
      // Style based on chart type
      ...(type === 'bar' && {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          x: {
            ticks: {
              font: {
                family: "'Inter', sans-serif"
              }
            }
          }
        }
      }),
      ...(type === 'line' && {
        elements: {
          line: {
            tension: 0.2
          },
          point: {
            radius: 3,
            hoverRadius: 5
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                family: "'Inter', sans-serif"
              }
            }
          },
          x: {
            ticks: {
              font: {
                family: "'Inter', sans-serif"
              }
            }
          }
        }
      }),
      ...(type === 'pie' || type === 'doughnut' ? {
        cutout: type === 'doughnut' ? '50%' : undefined
      } : {}),
      // Merge user options
      ...options
    };
    
    // Apply styling to datasets based on style guide
    const styledData = {
      ...data,
      datasets: data.datasets.map((dataset, index) => {
        // Define style guide colors
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
        
        // Style based on chart type
        if (type === 'bar') {
          return {
            ...dataset,
            backgroundColor: dataset.backgroundColor || baseColors,
            borderColor: dataset.borderColor || baseColors,
            borderWidth: dataset.borderWidth || 0,
            borderRadius: 4,
            maxBarThickness: 40
          };
        } else if (type === 'line') {
          return {
            ...dataset,
            backgroundColor: dataset.backgroundColor || 'rgba(37, 99, 235, 0.1)', // blue-600 with transparency
            borderColor: dataset.borderColor || '#2563EB', // blue-600
            borderWidth: dataset.borderWidth || 2,
            fill: true
          };
        } else if (type === 'pie' || type === 'doughnut') {
          // For pie/doughnut charts, we need an array of colors
          const colors = Array.isArray(dataset.backgroundColor) 
            ? dataset.backgroundColor 
            : baseColors.slice(0, data.labels.length);
          
          return {
            ...dataset,
            backgroundColor: colors,
            borderColor: '#FFFFFF',
            borderWidth: 2
          };
        }
        
        return dataset;
      })
    };
    
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: parseChartType(type),
        data: styledData,
        options: chartOptions
      });
    }
    
    // Clean up on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data, options]);
  
  return (
    <div className="w-full h-full relative">
      {showExport && visualizationId && (
        <div className="absolute top-2 right-2 z-10">
          <ExportButton
            type="visualization"
            visualizationId={visualizationId}
            className="bg-white/80 hover:bg-white shadow-sm"
          />
        </div>
      )}
      <canvas ref={chartRef} />
    </div>
  );
};

export default ChartPreview;
