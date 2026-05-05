

import { AnalysisResult, LogEntry } from './types';

export const CRUX_API_BASE = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
export const CRUX_HISTORY_API_BASE = 'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord';

const MOCK_WEEKLY_DATES = [
    '2025-05-04 to 2025-05-10', '2025-05-11 to 2025-05-17',
    '2025-05-18 to 2025-05-24', '2025-05-25 to 2025-05-31',
    '2025-06-01 to 2025-06-07', '2025-06-08 to 2025-06-14',
    '2025-06-15 to 2025-06-21', '2025-06-22 to 2025-06-28',
    '2025-06-29 to 2025-07-05', '2025-07-06 to 2025-07-12',
    '2025-07-13 to 2025-07-19', '2025-07-20 to 2025-07-26',
    '2025-07-27 to 2025-08-02', '2025-08-03 to 2025-08-09',
    '2025-08-10 to 2025-08-16', '2025-08-17 to 2025-08-23',
    '2025-08-24 to 2025-08-30', '2025-08-31 to 2025-09-06',
    '2025-09-07 to 2025-09-13', '2025-09-14 to 2025-09-20',
    '2025-09-21 to 2025-09-27', '2025-09-28 to 2025-10-04',
    '2025-10-05 to 2025-10-11', '2025-10-12 to 2025-10-18'
];
// Note: Only 24 dates are listed to match the 25 data points (n-1 intervals)

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
        lcpTrend: [
            2549, 2557, 2661, 2636, 2655, 2769, 2743, 2779, 2795, 2814,
            2866, 2921, 2928, 2977, 3033, 2997, 3037, 3069, 3139, 3125,
            3198, 3217, 3185, 3192, 3200
        ],
        clsTrend: [
            0.081, 0.082, 0.091, 0.093, 0.094, 0.103, 0.101, 0.108, 0.111,
            0.112, 0.115, 0.123, 0.122, 0.127, 0.133, 0.133, 0.137, 0.141,
            0.138, 0.142, 0.148, 0.149, 0.151, 0.149, 0.15
        ],
        inpTrend: [
            181, 185, 192, 193, 196, 203, 204, 209, 211, 213, 217, 221,
            223, 228, 231, 233, 237, 241, 239, 242, 248, 246, 252, 249, 250
        ],
        dates: MOCK_WEEKLY_DATES,
      },
      regressions: [
        "Mobile LCP has degraded by ~25% over the last 25 weeks."
      ],
      collectionPeriod: "2025-09-21 to 2025-10-18"
  },
  desktop: {
      metrics: {
        lcp: { value: 1200, rating: 'good' },
        cls: { value: 0.02, rating: 'good' },
        inp: { value: 50, rating: 'good' },
      },
      history: {
        lcpTrend: [
            1201, 1187, 1223, 1198, 1201, 1178, 1204, 1195, 1222, 1201,
            1193, 1206, 1200, 1189, 1177, 1224, 1203, 1199, 1205, 1182,
            1191, 1203, 1180, 1224, 1200
        ],
        clsTrend: [
            0.021, 0.019, 0.02, 0.018, 0.022, 0.019, 0.021, 0.018, 0.02,
            0.021, 0.019, 0.02, 0.021, 0.019, 0.018, 0.022, 0.021, 0.02,
            0.019, 0.02, 0.021, 0.019, 0.022, 0.018, 0.02
        ],
        inpTrend: [
            48, 52, 49, 51, 47, 53, 50, 48, 52, 49, 51, 48, 50, 52, 47, 53,
            49, 51, 48, 52, 50, 49, 51, 48, 50
        ],
        dates: MOCK_WEEKLY_DATES,
      },
      regressions: [],
      collectionPeriod: "2025-09-21 to 2025-10-18"
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
