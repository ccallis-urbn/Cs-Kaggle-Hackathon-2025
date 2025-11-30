import React from 'react';
import { FormFactorAnalysis } from '../types';

interface TimeSeriesChartProps {
  history: FormFactorAnalysis['history'];
  metric: 'lcp' | 'cls' | 'inp';
  hoveredPoint: number | null;
  onHover: (index: number | null, metric: 'lcp' | 'cls' | 'inp') => void;
  isHoverTarget: boolean;
}

const COLORS = {
  lcp: '#818cf8',
  cls: '#f59e0b',
  inp: '#34d399',
};

const METRIC_CONFIG = {
    lcp: { color: COLORS.lcp, label: 'LCP Trend', unit: 'ms' },
    cls: { color: COLORS.cls, label: 'CLS Trend', unit: '' },
    inp: { color: COLORS.inp, label: 'INP Trend', unit: 'ms' },
};

const useParentSize = (ref: React.RefObject<HTMLElement>) => {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useLayoutEffect(() => {
    const updateSize = () => {
      if (ref.current) {
        setSize({
          width: ref.current.offsetWidth,
          height: ref.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [ref]);
  return size;
};

const generateTicks = (min: number, max: number, count = 4) => {
  if (max === min || !isFinite(max) || !isFinite(min)) return [min || 0];
  const ticks = [];
  const range = max - min;
  if (range <= 0) return [min];
  const step = range / count;
  for (let i = 0; i <= count; i++) {
    ticks.push(min + i * step);
  }
  return ticks;
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ history, metric, hoveredPoint, onHover, isHoverTarget }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { width, height } = useParentSize(ref);

  if (width === 0 || height === 0) return <div ref={ref} className="w-full h-full" />;

  const config = METRIC_CONFIG[metric];
  const data = (history as any)[`${metric}Trend`] as number[] || [];
  const { lcpTrend: lcpData = [], clsTrend: clsData = [], inpTrend: inpData = [], dates = [] } = history;
  
  const dataLength = data.length;
  
  if (dataLength < 2) {
    return (
      <div ref={ref} className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-sm">
        <div className="text-xs text-zinc-400 font-semibold mb-2">{config.label}</div>
        <div>Not enough data.</div>
      </div>
    );
  }

  // Increased padding for better visibility
  const padding = { top: 40, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const dataMax = data.length > 0 ? Math.max(...data, 0) : 0;
  const yMax = metric === 'cls' ? Math.max(dataMax, 0.1) : dataMax; // Give CLS a minimum range
  const yMin = 0;
  const yScaleMax = yMax === 0 ? 1 : yMax * 1.1;

  const xScale = (index: number) => padding.left + (index / (dataLength - 1)) * chartWidth;
  const yScale = (value: number) => {
    if (yScaleMax === 0) return padding.top + chartHeight;
    const normalized = (value - yMin) / (yScaleMax - yMin);
    return padding.top + chartHeight * (1 - normalized);
  };

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d)}`).join(' ');

  const getStartDate = () => (dates.length > 0 ? dates[0].split(' to ')[0] : 'Start');
  const getEndDate = () => (dates.length > 0 ? dates[dates.length - 1].split(' to ')[1] : 'End');

  const yAxisTicks = generateTicks(yMin, yScaleMax, 4);

  return (
    <div ref={ref} className="w-full h-full relative">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="font-sans"
        onMouseLeave={() => onHover(null, metric)}
      >
        <text
            x={width / 2}
            y={padding.top / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-zinc-400 text-sm fill-current font-semibold"
        >
            {config.label}
        </text>

        {/* Y Axis */}
        <g className="text-zinc-600 text-[13px]">
        {yAxisTicks.map((tick, i) => (
          <g key={`y-tick-${i}`}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2,3"
              opacity="0.2"
            />
            <text
              x={padding.left - 8}
              y={yScale(tick)}
              dominantBaseline="middle"
              textAnchor="end"
              className="fill-current"
            >
              {metric === 'cls' ? tick.toFixed(2) : Math.round(tick)}
            </text>
          </g>
        ))}
        </g>
        <text
          x={15}
          y={height / 2}
          transform={`rotate(-90, 15, ${height / 2})`}
          textAnchor="middle"
          className="text-zinc-500 text-xs fill-current uppercase tracking-wider font-semibold"
        >
          {config.unit || 'Score'}
        </text>

        {/* X Axis */}
        <g className="text-zinc-500 text-[13px]">
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.3"
          />
          <text x={padding.left} y={height - padding.bottom + 20} textAnchor="start">
            {getStartDate()}
          </text>
          <text x={width - padding.right} y={height - padding.bottom + 20} textAnchor="end">
            {getEndDate()}
          </text>
        </g>

        {/* Data line - thicker stroke */}
        {path && <path d={path} fill="none" stroke={config.color} strokeWidth="3" opacity="0.9" />}

        {/* Hover regions */}
        {Array.from({ length: dataLength }).map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={xScale(i) - 10}
            y={padding.top}
            width="20"
            height={chartHeight}
            fill="transparent"
            onMouseEnter={() => onHover(i, metric)}
            style={{ cursor: 'crosshair' }}
          />
        ))}

        {/* Hover indicators - larger circles */}
        {hoveredPoint !== null && (
          <g>
            <line
              x1={xScale(hoveredPoint)}
              y1={padding.top}
              x2={xScale(hoveredPoint)}
              y2={height - padding.bottom}
              stroke="#fff"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.3"
            />
            {data[hoveredPoint] != null && (
                <circle cx={xScale(hoveredPoint)} cy={yScale(data[hoveredPoint])} r="5" fill={config.color} stroke="#fff" strokeWidth="2" />
            )}
          </g>
        )}
      </svg>
      
      {isHoverTarget && hoveredPoint !== null && (
        <div
          className="absolute bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl pointer-events-none z-10 w-48"
          style={{
            left: xScale(hoveredPoint) + 15 > width - 200 ? xScale(hoveredPoint) - 205 : xScale(hoveredPoint) + 15,
            top: padding.top,
          }}
        >
          <div className="text-xs text-zinc-400 mb-2 font-mono">
            {dates[hoveredPoint] ? dates[hoveredPoint].split(' to ')[0] : `Point ${hoveredPoint + 1}`}
          </div>
          <div className="space-y-1 text-sm">
            {lcpData[hoveredPoint] != null && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.lcp }} />
                <span className="text-zinc-300">LCP: <span className="font-semibold text-indigo-300">{Math.round(lcpData[hoveredPoint])}ms</span></span>
              </div>
            )}
            {inpData[hoveredPoint] != null && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.inp }} />
                <span className="text-zinc-300">INP: <span className="font-semibold text-emerald-300">{Math.round(inpData[hoveredPoint])}ms</span></span>
              </div>
            )}
            {clsData[hoveredPoint] != null && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.cls }} />
                <span className="text-zinc-300">CLS: <span className="font-semibold text-amber-300">{clsData[hoveredPoint].toFixed(3)}</span></span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
