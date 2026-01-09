
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RiskProfile, 
  DailyStat, 
  DayStatus, 
  DashboardStats, 
  Alert,
  Language,
  TradeCategory,
  TradeSubCategory,
  OptionStrategy,
  SyncConfig
} from './types';
import { calculateDashboardStats, checkRiskBreach } from './services/riskEngine';
import { getTradingInsights } from './services/geminiService';
import { syncWithGoogleSheets } from './services/googleSheetsService';
import { GlassCard } from './components/GlassCard';
import { MetricBox } from './components/MetricBox';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Cell as PieCell
} from 'recharts';
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  ShieldAlert, 
  History, 
  BrainCircuit, 
  Bell,
  Languages,
  Target,
  Zap,
  ArrowLeft,
  Trash2,
  Save,
  CloudSync,
  Database,
  RefreshCw,
  Info,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  Loader2
} from 'lucide-react';

// --- USER CONFIGURATION ---
// Вставьте ваши данные сюда, чтобы они работали на всех устройствах по умолчанию
// Paste your credentials here to persist them across all devices
const HARDCODED_SHEET_ID = "1W5vMT2H7mTjo8HEqSEfxNofA_IBuIAjs5KSI3-ROjWg"; // e.g., "1W5vMT2H7mTjo8HEqSEfxNofA_IBuIAjs5KSI3-ROjWg"
const HARDCODED_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDzwaEGKKQKG2Q0Ud1lBVhMNH58-OzCKMPiKLWHNPBG0Cf41lloZfgUAmswmJGTd0xWg/exec"; // e.g., "https://script.google.com/macros/s/.../exec"
// --------------------------

