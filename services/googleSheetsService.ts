
import { DailyStat, RiskProfile, SyncConfig } from '../types';

/**
 * World-class synchronization service.
 * Uses a Google Apps Script Web App as a proxy to avoid OAuth complexity for the user.
 * The script on the Google side handles reading/writing to the sheet by ID.
 */

export const syncWithGoogleSheets = async (config: SyncConfig, data?: { profile: RiskProfile, journal: DailyStat[] }) => {
  if (!config.isEnabled || !config.scriptUrl || !config.sheetId) return null;

  try {
    const response = await fetch(config.scriptUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Apps Script handles text/plain POST better in some CORS contexts
      },
      body: JSON.stringify({
        action: data ? 'WRITE' : 'READ',
        sheetId: config.sheetId,
        payload: data
      }),
    });

    if (!response.ok) throw new Error('Network response was not ok');
    
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    
    return result.data;
  } catch (error) {
    console.error('Google Sync Error:', error);
    throw error;
  }
};

/**
 * INSTRUCTIONS FOR USER (Apps Script Code):
 * 
 * function doPost(e) {
 *   const request = JSON.parse(e.postData.contents);
 *   const ss = SpreadsheetApp.openById(request.sheetId);
 *   const profileSheet = ss.getSheetByName('Profile') || ss.insertSheet('Profile');
 *   const journalSheet = ss.getSheetByName('Journal') || ss.insertSheet('Journal');
 * 
 *   if (request.action === 'WRITE') {
 *     const p = request.payload.profile;
 *     profileSheet.clear();
 *     profileSheet.appendRow(['Capital', 'Risk', 'Target', 'Days']);
 *     profileSheet.appendRow([p.initialCapital, p.riskPerTradePct, p.targetAnnualReturnPct, p.totalEffectiveDays]);
 * 
 *     journalSheet.clear();
 *     journalSheet.appendRow(['ID', 'Date', 'PnL', 'Status', 'Category', 'SubCategory', 'Strategy']);
 *     request.payload.journal.forEach(item => {
 *       journalSheet.appendRow([item.id, item.date, item.pnlAmount, item.status, item.category, item.subCategory, item.strategy]);
 *     });
 *     return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
 *   }
 * 
 *   if (request.action === 'READ') {
 *     const pData = profileSheet.getDataRange().getValues();
 *     const jData = journalSheet.getDataRange().getValues();
 *     const profile = pData.length > 1 ? {
 *       initialCapital: pData[1][0],
 *       riskPerTradePct: pData[1][1],
 *       targetAnnualReturnPct: pData[1][2],
 *       totalEffectiveDays: pData[1][3]
 *     } : null;
 * 
 *     const journal = jData.length > 1 ? jData.slice(1).map(row => ({
 *       id: row[0], date: row[1], pnlAmount: row[2], status: row[3], category: row[4], subCategory: row[5], strategy: row[6]
 *     })) : [];
 * 
 *     return ContentService.createTextOutput(JSON.stringify({status: 'ok', data: {profile, journal}})).setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 */
