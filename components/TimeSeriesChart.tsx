import React from 'react';
import { FormFactorAnalysis } from '../types';

interface TimeSeriesChartProps {
  history: FormFactorAnalysis['history'];
  formFactor: 'phone' | 'desktop';
}

const COLORS = {
  lcp: '#818cf8', // Indigo
  cls: '#f59e0b', // Amber
  inp: '#34d399', // Emerald
};

// A simple hook to get parent dimensions for responsive SVG
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

const generateTicks = (max: number, count = 4) => {
    if (max === 0) return [0];
    const ticks = [];
    const step = max / count;
    for (let i = 0; i <= count; i++) {
        ticks.push(i * step);
    }
    return ticks;
};


export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ history }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const { width, height } = useParentSize(ref);

    if (!history || !history.lcpTrend || !history.clsTrend || !history.inpTrend) return null;
    if (width === 0 || height === 0) return <div ref={ref} className="w-full h-full" />;

    const padding = { top: 10, right: 50, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const dataLength = Math.max(history.lcpTrend.length, history.clsTrend.length, history.inpTrend.length);
    if (dataLength < 2) {
        return (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                Not enough historical data to plot a trend.
            </div>
        );
    }
    
    // --- SCALES ---
    // FIX: Guard against max value being 0 to prevent division by zero, ensuring CLS always renders.
    const timeScaleMax = Math.max(...history.lcpTrend, ...history.inpTrend) * 1.1 || 1000;
    const clsScaleMax = Math.max(...history.clsTrend) * 1.1 || 0.1;

    const xScale = (index: number) => padding.left + (index / (dataLength - 1)) * chartWidth;
    const yTimeScale = (value: number) => padding.top + chartHeight - (value / timeScaleMax) * chartHeight;
    const yClsScale = (value: number) => padding.top + chartHeight - (value / clsScaleMax) * chartHeight;

    // --- PATHS ---
    const createPath = (data: number[], scale: (v:number)=>number) => 
        data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${scale(d)}`).join(' ');

    const lcpPath = createPath(history.lcpTrend, yTimeScale);
    const inpPath = createPath(history.inpTrend, yTimeScale);
    const clsPath = createPath(history.clsTrend, yClsScale);
    
    // --- AXES ---
    const yTimeAxisTicks = generateTicks(timeScaleMax, 4);
    const yClsAxisTicks = generateTicks(clsScaleMax, 4);

    return (
        <div ref={ref} className="w-full h-full relative">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="font-sans">
                {/* Grid Lines & Y-Axis (Time - ms) */}
                {yTimeAxisTicks.map((tick, i) => (
                    <g key={`y-time-${i}`} className="text-zinc-500 text-[10px]">
                        <line 
                            x1={padding.left} y1={yTimeScale(tick)} 
                            x2={width - padding.right} y2={yTimeScale(tick)} 
                            stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.3"
                        />
                        <text x={padding.left - 8} y={yTimeScale(tick)} dominantBaseline="middle" textAnchor="end">
                            {Math.round(tick)}
                        </text>
                    </g>
                ))}
                <text x="10" y={height / 2} transform={`rotate(-90, 10, ${height / 2})`} textAnchor="middle" className="text-zinc-600 text-[10px] fill-current uppercase tracking-wider">ms</text>

                {/* Y-Axis (CLS - Score) */}
                 {yClsAxisTicks.map((tick, i) => (
                    <g key={`y-cls-${i}`} className="text-amber-700 text-[10px]">
                        <text x={width - padding.right + 8} y={yClsScale(tick)} dominantBaseline="middle" textAnchor="start">
                           {tick.toFixed(2)}
                        </text>
                    </g>
                ))}
                <text x={width-10} y={height / 2} transform={`rotate(90, ${width-10}, ${height / 2})`} textAnchor="middle" className="text-amber-800 text-[10px] fill-current uppercase tracking-wider">CLS Score</text>

                 {/* X-Axis (Weeks) */}
                <g className="text-zinc-500 text-[10px]">
                    <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
                    <text x={padding.left} y={height - padding.bottom + 15} textAnchor="start">25 weeks ago</text>
                    <text x={width-padding.right} y={height - padding.bottom + 15} textAnchor="end">Today</text>
                </g>

                {/* Data Lines */}
                <path d={lcpPath} fill="none" stroke={COLORS.lcp} strokeWidth="1.5" />
                <path d={inpPath} fill="none" stroke={COLORS.inp} strokeWidth="1.5" />
                <path d={clsPath} fill="none" stroke={COLORS.cls} strokeWidth="1.5" />

                {/* Data Points */}
                {history.lcpTrend.map((d, i) => <circle key={`lcp-dot-${i}`} cx={xScale(i)} cy={yTimeScale(d)} r="2" fill={COLORS.lcp} />)}
                {history.inpTrend.map((d, i) => <circle key={`inp-dot-${i}`} cx={xScale(i)} cy={yTimeScale(d)} r="2" fill={COLORS.inp} />)}
                {history.clsTrend.map((d, i) => <circle key={`cls-dot-${i}`} cx={xScale(i)} cy={yClsScale(d)} r="2" fill={COLORS.cls} />)}
            </svg>

             {/* Legend */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 text-xs">
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
