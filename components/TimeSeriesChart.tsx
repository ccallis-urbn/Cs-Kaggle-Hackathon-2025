import React from 'react';
import { FormFactorAnalysis } from '../types';

interface TimeSeriesChartProps {
  history: FormFactorAnalysis['history'];
}

const COLORS = {
  lcp: '#818cf8',
  cls: '#f59e0b',
  inp: '#34d399',
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
  if (max === min) return [min];
  const ticks = [];
  const step = (max - min) / count;
  for (let i = 0; i <= count; i++) {
    ticks.push(min + i * step);
  }
  return ticks;
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ history }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { width, height } = useParentSize(ref);
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);
  const [debug, setDebug] = React.useState(false); // Default to false

  if (width === 0 || height === 0) return <div ref={ref} className="w-full h-full" />;

  const padding = { top: 20, right: 60, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const lcpData = history?.lcpTrend || [];
  const clsData = history?.clsTrend || [];
  const inpData = history?.inpTrend || [];
  const dates = history?.dates || [];
  
  const dataLength = Math.max(lcpData.length, clsData.length, inpData.length);
  
  if (dataLength < 2) {
    return (
      <div ref={ref} className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
        Not enough historical data to plot a trend.
      </div>
    );
  }

  const hasTimeData = lcpData.length > 0 || inpData.length > 0;
  const hasClsData = clsData.length > 0;

  const timeMax = hasTimeData ? Math.max(...lcpData, ...inpData) : 5000;
  const timeScaleMin = 0;
  const timeScaleMax = timeMax * 1.1;
  
  const clsMax = hasClsData ? Math.max(...clsData, 0.25) : 0.25;
  const clsScaleMin = 0;
  const clsScaleMax = clsMax * 1.1;

  const debugInfo = {
    clsData: clsData.slice(0, 5),
    clsDataLength: clsData.length,
    hasClsData,
    clsMax,
    clsScaleMin,
    clsScaleMax,
  };

  const xScale = (index: number) => padding.left + (index / (dataLength - 1)) * chartWidth;
  const yTimeScale = (value: number) => {
    const normalized = value / timeScaleMax;
    return padding.top + chartHeight * (1 - normalized);
  };
  const yClsScale = (value: number) => {
    const normalized = value / clsScaleMax;
    return padding.top + chartHeight * (1 - normalized);
  };

  const createPath = (data: number[], scale: (v:number) => number) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${scale(d)}`).join(' ');

  const lcpPath = lcpData.length > 1 ? createPath(lcpData, yTimeScale) : '';
  const inpPath = inpData.length > 1 ? createPath(inpData, yTimeScale) : '';
  const clsPath = clsData.length > 1 ? createPath(clsData, yClsScale) : '';

  const getStartDate = () => {
    if (dates.length > 0) {
      return dates[0].split(' to ')[0];
    }
    return '25 weeks ago';
  };

  const getEndDate = () => {
    if (dates.length > 0) {
      return dates[dates.length - 1].split(' to ')[1];
    }
    return 'Today';
  };

  const yTimeAxisTicks = hasTimeData ? generateTicks(timeScaleMin, timeScaleMax, 5) : [];
  const yClsAxisTicks = hasClsData ? generateTicks(clsScaleMin, clsScaleMax, 5) : [];

  return (
    <div ref={ref} className="w-full h-full relative bg-zinc-950">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="font-sans"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {hasTimeData && yTimeAxisTicks.map((tick, i) => (
          <g key={`y-time-${i}`} className="text-zinc-600 text-[11px]">
            <line
              x1={padding.left}
              y1={yTimeScale(tick)}
              x2={width - padding.right}
              y2={yTimeScale(tick)}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2,3"
              opacity="0.2"
            />
            <text
              x={padding.left - 8}
              y={yTimeScale(tick)}
              dominantBaseline="middle"
              textAnchor="end"
              className="fill-current"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}
        {hasTimeData && <text
          x="15"
          y={height / 2}
          transform={`rotate(-90, 15, ${height / 2})`}
          textAnchor="middle"
          className="text-zinc-500 text-[10px] fill-current uppercase tracking-wider font-semibold"
        >
          ms (LCP/INP)
        </text>}

        {hasClsData && yClsAxisTicks.map((tick, i) => (
          <g key={`y-cls-${i}`} className="text-amber-600 text-[11px]">
            <text
              x={width - padding.right + 8}
              y={yClsScale(tick)}
              dominantBaseline="middle"
              textAnchor="start"
              className="fill-current"
            >
              {tick.toFixed(3)}
            </text>
          </g>
        ))}
        {hasClsData && <text
          x={width - 15}
          y={height / 2}
          transform={`rotate(90, ${width - 15}, ${height / 2})`}
          textAnchor="middle"
          className="text-amber-600 text-[10px] fill-current uppercase tracking-wider font-semibold"
        >
          CLS Score
        </text>}

        <g className="text-zinc-500 text-[11px]">
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

        {lcpPath && <path d={lcpPath} fill="none" stroke={COLORS.lcp} strokeWidth="2" opacity="0.8" />}
        {inpPath && <path d={inpPath} fill="none" stroke={COLORS.inp} strokeWidth="2" opacity="0.8" />}
        {clsPath && <path d={clsPath} fill="none" stroke={COLORS.cls} strokeWidth="2" opacity="0.8" />}

        {Array.from({ length: dataLength }).map((_, i) => (
          <rect
            key={`hover-${i}`}
            x={xScale(i) - 10}
            y={padding.top}
            width="20"
            height={chartHeight}
            fill="transparent"
            onMouseEnter={() => setHoveredPoint(i)}
            style={{ cursor: 'crosshair' }}
          />
        ))}

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
            {lcpData[hoveredPoint] != null && <circle cx={xScale(hoveredPoint)} cy={yTimeScale(lcpData[hoveredPoint])} r="4" fill={COLORS.lcp} stroke="#fff" strokeWidth="2" />}
            {inpData[hoveredPoint] != null && <circle cx={xScale(hoveredPoint)} cy={yTimeScale(inpData[hoveredPoint])} r="4" fill={COLORS.inp} stroke="#fff" strokeWidth="2" />}
            {clsData[hoveredPoint] != null && <circle cx={xScale(hoveredPoint)} cy={yClsScale(clsData[hoveredPoint])} r="4" fill={COLORS.cls} stroke="#fff" strokeWidth="2" />}
          </g>
        )}
      </svg>
      
      {debug && (
        <div className="absolute top-2 left-2 bg-zinc-900/95 border border-zinc-700 rounded p-2 text-xs font-mono max-w-xs z-20">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-zinc-300">CLS Debug Info</span>
            <button 
              onClick={() => setDebug(false)}
              className="text-zinc-500 hover:text-zinc-300"
            >&#x2715;</button>
          </div>
          <div className="space-y-1 text-zinc-400">
            <div>hasClsData: <span className={hasClsData ? 'text-green-400' : 'text-red-400'}>{String(hasClsData)}</span></div>
            <div>clsData length: <span className="text-amber-400">{debugInfo.clsDataLength}</span></div>
            <div>clsMax: <span className="text-amber-400">{debugInfo.clsMax?.toFixed(4)}</span></div>
            <div>clsScaleMin: <span className="text-amber-400">{debugInfo.clsScaleMin?.toFixed(4)}</span></div>
            <div>clsScaleMax: <span className="text-amber-400">{debugInfo.clsScaleMax?.toFixed(4)}</span></div>
            <div>clsPath exists: <span className={clsPath ? 'text-green-400' : 'text-red-400'}>{String(!!clsPath)}</span></div>
            <div className="pt-1 border-t border-zinc-700">First 5 CLS values:</div>
            <div className="text-amber-400 break-all">{JSON.stringify(debugInfo.clsData)}</div>
          </div>
        </div>
      )}

      {hoveredPoint !== null && (
        <div
          className="absolute bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl pointer-events-none z-10"
          style={{
            left: Math.min(xScale(hoveredPoint) + 10, width - 200),
            top: padding.top + 10,
          }}
        >
          <div className="text-xs text-zinc-400 mb-2">
            {dates[hoveredPoint] || `Data point ${hoveredPoint + 1}`}
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

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 text-xs bg-zinc-900/80 px-4 py-2 rounded-lg border border-zinc-800">
        {Object.entries(COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="font-medium text-zinc-400">{key.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};