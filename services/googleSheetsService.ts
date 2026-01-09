
import { DailyStat, RiskProfile, SyncConfig } from '../types';

/**
 * Service for synchronizing data with Google Sheets via Apps Script.
 */

// Helper to extract ID if user pastes full URL
const cleanSheetId = (idOrUrl: string): string => {
  if (!idOrUrl) return '';
  // Check if it looks like a URL
  const match = idOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : idOrUrl.trim();
};

export const syncWithGoogleSheets = async (config: SyncConfig, data?: { profile: RiskProfile, journal: DailyStat[] }) => {
  if (!config.isEnabled || !config.scriptUrl || !config.sheetId) return null;

  const validSheetId = cleanSheetId(config.sheetId);

  try {
    const response = await fetch(config.scriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: data ? 'WRITE' : 'READ',
        sheetId: validSheetId,
        payload: data
      }),
    });

    if (!response.ok) {
       // Try to parse error text if possible
       const text = await response.text();
       throw new Error(`Network response was not ok (${response.status}): ${text}`);
    }
    
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    
    return result.data;
  } catch (error) {
    console.error('Google Sync Error:', error);
    throw error;
  }
};

/*
======================================================================================
КОПИРУЙТЕ КОД НИЖЕ В GOOGLE APPS SCRIPT (Extensions > Apps Script)
COPY THE CODE BELOW INTO GOOGLE APPS SCRIPT
======================================================================================

// --- НАСТРОЙКИ КОЛОНОК (КОНФИГУРАЦИЯ) ---
// Индексы колонок начинаются с 0 (A=0, B=1, C=2, ... I=8, J=9)

const CONFIG = {
  // Лист 0DTE опционов
  ZERO_DTE: {
    sheetName: 'OPTIONS_POSITIONAL',
    colId: 0,        // A: ID
    colTicker: 1,    // B: Ticker
    colPnL: 8,       // I: Realized
    colDate: 9       // J: Close Date
  },
  // Лист Акций
  STOCKS: {
    sheetName: 'TRADING_LOG',
    colDate: 0,      // A: Date (Предполагаем, что дата в A)
    colTicker: 1,    // B: Ticker
    colQty: 3,       // D: Quantity
    colEntry: 4,     // E: Price (Entry)
    colExit: 5,      // F: Exit Price
    // PnL считается как (Exit - Entry) * Qty
  },
  // Лист Long Options
  LONG_OPT: {
    sheetName: 'OPTIONS_DAILY',
    colDate: 0,      // A: Date
    colTicker: 1,    // B: Ticker
    colContracts: 4, // E: Contracts
    colExit: 6,      // G: Exit
    colPnL: 7        // H: Предполагаем PnL здесь (так как только Contracts/Exit указаны)
  },
  // Лист Профиля
  PROFILE: {
    sheetName: 'Profile' 
  }
};

// Функция для обработки GET запросов (чтобы проверить, работает ли скрипт в браузере)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'active',
    message: 'Script is running. Use POST to send data.'
  })).setMimeType(ContentService.MimeType.JSON);
}

// Функция для обработки POST запросов (отправка данных из приложения)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No post data received");
    }

    const request = JSON.parse(e.postData.contents);
    
    if (!request.sheetId) {
      throw new Error("Missing sheetId");
    }

    const ss = SpreadsheetApp.openById(request.sheetId);
    
    if (request.action === 'WRITE') {
      return writeData(ss, request.payload);
    }

    if (request.action === 'READ') {
      return readData(ss);
    }
    
    throw new Error("Unknown action");
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function formatDate(dateObj) {
  if (!dateObj) return '';
  try {
    if (typeof dateObj.getMonth === 'function') {
       return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return String(dateObj).split('T')[0];
  } catch (e) { return String(dateObj); }
}

function readData(ss) {
  const profileSheet = ss.getSheetByName(CONFIG.PROFILE.sheetName);
  let profile = null;
  
  if (profileSheet) {
    const pData = profileSheet.getDataRange().getValues();
    if (pData.length > 1) {
      profile = {
        initialCapital: Number(pData[1][0]),
        riskPerTradePct: Number(pData[1][1]),
        targetAnnualReturnPct: Number(pData[1][2]),
        totalEffectiveDays: Number(pData[1][3]),
        currentBalance: Number(pData[1][4]),
        name: pData[1][5] || 'Trader'
      };
    }
  }

  const journal = [];

  // 1. Читаем 0DTE
  const sheetZero = ss.getSheetByName(CONFIG.ZERO_DTE.sheetName);
  if (sheetZero) {
    const data = sheetZero.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[CONFIG.ZERO_DTE.colDate] && !row[CONFIG.ZERO_DTE.colTicker]) continue;
      
      journal.push({
        id: String(row[CONFIG.ZERO_DTE.colId] || ('zdte_' + i)),
        date: formatDate(row[CONFIG.ZERO_DTE.colDate]),
        pnlAmount: Number(row[CONFIG.ZERO_DTE.colPnL]) || 0,
        status: 'TRADED',
        category: 'OPTIONS',
        subCategory: 'ZERO_DTE',
        strategy: 'NONE',
        ticker: String(row[CONFIG.ZERO_DTE.colTicker] || '')
      });
    }
  }

  // 2. Читаем STOCKS
  const sheetStocks = ss.getSheetByName(CONFIG.STOCKS.sheetName);
  if (sheetStocks) {
    const data = sheetStocks.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[CONFIG.STOCKS.colTicker]) continue;

      const qty = Number(row[CONFIG.STOCKS.colQty]) || 0;
      const entry = Number(row[CONFIG.STOCKS.colEntry]) || 0;
      const exit = Number(row[CONFIG.STOCKS.colExit]) || 0;
      let pnl = 0;
      if (exit !== 0 && entry !== 0) {
        pnl = (exit - entry) * qty;
      }

      journal.push({
        id: 'stk_' + i + '_' + (row[CONFIG.STOCKS.colTicker]),
        date: formatDate(row[CONFIG.STOCKS.colDate] || new Date()), 
        pnlAmount: pnl,
        status: 'TRADED',
        category: 'STOCKS',
        subCategory: 'SELF_WORK',
        strategy: 'NONE',
        ticker: String(row[CONFIG.STOCKS.colTicker] || '')
      });
    }
  }

  // 3. Читаем LONG OPTIONS
  const sheetLong = ss.getSheetByName(CONFIG.LONG_OPT.sheetName);
  if (sheetLong) {
    const data = sheetLong.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[CONFIG.LONG_OPT.colTicker]) continue;

      const pnl = Number(row[CONFIG.LONG_OPT.colPnL]) || 0;

      journal.push({
        id: 'lopt_' + i,
        date: formatDate(row[CONFIG.LONG_OPT.colDate]),
        pnlAmount: pnl,
        status: 'TRADED',
        category: 'OPTIONS',
        subCategory: 'LONG_OPTIONS',
        strategy: 'NONE',
        ticker: String(row[CONFIG.LONG_OPT.colTicker] || '')
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok', 
    data: { profile, journal }
  })).setMimeType(ContentService.MimeType.JSON);
}

function writeData(ss, payload) {
  // 1. Профиль
  const profileSheet = ss.getSheetByName(CONFIG.PROFILE.sheetName) || ss.insertSheet(CONFIG.PROFILE.sheetName);
  profileSheet.clear();
  profileSheet.appendRow(['Capital', 'Risk', 'Target', 'Days', 'Balance', 'Name']);
  const p = payload.profile;
  profileSheet.appendRow([p.initialCapital, p.riskPerTradePct, p.targetAnnualReturnPct, p.totalEffectiveDays, p.currentBalance, p.name]);

  // 2. Запись сделки (берем последнюю для примера)
  const journal = payload.journal;
  const lastTrade = journal[journal.length - 1];
  if (!lastTrade) return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
  
  let targetSheet;
  let rowData = [];
  
  if (lastTrade.subCategory === 'ZERO_DTE') {
    targetSheet = ss.getSheetByName(CONFIG.ZERO_DTE.sheetName);
    rowData = new Array(15).fill('');
    rowData[CONFIG.ZERO_DTE.colId] = lastTrade.id;
    rowData[CONFIG.ZERO_DTE.colTicker] = lastTrade.ticker;
    rowData[CONFIG.ZERO_DTE.colPnL] = lastTrade.pnlAmount;
    rowData[CONFIG.ZERO_DTE.colDate] = lastTrade.date;
    
  } else if (lastTrade.category === 'STOCKS') {
    targetSheet = ss.getSheetByName(CONFIG.STOCKS.sheetName);
    rowData = new Array(10).fill('');
    rowData[CONFIG.STOCKS.colDate] = lastTrade.date;
    rowData[CONFIG.STOCKS.colTicker] = lastTrade.ticker;
    rowData[6] = "PnL: " + lastTrade.pnlAmount; 
    
  } else if (lastTrade.subCategory === 'LONG_OPTIONS') {
    targetSheet = ss.getSheetByName(CONFIG.LONG_OPT.sheetName);
    rowData = new Array(10).fill('');
    rowData[CONFIG.LONG_OPT.colDate] = lastTrade.date;
    rowData[CONFIG.LONG_OPT.colTicker] = lastTrade.ticker;
    rowData[CONFIG.LONG_OPT.colPnL] = lastTrade.pnlAmount;
  }
  
  if (targetSheet) {
    targetSheet.appendRow(rowData);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
}
*/