const TRANSLATIONS = {
  en: {
    title: "Risk Manager",
    balance: "Current Balance",
    target: "Target",
    remGoal: "Remaining Goal",
    dailyAvg: "Daily Avg Needed",
    riskLimit: "Daily Risk Limit",
    effDays: "Effective Days",
    progress: "PROGRESS",
    pnlChart: "Performance (P&L)",
    aiInsight: "AI Strategy Insight",
    refreshAi: "Refresh Insights",
    viewJournal: "View Journal",
    logBtn: "Log Daily Result",
    activeAlerts: "Active Alerts",
    modalTitle: "Log Trading Day",
    dateLabel: "Trading Date",
    pnlLabel: "P&L Amount ($)",
    tickerLabel: "Ticker (e.g. SPY, TSLA)",
    statusLabel: "Status",
    catLabel: "Category",
    subCatLabel: "Sub-Category",
    stratLabel: "Strategy",
    statusTraded: "Traded",
    statusSkipped: "Skipped",
    projected: "Projected Result",
    confirmBtn: "Confirm & Log",
    breachMsg: "CRITICAL RISK BREACH",
    aiLoading: "Analyzing...",
    noAi: "Log trades for analysis.",
    of: "of",
    breakdown: "P&L Breakdown",
    stocks: "Stocks",
    options: "Options",
    self_work: "Self Work",
    full_time: "FullTime",
    zero_dte: "0DTE",
    long_options: "Long Opt",
    best_tickers: "Top Gainers",
    worst_tickers: "Top Losers",
    strat_perf: "Strategy Performance",
    allocation: "Asset Allocation",
    journal: "Trade Journal",
    settings: "Account Settings",
    initialCap: "Initial Capital",
    riskPct: "Risk per Trade (%)",
    targetPct: "Annual Target (%)",
    totalDays: "Total Trading Days",
    save: "Save Changes",
    delete: "Delete Record",
    emptyJournal: "No trades logged yet.",
    back: "Back to Dashboard",
    syncTitle: "Cloud Synchronization",
    sheetId: "Google Sheet ID",
    scriptUrl: "Apps Script URL",
    syncEnabled: "Enable Sync",
    syncNow: "Sync Now",
    syncSuccess: "Data synchronized!",
    syncError: "Sync failed. Check settings.",
    syncDisclaimer: "SYNC WILL AUTOMATICALLY DOWNLOAD CLOUD RECORDS ON STARTUP AND UPLOAD NEW TRADES UPON LOGGING. ENSURE YOUR APPS SCRIPT IS DEPLOYED.",
    restoring: "Restoring from cloud...",
    strategies: {
      CREDIT_SPREAD: "Credit Spread",
      IRON_CONDOR: "Iron Condor",
      BUTTERFLY: "Butterfly",
      SINGLE_CALL_PUT: "Call/Put",
      STRADDLE_STRANGLE: "Straddle/Strangle"
    }
  },
  ru: {
    title: "Риск-Менеджер",
    balance: "Текущий Баланс",
    target: "Цель",
    remGoal: "Остаток Цели",
    dailyAvg: "Цель на день",
    riskLimit: "Лимит Риска",
    effDays: "Торговые Дни",
    progress: "ПРОГРЕСС",
    pnlChart: "Результаты (P&L)",
    aiInsight: "AI Аналитика Стратегии",
    refreshAi: "Обновить Анализ",
    viewJournal: "Журнал Сделок",
    logBtn: "Ввести результат",
    activeAlerts: "Активные Уведомления",
    modalTitle: "Запись за сегодня",
    dateLabel: "Дата торгов",
    pnlLabel: "Прибыль / Убыток ($)",
    tickerLabel: "Тикер (напр. SPY, TSLA)",
    statusLabel: "Статус дня",
    catLabel: "Инструмент",
    subCatLabel: "Режим / Тип",
    stratLabel: "Стратегия",
    statusTraded: "Торговал",
    statusSkipped: "Пропустил",
    projected: "Прогноз результата",
    confirmBtn: "Подтвердить запись",
    breachMsg: "КРИТИЧЕСКОЕ НАРУШЕНИЕ РИСКА",
    aiLoading: "Анализируем...",
    noAi: "Добавьте сделки для анализа.",
    of: "из",
    breakdown: "Аналитика по видам",
    stocks: "Акции",
    options: "Опционы",
    self_work: "Самост. работа",
    full_time: "FullTime Trading",
    zero_dte: "0DTE Опционы",
    long_options: "Long Options",
    best_tickers: "Лучшие тикеры",
    worst_tickers: "Худшие тикеры",
    strat_perf: "Эффективность стратегий",
    allocation: "Распределение активов",
    journal: "Журнал сделок",
    settings: "Настройки профиля",
    initialCap: "Стартовый капитал",
    riskPct: "Риск на сделку (%)",
    targetPct: "Цель годовая (%)",
    totalDays: "Всего торговых дней",
    save: "Сохранить настройки",
    delete: "Удалить запись",
    emptyJournal: "Журнал пока пуст.",
    back: "На главную",
    syncTitle: "Синхронизация Google",
    sheetId: "ID Google Таблицы",
    scriptUrl: "URL Apps Script",
    syncEnabled: "Включить синхронизацию",
    syncNow: "Синхронизировать сейчас",
    syncSuccess: "Данные синхронизированы!",
    syncError: "Ошибка синхронизации. Проверьте настройки.",
    syncDisclaimer: "СИНХРОНИЗАЦИЯ БУДЕТ АВТОМАТИЧЕСКИ ЗАГРУЖАТЬ ЗАПИСИ ИЗ ОБЛАКА ПРИ ЗАПУСКЕ И ОТПРАВЛЯТЬ НОВЫЕ СДЕЛКИ ПРИ ИХ ДОБАВЛЕНИИ. УБЕДИТЕСЬ, ЧТО ВАШ APPS SCRIPT РАЗВЕРНУТ.",
    restoring: "Восстановление из облака...",
    strategies: {
      CREDIT_SPREAD: "Credit Spread",
      IRON_CONDOR: "Iron Condor",
      BUTTERFLY: "Butterfly",
      SINGLE_CALL_PUT: "Call/Put",
      STRADDLE_STRANGLE: "Straddle/Strangle"
    }
  }
};

