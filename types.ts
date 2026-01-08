
export enum DayStatus {
  TRADED = 'TRADED',
  SKIPPED = 'SKIPPED',
  WEEKEND = 'WEEKEND'
}

export type TradeCategory = 'STOCKS' | 'OPTIONS' | 'NONE';

export type TradeSubCategory = 
  | 'SELF_WORK' 
  | 'FULL_TIME' 
  | 'ZERO_DTE' 
  | 'LONG_OPTIONS' 
  | 'NONE';

export type OptionStrategy = 
  | 'CREDIT_SPREAD' 
  | 'IRON_CONDOR' 
  | 'BUTTERFLY' 
  | 'SINGLE_CALL_PUT' 
  | 'STRADDLE_STRANGLE' 
  | 'NONE';

export type Language = 'ru' | 'en';

export interface SyncConfig {
  sheetId: string;
  scriptUrl: string;
  isEnabled: boolean;
}

// Added RiskProfile interface as it was missing and referenced in multiple files
export interface RiskProfile {
  id: string;
  name: string;
  initialCapital: number;
  currentBalance: number;
  riskPerTradePct: number;
  targetAnnualReturnPct: number;
  totalEffectiveDays: number;
  maxMissedDaysPct: number;
  isActive: boolean;
  sync: SyncConfig;
}

export interface DailyStat {
  id: string;
  profileId: string;
  date: string;
  pnlAmount: number;
  status: DayStatus;
  category: TradeCategory;
  subCategory: TradeSubCategory;
  strategy: OptionStrategy;
  ticker?: string; // New field
  startOfDayBalance: number;
  riskLimitSnapshot: number;
}

export interface TickerStat {
  ticker: string;
  pnl: number;
  count: number;
}

export interface DashboardStats {
  profileId: string;
  currentCapital: number;
  annualGoalAmount: number;
  currentProgressAmount: number;
  remainingGoal: number;
  daysLeft: number;
  dailyRiskLimit: number;
  requiredDailyAvg: number;
  missedDaysPercent: number;
  daysTraded: number;
  daysSkipped: number;
  categoryBreakdown: Record<string, number>;
  strategyBreakdown: Record<string, number>; // New
  tickerPerformance: TickerStat[]; // New
  allocation: { name: string, value: number }[]; // New
}

export interface Alert {
  id: string;
  type: 'RISK' | 'DISCIPLINE' | 'INFO';
  message: {
    en: string;
    ru: string;
  };
  timestamp: Date;
}