
import { AnalysisResult, LogEntry } from './types';

export const CRUX_API_BASE = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
export const CRUX_HISTORY_API_BASE = 'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord';

// Mock data used if no CrUX API Key is provided
export const MOCK_ANALYSIS: AnalysisResult = {
  domain: 'https://example.com',
  phone: {
      metrics: {
        lcp: { value: 3200, rating: 'needs-improvement' },
        cls: { value: 0.15, rating: 'needs-improvement' },
        inp: { value: 250, rating: 'needs-improvement' },
      },
      history: {
        lcpTrend: [2800, 2900, 2850, 3100, 3150, 3200],
      },
      regressions: [
        "Mobile LCP has degraded by 14% over the last 6 months."
      ],
      collectionPeriod: "2023-01-01 to 2023-01-28"
  },
  desktop: {
      metrics: {
        lcp: { value: 1200, rating: 'good' },
        cls: { value: 0.02, rating: 'good' },
        inp: { value: 50, rating: 'good' },
      },
      history: {
        lcpTrend: [1100, 1150, 1200, 1200, 1180, 1200],
      },
      regressions: [],
      collectionPeriod: "2023-01-01 to 2023-01-28"
  }
};

export const INITIAL_LOGS: LogEntry[] = [
  {
    timestamp: new Date().toLocaleTimeString(),
    source: 'Assistant',
    message: 'System initialized. Waiting for target domain...',
    type: 'info'
  }
];
