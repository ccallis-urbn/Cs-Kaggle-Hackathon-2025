

import { AnalysisResult, LogEntry } from './types';

export const CRUX_API_BASE = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
export const CRUX_HISTORY_API_BASE = 'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord';

const MOCK_DATES_SHORT = [
    '2025-05-04 to 2025-05-31',
    '2025-06-01 to 2025-06-28',
    '2025-06-29 to 2025-07-26',
    '2025-07-27 to 2025-08-23',
    '2025-08-24 to 2025-09-20',
    '2025-09-21 to 2025-10-18',
];

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
        clsTrend: [0.1, 0.12, 0.11, 0.13, 0.14, 0.15],
        inpTrend: [200, 210, 220, 230, 240, 250],
        dates: MOCK_DATES_SHORT,
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
        clsTrend: [0.03, 0.02, 0.02, 0.025, 0.02, 0.02],
        inpTrend: [60, 55, 50, 52, 51, 50],
        dates: MOCK_DATES_SHORT,
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