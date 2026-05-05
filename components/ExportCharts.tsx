
import React from 'react';
import { AnalysisResult } from '../types';
import { TimeSeriesChart } from './TimeSeriesChart';

interface ExportChartsProps {
  batchData: AnalysisResult[];
}

export const ExportCharts: React.FC<ExportChartsProps> = ({ batchData }) => {
  return (
    <div 
      id="export-charts-container" 
      style={{ 
        position: 'fixed', 
        left: '0', 
        top: '0', 
        width: '1200px', 
        zIndex: -1000, 
        opacity: 0, 
        pointerEvents: 'none' 
      }}
    >
      {batchData.map((site) => (
        <div key={site.domain} id={`export-group-${site.domain.replace(/[^a-z0-9]/gi, '-')}`}>
          {/* Mobile Charts */}
          <div className="flex gap-4 mb-8">
            {(['lcp', 'cls', 'inp'] as const).map((metric) => (
              <div key={`mobile-${metric}`} style={{ width: '400px', height: '300px' }}>
                <TimeSeriesChart
                  id={`chart-${site.domain.replace(/[^a-z0-9]/gi, '-')}-phone-${metric}`}
                  history={site.phone.history}
                  metric={metric}
                  hoveredPoint={null}
                  onHover={() => {}}
                  isHoverTarget={false}
                />
              </div>
            ))}
          </div>
          {/* Desktop Charts */}
          <div className="flex gap-4 mb-8">
            {(['lcp', 'cls', 'inp'] as const).map((metric) => (
              <div key={`desktop-${metric}`} style={{ width: '400px', height: '300px' }}>
                <TimeSeriesChart
                  id={`chart-${site.domain.replace(/[^a-z0-9]/gi, '-')}-desktop-${metric}`}
                  history={site.desktop.history}
                  metric={metric}
                  hoveredPoint={null}
                  onHover={() => {}}
                  isHoverTarget={false}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
