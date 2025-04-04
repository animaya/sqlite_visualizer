import { FC, useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { ChartData } from '../../types';

interface ChartRendererProps {
  type: string;
  data: ChartData;
}

/**
 * Chart Renderer Component
 * 
 * Renders various types of charts using Chart.js
 */
const ChartRenderer: FC<ChartRendererProps> = ({ type, data }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  useEffect(() => {
    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    if (chartRef.current && data) {
      const ctx = chartRef.current.getContext('2d');
      
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: type as any,
          data: data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  padding: 15
                }
              },
              tooltip: {
                backgroundColor: '#0F172A',
                titleColor: '#FFFFFF',
                bodyColor: '#FFFFFF',
                padding: 12,
                cornerRadius: 4
              }
            }
          }
        });
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [type, data]);
  
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default ChartRenderer;
