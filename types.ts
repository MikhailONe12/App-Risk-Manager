
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

export interface SheetStats {
  targetAmountDollar: number; // SETTINGS!B4
  remainingGoal: number;      // CAPITAL!J2
  dailyTarget: number;        // DAILY_TARGET!D2
  riskLimit: number;          // RISK!B7
  daysTraded: number;         // SETTINGS!B9
  totalDays: number;          // SETTINGS!B8
}

export interface RiskProfile {
  id: string;
  name: string;
  initialCapital: number;
  currentBalance: number;     // CAPITAL!E2
  riskPerTradePct: number;
  targetAnnualReturnPct: number; // SETTINGS!B3
  totalEffectiveDays: number;
  maxMissedDaysPct: number;
  isActive: boolean;
  sync: SyncConfig;
  sheetStats?: SheetStats; // New field to store synced values
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
  ticker?: string;
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
  strategyBreakdown: Record<string, number>;
  tickerPerformance: TickerStat[];
  allocation: { name: string, value: number }[];
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
