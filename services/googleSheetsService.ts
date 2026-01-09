
import { DailyStat, RiskProfile, SyncConfig, SheetStats } from '../types';

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
!!! ВАЖНО / IMPORTANT !!!
СКОПИРУЙТЕ ВЕСЬ КОД НИЖЕ И ВСТАВЬТЕ В ФАЙЛ Code.gs В ВАШЕМ ПРОЕКТЕ GOOGLE APPS SCRIPT
COPY ALL CODE BELOW AND PASTE IT INTO THE Code.gs FILE IN YOUR GOOGLE APPS SCRIPT PROJECT
======================================================================================

const CONFIG = {
  ZERO_DTE: { sheetName: 'OPTIONS_POSITIONAL', colId: 0, colTicker: 1, colPnL: 8, colDate: 9 },
  STOCKS: { sheetName: 'TRADING_LOG', colDate: 0, colTicker: 1, colQty: 3, colEntry: 4, colExit: 5, colPnL: 7 }, // Added colPnL: 7 (Column H)
  LONG_OPT: { sheetName: 'OPTIONS_DAILY', colDate: 0, colTicker: 1, colContracts: 4, colExit: 6, colPnL: 7 }
};

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', message: 'Script is running.' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("No data");
    const request = JSON.parse(e.postData.contents);
    if (!request.sheetId) throw new Error("Missing sheetId");
    
    const ss = SpreadsheetApp.openById(request.sheetId);
    
    if (request.action === 'WRITE') return writeData(ss, request.payload);
    if (request.action === 'READ') return readData(ss);
    
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
    if (typeof dateObj.getMonth === 'function') return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
    return String(dateObj).split('T')[0];
  } catch (e) { return String(dateObj); }
}

function getCellValue(ss, sheetName, cellA1) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  return sheet.getRange(cellA1).getValue();
}

function readData(ss) {
  // --- ЧТЕНИЕ СПЕЦИФИЧЕСКИХ ЯЧЕЕК (ЭНДПОЙНТЫ) ---
  const profile = {
    currentBalance: Number(getCellValue(ss, 'CAPITAL', 'E2')),
    targetAnnualReturnPct: Number(getCellValue(ss, 'SETTINGS', 'B3')) * 100, // Если в таблице 0.15, умножаем на 100 для %
    
    // Новые поля статистики из таблицы
    sheetStats: {
      targetAmountDollar: Number(getCellValue(ss, 'SETTINGS', 'B4')),
      remainingGoal: Number(getCellValue(ss, 'CAPITAL', 'J2')),
      dailyTarget: Number(getCellValue(ss, 'DAILY_TARGET', 'D2')),
      riskLimit: Number(getCellValue(ss, 'RISK', 'B7')),
      daysTraded: Number(getCellValue(ss, 'SETTINGS', 'B9')),
      totalDays: Number(getCellValue(ss, 'SETTINGS', 'B8'))
    }
  };

  const journal = [];

  // 1. 0DTE
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

  // 2. STOCKS
  const sheetStocks = ss.getSheetByName(CONFIG.STOCKS.sheetName);
  if (sheetStocks) {
    const data = sheetStocks.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[CONFIG.STOCKS.colTicker]) continue;
      
      // Use Column H (Index 7) to check PnL
      const pnl = Number(row[CONFIG.STOCKS.colPnL]) || 0;
      
      // Filter: If PnL is 0, skip this record
      if (pnl === 0) continue;

      journal.push({
        id: 'stk_' + i + '_' + (row[CONFIG.STOCKS.colTicker]),
        date: formatDate(row[CONFIG.STOCKS.colDate] || new Date()), 
        pnlAmount: pnl, // Use value from sheet
        status: 'TRADED',
        category: 'STOCKS',
        subCategory: 'SELF_WORK',
        strategy: 'NONE',
        ticker: String(row[CONFIG.STOCKS.colTicker] || '')
      });
    }
  }

  // 3. LONG OPTIONS
  const sheetLong = ss.getSheetByName(CONFIG.LONG_OPT.sheetName);
  if (sheetLong) {
    const data = sheetLong.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[CONFIG.LONG_OPT.colTicker]) continue;
      journal.push({
        id: 'lopt_' + i,
        date: formatDate(row[CONFIG.LONG_OPT.colDate]),
        pnlAmount: Number(row[CONFIG.LONG_OPT.colPnL]) || 0,
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
  // Мы не перезаписываем профиль полностью, чтобы не сломать формулы в таблице
  // Записываем только сделки
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
