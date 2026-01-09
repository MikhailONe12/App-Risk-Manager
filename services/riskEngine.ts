
import { RiskProfile, DailyStat, DashboardStats, DayStatus, TickerStat } from '../types';

export const calculateDashboardStats = (
  profile: RiskProfile,
  history: DailyStat[]
): DashboardStats => {
  // Use synced Sheet Stats if available, otherwise fallback to local calculation
  const sheet = profile.sheetStats;

  const targetAnnualGoalAmount = sheet?.targetAmountDollar ?? (profile.initialCapital * (profile.targetAnnualReturnPct / 100));
  
  const totalEffectiveDays = sheet?.totalDays ?? profile.totalEffectiveDays;
  
  // LOGIC FIX: 
  // If we have sheet stats, sheet.daysRemaining IS the days left (e.g., 221).
  // If not, calculate locally: total - traded.
  let daysLeft: number;
  let daysTraded: number;

  if (sheet?.daysRemaining !== undefined) {
    daysLeft = sheet.daysRemaining;
    daysTraded = Math.max(0, totalEffectiveDays - daysLeft);
  } else {
    daysTraded = history.filter(d => d.status === DayStatus.TRADED).length;
    daysLeft = Math.max(0, totalEffectiveDays - daysTraded);
  }
  
  const daysSkipped = history.filter(d => d.status === DayStatus.SKIPPED).length;

  const totalPnl = history.reduce((acc, val) => acc + val.pnlAmount, 0);
  
  // If we have sheet stats, we use them directly. 
  // Note: currentProgressAmount is usually calculated from history, but here we use it for the progress bar.
  const currentProgressAmount = totalPnl; 

  const remainingGoal = sheet?.remainingGoal ?? Math.max(0, targetAnnualGoalAmount - currentProgressAmount);
  
  const dailyRiskLimit = sheet?.riskLimit ?? (profile.currentBalance * (profile.riskPerTradePct / 100));
  const requiredDailyAvg = sheet?.dailyTarget ?? (daysLeft > 0 ? remainingGoal / daysLeft : 0);
  
  const missedDaysPercent = (daysSkipped / totalEffectiveDays) * 100;

  const categoryBreakdown: Record<string, number> = {};
  const strategyBreakdown: Record<string, number> = {};
  const tickersMap: Record<string, TickerStat> = {};
  let stocksTotal = 0;
  let optionsTotal = 0;

  history.forEach(stat => {
    if (stat.status === DayStatus.TRADED) {
      // Category Breakdown
      const catKey = `${stat.category}:${stat.subCategory}`;
      categoryBreakdown[catKey] = (categoryBreakdown[catKey] || 0) + stat.pnlAmount;

      // Allocation
      if (stat.category === 'STOCKS') stocksTotal += Math.abs(stat.pnlAmount);
      if (stat.category === 'OPTIONS') optionsTotal += Math.abs(stat.pnlAmount);

      // Strategy Breakdown
      if (stat.strategy !== 'NONE') {
        strategyBreakdown[stat.strategy] = (strategyBreakdown[stat.strategy] || 0) + stat.pnlAmount;
      }

      // Ticker Performance
      if (stat.ticker) {
        const tKey = stat.ticker.toUpperCase();
        if (!tickersMap[tKey]) {
          tickersMap[tKey] = { ticker: tKey, pnl: 0, count: 0 };
        }
        tickersMap[tKey].pnl += stat.pnlAmount;
        tickersMap[tKey].count += 1;
      }
    }
  });

  const tickerPerformance = Object.values(tickersMap).sort((a, b) => b.pnl - a.pnl);

  return {
    profileId: profile.id,
    currentCapital: profile.currentBalance,
    annualGoalAmount: targetAnnualGoalAmount,
    currentProgressAmount,
    remainingGoal,
    daysLeft,
    dailyRiskLimit,
    requiredDailyAvg,
    missedDaysPercent,
    daysTraded,
    daysSkipped,
    categoryBreakdown,
    strategyBreakdown,
    tickerPerformance,
    allocation: [
      { name: 'Stocks', value: stocksTotal },
      { name: 'Options', value: optionsTotal }
    ].filter(a => a.value > 0)
  };
};

export const checkRiskBreach = (pnl: number, limit: number): boolean => {
  return pnl < 0 && Math.abs(pnl) > limit;
};