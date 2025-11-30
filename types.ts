
export interface MetricValue {
  histogram: {
    start: number;
    end?: number;
    density: number;
  }[];
  percentiles: {
    p75: number;
  };
}

export interface CrUXDate {
  year: number;
  month: number;
  day: number;
}

export interface CrUXCollectionPeriod {
  firstDate: CrUXDate;
  lastDate: CrUXDate;
}

export interface CrUXResponse {
  record: {
    key: {
      origin: string;
      formFactor: string;
    };
    metrics: {
      largest_contentful_paint?: MetricValue;
      cumulative_layout_shift?: MetricValue;
      interaction_to_next_paint?: MetricValue;
      experimental_time_to_first_byte?: MetricValue;
    };
    collectionPeriod?: CrUXCollectionPeriod;
  };
}

export interface CrUXHistoryMetric {
  histogramTimeseries: {
    start: number;
    end?: number;
    densities: number[];
  }[];
  percentilesTimeseries: {
    p75s: (number | null)[];
  };
}

export interface CrUXHistoryResponse {
  record: {
    key: {
      origin: string;
      formFactor: string;
    };
    metrics: {
      largest_contentful_paint?: CrUXHistoryMetric;
      cumulative_layout_shift?: CrUXHistoryMetric;
      interaction_to_next_paint?: CrUXHistoryMetric;
    };
  };
}

export interface MetricAnalysis {
    value: number; 
    rating: 'good' | 'needs-improvement' | 'poor';
}

export interface FormFactorAnalysis {
  metrics: {
    lcp: MetricAnalysis;
    cls: MetricAnalysis;
    inp: MetricAnalysis;
  };
  history: {
    lcpTrend: number[];
    clsTrend: number[];
    inpTrend: number[];
  };
  regressions: string[];
  collectionPeriod: string;
}

export interface AnalysisResult {
  domain: string;
  phone: FormFactorAnalysis;
  desktop: FormFactorAnalysis;
}

// Updated to match Multi-Agent Architecture
export enum AgentState {
  IDLE = 'IDLE',
  QUERY = 'QUERY',         // "CrUX Query Agent"
  HISTORIAN = 'HISTORIAN', // "CrUX Historian Agent"
  INTERPRETER = 'INTERPRETER', // "CrUX Interpretation Agent"
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface LogEntry {
  timestamp: string;
  source: 'Assistant' | 'Query Agent' | 'Historian' | 'Interpreter';
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface AgentMemory {
  query: {
    lastDomain: string;
    lastRawResults: AnalysisResult | null;
  };
  historian: {
    lastTrend: string | null;
    lastHistoryData: {
      phone: number[];
      desktop: number[];
    } | null;
  };
  interpreter: {
    lastAnalysis: AnalysisResult | null;
    lastRecommendations: string;
  };
}