type ViewState = 'dashboard' | 'journal' | 'settings';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const getLocalDateString = () => {
  const today = new Date();
  return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('ru');
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const t = TRANSLATIONS[lang];

  const savedProfile = localStorage.getItem('riskProfile');
  const savedHistory = localStorage.getItem('tradeHistory');

  // Initialize profiles with hardcoded defaults if available
  const [profiles, setProfiles] = useState<RiskProfile[]>(() => {
    const initial = savedProfile ? JSON.parse(savedProfile) : [
      {
        id: '1',
        name: 'Scalping Acc',
        initialCapital: 45763.00,
        currentBalance: 45763.00,
        riskPerTradePct: 1.00,
        targetAnnualReturnPct: 15.00,
        totalEffectiveDays: 225.9,
        maxMissedDaysPct: 10.00,
        isActive: true,
        sync: { sheetId: '', scriptUrl: '', isEnabled: false }
      }
    ];

    // Apply hardcoded config if not present or if explicit override desired
    if (HARDCODED_SHEET_ID && HARDCODED_SCRIPT_URL) {
       initial[0].sync = {
         sheetId: HARDCODED_SHEET_ID,
         scriptUrl: HARDCODED_SCRIPT_URL,
         isEnabled: true
       };
    }
    return initial;
  });

  const [activeProfileId, setActiveProfileId] = useState<string>('1');
  const [history, setHistory] = useState<DailyStat[]>(savedHistory ? JSON.parse(savedHistory) : []);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [showLogEntry, setShowLogEntry] = useState(false);
  const [inputDate, setInputDate] = useState<string>(getLocalDateString());
  const [inputPnl, setInputPnl] = useState<string>('');
  const [inputTicker, setInputTicker] = useState<string>('');
  const [inputStatus, setInputStatus] = useState<DayStatus>(DayStatus.TRADED);
  const [inputCategory, setInputCategory] = useState<TradeCategory>('STOCKS');
  const [inputSubCategory, setInputSubCategory] = useState<TradeSubCategory>('SELF_WORK');
  const [inputStrategy, setInputStrategy] = useState<OptionStrategy>('NONE');

  const activeProfile = useMemo(() => profiles.find(p => p.id === activeProfileId) || profiles[0], [profiles, activeProfileId]);
  const stats = useMemo(() => calculateDashboardStats(activeProfile, history), [activeProfile, history]);

  useEffect(() => {
    localStorage.setItem('riskProfile', JSON.stringify(profiles));
    localStorage.setItem('tradeHistory', JSON.stringify(history));
  }, [profiles, history]);

  // Handle Sync Logic
  const handleSync = useCallback(async (forceWrite = false) => {
    if (!activeProfile.sync?.isEnabled || !activeProfile.sync?.sheetId) return;
    
    setIsSyncing(true);
    try {
      const result = await syncWithGoogleSheets(activeProfile.sync, forceWrite ? { profile: activeProfile, journal: history } : undefined);
      
      if (result && !forceWrite) {
        // Read mode: Merge data
        const remoteHistory: DailyStat[] = result.journal || [];
        if (remoteHistory.length > 0) {
           setHistory(remoteHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }

        if (result.profile) {
           // Here we correctly map the new sheetStats from the server to our local Profile state
           const updatedProfile: RiskProfile = {
              ...activeProfile,
              currentBalance: result.profile.currentBalance || activeProfile.currentBalance,
              targetAnnualReturnPct: result.profile.targetAnnualReturnPct || activeProfile.targetAnnualReturnPct,
              // Only update these if sheetStats are present
              sheetStats: result.profile.sheetStats || activeProfile.sheetStats
           };
           updateProfile(updatedProfile);
        }
      }
    } catch (e) { 
      console.error(e);
      if (forceWrite) alert(t.syncError); 
    } finally { 
      setIsSyncing(false); 
      setIsInitialLoad(false);
    }
  }, [activeProfile, history, t.syncError]);

  // Initial Auto-Sync on Mount
  useEffect(() => {
    if (activeProfile.sync?.isEnabled && activeProfile.sync?.scriptUrl) {
      handleSync(false);
    } else {
      setIsInitialLoad(false);
    }
  }, []); 

  // Auto-sync on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeProfile.sync?.isEnabled) {
        handleSync(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleSync, activeProfile.sync?.isEnabled]);


  const handleAddRecord = async () => {
    const pnl = parseFloat(inputPnl) || 0;
    const newStat: DailyStat = {
      id: Math.random().toString(36).substr(2, 9),
      profileId: activeProfileId,
      date: inputDate,
      pnlAmount: pnl,
      status: inputStatus,
      category: inputStatus === DayStatus.TRADED ? inputCategory : 'NONE',
      subCategory: inputStatus === DayStatus.TRADED ? inputSubCategory : 'NONE',
      strategy: inputStatus === DayStatus.TRADED ? inputStrategy : 'NONE',
      ticker: inputStatus === DayStatus.TRADED ? inputTicker.trim().toUpperCase() : '',
      startOfDayBalance: activeProfile.currentBalance,
      riskLimitSnapshot: stats.dailyRiskLimit,
    };

    const updatedHistory = [...history, newStat].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setHistory(updatedHistory);
    // Note: We do NOT update balance locally here anymore if we want to rely on the Sheet as the source of truth.
    // But for UX responsiveness, we can update it temporarily. 
    // Ideally, the user syncs after adding a trade, and the sheet formula updates the balance, then syncs back.
    // For now, we update local balance for immediate feedback.
    const updatedProfile = { ...activeProfile, currentBalance: activeProfile.currentBalance + pnl };
    setProfiles(profiles.map(p => p.id === activeProfileId ? updatedProfile : p));

    if (checkRiskBreach(pnl, stats.dailyRiskLimit)) {
      setAlerts(prev => [{
        id: Date.now().toString(), type: 'RISK',
        message: { en: `RISK BREACH: Loss $${Math.abs(pnl)} > limit $${stats.dailyRiskLimit}`, ru: `НАРУШЕНИЕ: Убыток $${Math.abs(pnl)} > лимита $${stats.dailyRiskLimit}` },
        timestamp: new Date()
      }, ...prev]);
    }

    if (activeProfile.sync?.isEnabled) {
      setIsSyncing(true);
      syncWithGoogleSheets(activeProfile.sync, { profile: updatedProfile, journal: updatedHistory })
        .catch(() => alert(t.syncError))
        .finally(() => setIsSyncing(false));
    }
    
    setShowLogEntry(false);
    setInputPnl('');
    setInputTicker('');
    setInputDate(getLocalDateString());
  };

  const deleteRecord = (id: string) => {
    const record = history.find(h => h.id === id);
    if (!record) return;
    const updatedHistory = history.filter(h => h.id !== id);
    setHistory(updatedHistory);
    const updatedProfile = { ...activeProfile, currentBalance: activeProfile.currentBalance - record.pnlAmount };
    setProfiles(prev => prev.map(p => p.id === activeProfileId ? updatedProfile : p));

    if (activeProfile.sync?.isEnabled) {
      setIsSyncing(true);
      syncWithGoogleSheets(activeProfile.sync, { profile: updatedProfile, journal: updatedHistory })
        .catch(() => alert(t.syncError))
        .finally(() => setIsSyncing(false));
    }
  };

  const updateProfile = (updates: Partial<RiskProfile>) => setProfiles(prev => prev.map(p => p.id === activeProfileId ? { ...p, ...updates } : p));
  const updateSyncConfig = (updates: Partial<SyncConfig>) => setProfiles(prev => prev.map(p => p.id === activeProfileId ? { ...p, sync: { ...(p.sync || { sheetId: '', scriptUrl: '', isEnabled: false }), ...updates } } : p));

  // --- Handle direct updates from Dashboard (Simplified to only visual updates if needed, since Sheet drives truth) ---
  const handleProfileFieldUpdate = (field: keyof RiskProfile, value: string) => {
     // NOTE: Since we are now driven by Sheet cells, direct editing might be overwritten on next sync.
     // However, we allow it for temporary adjustments or if sync is off.
     const numValue = parseFloat(value);
     if (!isNaN(numValue)) updateProfile({ [field]: numValue });
  };

  const generateAiInsights = async () => {
    if (history.length === 0) return;
    setIsAiLoading(true);
    try {
      const insight = await getTradingInsights(activeProfile, history, lang);
      setAiInsight(insight || null);
    } catch (error) {
      console.error("AI Insight Error:", error);
      setAiInsight(lang === 'ru' ? "Ошибка генерации аналитики" : "Error generating insights");
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Sync Status Indicator */}
      {isSyncing && (
        <div className="flex justify-center mb-4">
           <div className="bg-blue-600/10 text-blue-600 px-4 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-blue-600/20">
             <Loader2 size={12} className="animate-spin" />
             {t.restoring}
           </div>
        </div>
      )}

      {/* Control Center Card */}
      <GlassCard className="mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={120} className="text-blue-500" /></div>
        
        {/* Top Row: Balance & Target */}
        <div className="flex justify-between items-start mb-10 relative z-10">
          <MetricBox 
            label={t.balance} 
            value={stats.currentCapital.toLocaleString()}
            prefix="$"
            color="text-blue-600 text-2xl" 
          />
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-slate-500 uppercase">{t.target} %</span>
               <MetricBox 
                 label=""
                 value={activeProfile.targetAnnualReturnPct}
                 suffix="%"
                 color="text-slate-900 text-sm"
               />
            </div>
            <div className="text-lg font-black text-slate-900 mt-1">${stats.annualGoalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-y-8 gap-x-4 relative z-10">
          <MetricBox label={t.remGoal} value={`$${stats.remainingGoal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <MetricBox label={t.dailyAvg} value={`$${stats.requiredDailyAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="text-emerald-600" />
          
          <MetricBox 
            label={t.riskLimit} 
            value={stats.dailyRiskLimit.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
            prefix="$"
            color="text-rose-500"
          />
          
          <MetricBox 
            label={t.effDays} 
            value={stats.daysLeft} 
            subValue={`${t.of} ${activeProfile.sheetStats?.totalDays || activeProfile.totalEffectiveDays}`} 
          />
        </div>

        <div className="mt-10">
          <div className="flex justify-between text-[10px] font-black text-slate-500 mb-3 tracking-widest uppercase">
            <span>{t.progress}</span>
            <span className="text-blue-600 font-black">{Math.round((stats.currentProgressAmount / stats.annualGoalAmount) * 100)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-white p-[1px]">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(37,99,235,0.3)]" style={{ width: `${Math.min(100, Math.max(2, (stats.currentProgressAmount / stats.annualGoalAmount) * 100))}%` }} />
          </div>
        </div>
      </GlassCard>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><LayoutDashboard size={14} className="text-blue-500" /> {t.breakdown}</h3>
          <GlassCard className="flex flex-col gap-4">
            <div className="h-40 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.allocation} innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                    {stats.allocation.map((_, index) => <PieCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {(Object.entries(stats.categoryBreakdown) as [string, number][]).map(([key, val]) => {
              const [cat, sub] = key.split(':');
              const label = (t as any)[cat.toLowerCase()] + ' (' + (t as any)[sub.toLowerCase()] + ')';
              return (
                <div key={key} className="flex justify-between items-center group">
                  <span className="text-xs font-bold text-slate-600">{label}</span>
                  <span className={`text-sm font-black ${val >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{val > 0 ? '+' : ''}{val.toFixed(2)}$</span>
                </div>
              );
            })}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /> {t.best_tickers}</h3>
          <GlassCard className="space-y-4">
            {stats.tickerPerformance.slice(0, 5).map((item, idx) => (
              <div key={item.ticker} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400">{idx + 1}</span>
                  <span className="text-sm font-black text-slate-800">{item.ticker}</span>
                  <span className="text-[8px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{item.count} trades</span>
                </div>
                <span className={`text-sm font-black ${item.pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{item.pnl > 0 ? '+' : ''}{item.pnl.toFixed(2)}$</span>
              </div>
            ))}
            {stats.tickerPerformance.length > 5 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase mb-2 block">{t.worst_tickers}</span>
                {stats.tickerPerformance.slice(-2).reverse().map(item => (
                  <div key={item.ticker} className="flex justify-between items-center opacity-70 mb-2 last:mb-0">
                     <span className="text-sm font-black text-slate-800">{item.ticker}</span>
                     <span className="text-sm font-black text-rose-500">{item.pnl.toFixed(2)}$</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {Object.keys(stats.strategyBreakdown).length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2 mb-4"><Zap size={14} className="text-purple-500" /> {t.strat_perf}</h3>
          <GlassCard className="grid grid-cols-1 gap-4">
             {(Object.entries(stats.strategyBreakdown) as [string, number][]).map(([strat, val]) => (
               <div key={strat} className="flex justify-between items-center p-3 rounded-xl bg-white/40 border border-white/60">
                 <span className="text-xs font-bold text-slate-700">{(t.strategies as any)[strat]}</span>
                 <div className="flex items-center gap-3">
                   <span className={`text-sm font-black ${val >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{val > 0 ? '+' : ''}{val.toFixed(2)}$</span>
                   {val >= 0 ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-rose-500" />}
                 </div>
               </div>
             ))}
          </GlassCard>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">{t.pnlChart}</h3>
        <GlassCard className="h-56 p-2 bg-white/30 border-white/60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history.slice(-10)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b'}} tickFormatter={(s) => s.split('-').slice(1).join('/')} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b'}} />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} />
              <Bar dataKey="pnlAmount" radius={[6, 6, 0, 0]} barSize={24}>
                {history.slice(-10).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.pnlAmount >= 0 ? '#10b981' : '#f43f5e'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <GlassCard className="mb-6 border-blue-200 bg-blue-50/50 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none"><BrainCircuit size={100} className="text-blue-500" /></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-blue-100"><BrainCircuit size={18} className="text-blue-600" /></div>
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">{t.aiInsight}</h3>
          {isAiLoading && <div className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">{isAiLoading ? t.aiLoading : (aiInsight || t.noAi)}</div>
        <button onClick={generateAiInsights} disabled={isAiLoading || history.length === 0} className="mt-4 px-4 py-2 bg-blue-600/10 rounded-xl text-[10px] font-black uppercase text-blue-600 border border-blue-600/20 flex items-center gap-2 hover:bg-blue-600/20 transition-all"><BrainCircuit size={14} /> {t.refreshAi}</button>
      </GlassCard>

      <div className="mb-8"><GlassCard className="flex flex-col items-center justify-center py-8 bg-white active:bg-blue-50" onClick={() => setCurrentView('journal')}><div className="p-3 rounded-2xl bg-blue-50 mb-3 text-blue-600"><History size={24} /></div><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.viewJournal}</span></GlassCard></div>
      <button onClick={() => setShowLogEntry(true)} className="w-full h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[28px] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 border border-white/20 active:scale-95 transition-all"><Plus size={20} className="bg-white/20 rounded-full p-0.5" /> {t.logBtn}</button>
    </div>
  );

  const renderSettings = () => (
    <div className="animate-in slide-in-from-right-4 duration-500 space-y-8">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setCurrentView('dashboard')} className="p-2 rounded-xl glass-card text-slate-500 hover:text-slate-900">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">{t.settings}</h2>
      </div>

      {/* Profile Card */}
      <GlassCard className="space-y-6">
        <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
          <Database size={14} /> Profile Data
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.initialCap}</label>
            <input type="number" value={activeProfile.initialCapital} onChange={(e) => updateProfile({ initialCapital: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.riskPct}</label>
            <input type="number" value={activeProfile.riskPerTradePct} onChange={(e) => updateProfile({ riskPerTradePct: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.targetPct}</label>
            <input type="number" value={activeProfile.targetAnnualReturnPct} onChange={(e) => updateProfile({ targetAnnualReturnPct: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.totalDays}</label>
            <input type="number" value={activeProfile.totalEffectiveDays} onChange={(e) => updateProfile({ totalEffectiveDays: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
          </div>
        </div>
      </GlassCard>

      {/* Sync Card */}
      <GlassCard className="space-y-6 border-blue-100 bg-blue-50/40">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <CloudSync size={16} /> {t.syncTitle}
          </h3>
          <button onClick={() => updateSyncConfig({ isEnabled: !activeProfile.sync?.isEnabled })} className={`w-12 h-6 rounded-full transition-all relative ${activeProfile.sync?.isEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${activeProfile.sync?.isEnabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.sheetId}</label>
            <input type="text" value={activeProfile.sync?.sheetId || ''} onChange={(e) => updateSyncConfig({ sheetId: e.target.value })} placeholder="1...XXXXX" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t.scriptUrl}</label>
            <input type="text" value={activeProfile.sync?.scriptUrl || ''} onChange={(e) => updateSyncConfig({ scriptUrl: e.target.value })} placeholder="https://script.google.com/..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
          </div>
          <button 
            onClick={() => handleSync(true)} 
            disabled={isSyncing}
            className="w-full h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-600/20 transition-colors"
          >
            {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {t.syncNow}
          </button>
          <div className="p-3 bg-blue-100/50 rounded-xl flex items-start gap-2 border border-blue-100">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[8px] text-blue-800/70 font-bold leading-relaxed uppercase">
              {t.syncDisclaimer}
            </p>
          </div>
        </div>
      </GlassCard>

      <button onClick={() => setCurrentView('dashboard')} className="w-full h-16 bg-slate-900 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[24px] flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all shadow-xl">
        <Save size={18} /> {t.save}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 text-slate-900 p-4 max-w-lg mx-auto overflow-y-auto selection:bg-blue-100">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div onClick={() => setCurrentView('dashboard')} className="cursor-pointer">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent flex items-center gap-2"><Zap className="text-blue-600 fill-blue-500/10" size={24} /> {t.title}</h1>
          <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase mt-1">Liquid Glass Edition</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLang(l => l === 'ru' ? 'en' : 'ru')} className="p-3 rounded-2xl glass-card flex items-center gap-2 hover:bg-white transition-all"><Languages size={18} className="text-blue-600" /><span className="text-[10px] font-black uppercase text-slate-600">{lang}</span></button>
          <button onClick={() => setCurrentView('settings')} className={`p-3 rounded-2xl glass-card transition-all ${currentView === 'settings' ? 'text-blue-600 bg-white border-blue-200' : 'text-slate-500 hover:text-slate-900'}`}><Settings size={18} /></button>
        </div>
      </header>

      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'journal' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setCurrentView('dashboard')} className="p-2 rounded-xl glass-card text-slate-500 hover:text-slate-900 transition-all"><ArrowLeft size={20} /></button>
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-800">{t.journal}</h2>
          </div>
          {history.length === 0 ? <div className="text-center py-20 opacity-30"><History size={48} className="mx-auto mb-4 text-slate-400" /><p className="text-sm font-bold uppercase text-slate-400">{t.emptyJournal}</p></div> : (
            <div className="space-y-4">{[...history].reverse().map(item => (
              <GlassCard key={item.id} className="group !p-4 bg-white/60">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{item.date}</span>
                      {item.ticker && <span className="text-[10px] font-black text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded uppercase">{item.ticker}</span>}
                    </div>
                    <div className="text-xs font-bold text-slate-700">{(t as any)[item.category.toLowerCase()]} / {(t as any)[item.subCategory.toLowerCase()]}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-black ${item.pnlAmount >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{item.pnlAmount.toFixed(2)}$</span>
                    <button onClick={() => deleteRecord(item.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              </GlassCard>
            ))}</div>
          )}
        </div>
      )}
      {currentView === 'settings' && renderSettings()}

      {showLogEntry && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowLogEntry(false)} />
          <div className="glass-panel w-full max-w-md rounded-[40px] p-8 relative animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 cursor-pointer" onClick={() => setShowLogEntry(false)} />
            <h2 className="text-2xl font-black mb-8 text-slate-900">{t.modalTitle}</h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.dateLabel}</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={inputDate} 
                    onChange={(e) => setInputDate(e.target.value)} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 pl-12 focus:outline-none focus:border-blue-500/30 text-sm font-bold uppercase text-slate-900" 
                  />
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.pnlLabel}</label><input type="number" value={inputPnl} autoFocus onChange={(e) => setInputPnl(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 focus:outline-none focus:border-blue-500/30 text-2xl font-black text-slate-900" /></div>
              {inputStatus === DayStatus.TRADED && (
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.tickerLabel}</label><input type="text" value={inputTicker} onChange={(e) => setInputTicker(e.target.value)} placeholder="AAPL" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 focus:outline-none focus:border-blue-500/30 text-sm font-bold uppercase text-slate-900" /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setInputStatus(DayStatus.TRADED)} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${inputStatus === DayStatus.TRADED ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{t.statusTraded}</button>
                <button onClick={() => setInputStatus(DayStatus.SKIPPED)} className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${inputStatus === DayStatus.SKIPPED ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{t.statusSkipped}</button>
              </div>
              {inputStatus === DayStatus.TRADED && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setInputCategory('STOCKS')} className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${inputCategory === 'STOCKS' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>{t.stocks}</button>
                    <button onClick={() => setInputCategory('OPTIONS')} className={`py-3 rounded-xl border-2 text-xs font-bold transition-all ${inputCategory === 'OPTIONS' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>{t.options}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {inputCategory === 'STOCKS' ? (
                      <><button onClick={() => setInputSubCategory('SELF_WORK')} className={`py-3 rounded-xl border-2 text-[10px] font-bold transition-all ${inputSubCategory === 'SELF_WORK' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>{t.self_work}</button><button onClick={() => setInputSubCategory('FULL_TIME')} className={`py-3 rounded-xl border-2 text-[10px] font-bold transition-all ${inputSubCategory === 'FULL_TIME' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>{t.full_time}</button></>
                    ) : (
                      <><button onClick={() => setInputSubCategory('ZERO_DTE')} className={`py-3 rounded-xl border-2 text-[10px] font-bold transition-all ${inputSubCategory === 'ZERO_DTE' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>{t.zero_dte}</button><button onClick={() => setInputSubCategory('LONG_OPTIONS')} className={`py-3 rounded-xl border-2 text-[10px] font-bold transition-all ${inputSubCategory === 'LONG_OPTIONS' ? 'bg-white border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>{t.long_options}</button></>
                    )}
                  </div>
                  {inputCategory === 'OPTIONS' && (
                    <select value={inputStrategy} onChange={(e) => setInputStrategy(e.target.value as OptionStrategy)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 appearance-none focus:border-blue-500 transition-all">
                      {Object.entries(t.strategies).map(([key, val]) => <option key={key} value={key} className="bg-white">{val}</option>)}
                    </select>
                  )}
                </>
              )}
              <button onClick={handleAddRecord} className="w-full h-16 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-3xl active:scale-95 transition-all mt-4 shadow-xl">
                {t.confirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
