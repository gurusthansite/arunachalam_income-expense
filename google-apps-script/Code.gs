/**
 * ORGANIZATION INCOME AND EXPENSE MANAGER - GOOGLE APPS SCRIPT
 * Pure ASCII - 100% safe for Google Apps Script editor
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ledger App')
    .addItem('Setup All Sheets', 'setupCompleteSheeting')
    .addItem('Add Contact Number Column', 'addContactNumberColumn')
    .addItem('Re-apply Formatting', 'setupCompleteSheeting')
    .addItem('Add Sample Transactions', 'addSampleTransactions')
    .addToUi();
}

/**
 * 1-Click Function to insert ContactNumber into Column G
 * Keeps all existing rows 100% safe!
 */
function addContactNumberColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();

  var firstRow = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var hasContact = false;
  for (var c = 0; c < firstRow.length; c++) {
    if (String(firstRow[c] || '').toLowerCase().indexOf('contact') >= 0) {
      hasContact = true;
      break;
    }
  }

  if (!hasContact) {
    // Inserts Column G right after Party (Column F)
    sheet.insertColumnAfter(6);
    sheet.getRange(1, 7).setValue('ContactNumber')
      .setFontWeight('bold')
      .setFontColor('#ffffff')
      .setBackground('#1e293b')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setColumnWidth(7, 150);
    sheet.getRange('G2:G').setNumberFormat('@').setHorizontalAlignment('left');
  }

  SpreadsheetApp.flush();
}

/**
 * Main Setup Function:
 * Creates and formats all sheets automatically.
 * You can safely run this directly from the Apps Script dropdown!
 */
function setupCompleteSheeting(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();

  setupSummarySheet(ss);
  setupTransactionsSheet(ss);
  setupCategoriesSheet(ss);
  setupSettingsSheet(ss);

  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      if (defaultSheet.getLastRow() <= 1) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) {}
  }

  SpreadsheetApp.flush();
}

function setupSummarySheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Summary');
  if (!sheet) {
    sheet = ss.insertSheet('Summary', 0);
  }

  sheet.clear();
  sheet.setColumnWidth(1, 30);
  sheet.setColumnWidth(2, 230);
  sheet.setColumnWidth(3, 170);
  sheet.setColumnWidth(4, 30);
  sheet.setColumnWidth(5, 230);
  sheet.setColumnWidth(6, 170);

  // Title Banner
  sheet.getRange('B2:F2').merge()
    .setValue('ORGANIZATION FINANCIAL DASHBOARD')
    .setFontWeight('bold')
    .setFontSize(13)
    .setFontColor('#ffffff')
    .setBackground('#0f172a')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(2, 38);

  // Block 1: Financial Position
  sheet.getRange('B4:C4').merge()
    .setValue('OVERALL FINANCIAL POSITION')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1e293b')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(4, 28);

  sheet.getRange('B5').setValue('Opening Balance').setFontWeight('bold');
  sheet.getRange('C5').setFormula('=Settings!B4').setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  sheet.getRange('B6').setValue('Total Income (Inflow)').setFontWeight('bold').setFontColor('#047857');
  sheet.getRange('C6').setFormula('=SUMIF(Transactions!C2:C, "income", Transactions!D2:D)').setNumberFormat('+#,##0.00').setFontWeight('bold').setFontColor('#047857').setHorizontalAlignment('right');

  sheet.getRange('B7').setValue('Total Expenses (Outflow)').setFontWeight('bold').setFontColor('#b91c1c');
  sheet.getRange('C7').setFormula('=SUMIF(Transactions!C2:C, "expense", Transactions!D2:D)').setNumberFormat('-#,##0.00').setFontWeight('bold').setFontColor('#b91c1c').setHorizontalAlignment('right');

  sheet.getRange('B8').setValue('Current Net Balance').setFontWeight('bold');
  sheet.getRange('C8').setFormula('=C5 + C6 - C7').setNumberFormat('#,##0.00').setFontWeight('bold').setHorizontalAlignment('right');
  sheet.getRange('B8:C8').setBackground('#f1f5f9');

  // Block 2: Payment Methods Breakdown
  sheet.getRange('E4:F4').merge()
    .setValue('PAYMENT METHODS BREAKDOWN')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1e293b')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.getRange('E5').setValue('Method').setFontWeight('bold');
  sheet.getRange('F5').setValue('Net Balance / In-Hand').setFontWeight('bold').setHorizontalAlignment('right');

  sheet.getRange('E6').setValue('Cash In Hand');
  sheet.getRange('F6').setFormula('=SUMIFS(Transactions!D2:D, Transactions!C2:C, "income", Transactions!H2:H, "Cash") - SUMIFS(Transactions!D2:D, Transactions!C2:C, "expense", Transactions!H2:H, "Cash")').setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  sheet.getRange('E7').setValue('UPI Balance Flow');
  sheet.getRange('F7').setFormula('=SUMIFS(Transactions!D2:D, Transactions!C2:C, "income", Transactions!H2:H, "UPI") - SUMIFS(Transactions!D2:D, Transactions!C2:C, "expense", Transactions!H2:H, "UPI")').setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  sheet.getRange('E8').setValue('Bank Transfer Flow');
  sheet.getRange('F8').setFormula('=SUMIFS(Transactions!D2:D, Transactions!C2:C, "income", Transactions!H2:H, "Bank Transfer") - SUMIFS(Transactions!D2:D, Transactions!C2:C, "expense", Transactions!H2:H, "Bank Transfer")').setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  sheet.getRange('E9').setValue('Card / Others');
  sheet.getRange('F9').setFormula('=SUMIFS(Transactions!D2:D, Transactions!C2:C, "income", Transactions!H2:H, "Card") - SUMIFS(Transactions!D2:D, Transactions!C2:C, "expense", Transactions!H2:H, "Card")').setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  // Block 3: Category Summaries Header
  sheet.getRange('B10:C10').merge()
    .setValue('INCOME BY CATEGORY')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#065f46')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(10, 26);

  sheet.getRange('E10:F10').merge()
    .setValue('EXPENSES BY CATEGORY')
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#991b1b')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(10, 26);

  var incomeCats = [
    'Donations',
    'Contributions',
    'Grants',
    'Membership Fees',
    'Other Income'
  ];

  for (var i = 0; i < incomeCats.length; i++) {
    var row = 11 + i;
    sheet.getRange(row, 2).setValue(incomeCats[i]);
    sheet.getRange(row, 3).setFormula('=SUMIFS(Transactions!D2:D, Transactions!C2:C, "income", Transactions!E2:E, "' + incomeCats[i] + '")').setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  }

  var expenseCats = [
    'Food',
    'Travel',
    'Rent',
    'Utilities',
    'Printing and Stationery',
    'Event Expenses',
    'Salaries',
    'Maintenance',
    'Other Expenses'
  ];

  for (var j = 0; j < expenseCats.length; j++) {
    var r = 11 + j;
    sheet.getRange(r, 5).setValue(expenseCats[j]);
    sheet.getRange(r, 6).setFormula('=SUMIFS(Transactions!D2:D, Transactions!C2:C, "expense", Transactions!E2:E, "' + expenseCats[j] + '")').setNumberFormat('#,##0.00').setHorizontalAlignment('right');
  }

  // Draw light borders
  sheet.getRange('B4:C8').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('E4:F9').setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(10, 2, incomeCats.length + 1, 2).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(10, 5, expenseCats.length + 1, 2).setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
}

function setupTransactionsSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  if (!sheet) {
    sheet = ss.insertSheet('Transactions', 0);
  }

  // Auto-migrate: If sheet already exists without ContactNumber, insert column G
  if (sheet.getLastColumn() >= 6) {
    var firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasContact = false;
    for (var c = 0; c < firstRow.length; c++) {
      if (String(firstRow[c] || '').toLowerCase().indexOf('contact') >= 0) {
        hasContact = true;
        break;
      }
    }
    if (!hasContact) {
      sheet.insertColumnAfter(6); // Inserts column G right after Party
    }
  }

  var headers = [
    'ID',
    'Date',
    'Type',
    'Amount',
    'Category',
    'Party',
    'ContactNumber',
    'PaymentMethod',
    'ReferenceNumber',
    'Description',
    'CreatedAt'
  ];

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1e293b')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  var widths = [130, 110, 95, 125, 160, 180, 150, 130, 150, 240, 180];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  sheet.getRange('B2:B').setNumberFormat('yyyy-mm-dd');

  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['income', 'expense'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('C2:C').setDataValidation(typeRule).setHorizontalAlignment('center');

  sheet.getRange('D2:D').setNumberFormat('#,##0.00').setHorizontalAlignment('right');

  sheet.getRange('G2:G').setNumberFormat('@').setHorizontalAlignment('left');

  var methodRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('H2:H').setDataValidation(methodRule).setHorizontalAlignment('center');

  sheet.getRange('K2:K').setNumberFormat('yyyy-mm-dd hh:mm:ss');
}

function setupCategoriesSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Categories');
  if (!sheet) {
    sheet = ss.insertSheet('Categories', 1);
  }

  var headers = ['ID', 'Name', 'Type', 'Status'];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#0f766e')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  var widths = [110, 220, 110, 100];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  var typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['income', 'expense'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('C2:C').setDataValidation(typeRule).setHorizontalAlignment('center');

  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Active', 'Inactive'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange('D2:D').setDataValidation(statusRule).setHorizontalAlignment('center');

  if (sheet.getLastRow() <= 1) {
    var defaultCats = [
      ['cat_1', 'Donations', 'income', 'Active'],
      ['cat_2', 'Contributions', 'income', 'Active'],
      ['cat_3', 'Grants', 'income', 'Active'],
      ['cat_4', 'Membership Fees', 'income', 'Active'],
      ['cat_5', 'Other Income', 'income', 'Active'],
      ['cat_6', 'Food', 'expense', 'Active'],
      ['cat_7', 'Travel', 'expense', 'Active'],
      ['cat_8', 'Rent', 'expense', 'Active'],
      ['cat_9', 'Utilities', 'expense', 'Active'],
      ['cat_10', 'Printing and Stationery', 'expense', 'Active'],
      ['cat_11', 'Event Expenses', 'expense', 'Active'],
      ['cat_12', 'Salaries', 'expense', 'Active'],
      ['cat_13', 'Maintenance', 'expense', 'Active'],
      ['cat_14', 'Other Expenses', 'expense', 'Active']
    ];
    sheet.getRange(2, 1, defaultCats.length, 4).setValues(defaultCats);
  }
}

function setupSettingsSheet(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings', 2);
  }

  var headers = ['Key', 'Value', 'Description'];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#334155')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 260);
  sheet.setColumnWidth(3, 300);

  if (sheet.getLastRow() <= 1) {
    var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var settings = [
      ['organization_name', 'My Organization', 'Name of the organization'],
      ['logo_url', '', 'Direct URL to organization logo'],
      ['opening_balance', 0.00, 'Starting balance at opening date'],
      ['opening_balance_date', todayStr, 'Date from which ledger starts (YYYY-MM-DD)'],
      ['financial_year_start_month', 4, 'Start month of financial year (4 = April)']
    ];
    sheet.getRange(2, 1, settings.length, 3).setValues(settings);
    sheet.getRange('B4:B4').setNumberFormat('#,##0.00');
  }
}

function addSampleTransactions(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  if (!sheet) return;

  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var now = new Date().toISOString();

  var samples = [
    ['tx_1', today, 'income', 50000.00, 'Donations', 'Dr. Ramesh Kumar', 'UPI', 'UPI-98214', 'Annual corpus donation', now],
    ['tx_2', today, 'expense', 4200.00, 'Food', 'Local Caterers', 'Cash', 'REC-091', 'Meeting snacks and tea', now],
    ['tx_3', today, 'expense', 15000.00, 'Rent', 'Landlord Estate', 'Bank Transfer', 'NEFT-8812', 'Monthly rent payment', now],
    ['tx_4', today, 'income', 12500.00, 'Membership Fees', 'Members Batch 2026', 'UPI', 'UPI-5521', 'Quarterly membership fees', now]
  ];

  sheet.getRange(sheet.getLastRow() + 1, 1, samples.length, 10).setValues(samples);
  SpreadsheetApp.flush();
}

// -----------------------------------------------------------------------
// Web API (doGet & doPost)
// -----------------------------------------------------------------------

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getData';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'getData') {
    return jsonResponse({
      ok: true,
      settings: getSettingsData(ss),
      categories: getCategoriesData(ss),
      transactions: getTransactionsData(ss)
    });
  }

  if (action === 'ping') {
    return jsonResponse({ ok: true, message: 'Google Sheets API connected' });
  }

  return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(raw);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'addTransaction') {
      var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
      if (!sheet) return jsonResponse({ ok: false, error: 'Transactions sheet not found' });

      var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      var hasContact = false;
      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c] || '').toLowerCase().indexOf('contact') >= 0) {
          hasContact = true;
          break;
        }
      }

      // If ContactNumber column is not there yet, auto-insert it right now!
      if (!hasContact && sheet.getLastColumn() >= 6) {
        sheet.insertColumnAfter(6);
        sheet.getRange(1, 7).setValue('ContactNumber')
          .setFontWeight('bold')
          .setFontColor('#ffffff')
          .setBackground('#1e293b')
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle');
        sheet.setColumnWidth(7, 150);
        sheet.getRange('G2:G').setNumberFormat('@').setHorizontalAlignment('left');
        hasContact = true;
      }

      var id = 'tx_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
      var contactVal = payload.contactNumber ? String(payload.contactNumber).trim() : '';
      if (contactVal && (contactVal.indexOf('+') === 0 || contactVal.indexOf('0') === 0)) {
        contactVal = "'" + contactVal;
      }
      var row = [
        id,
        payload.date,
        String(payload.type).toLowerCase(),
        Number(payload.amount),
        payload.category || 'Uncategorized',
        payload.party || '',
        contactVal,
        payload.paymentMethod || 'Cash',
        payload.referenceNumber || '',
        payload.description || '',
        new Date().toISOString()
      ];

      sheet.appendRow(row);
      return jsonResponse({ ok: true, id: id, message: 'Transaction recorded in Sheet' });
    }

    if (action === 'updateTransaction') {
      var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
      if (!sheet) return jsonResponse({ ok: false, error: 'Transactions sheet not found' });

      var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      var colMap = {};
      for (var h = 0; h < headers.length; h++) {
        var key = String(headers[h] || '').toLowerCase().replace(/[^a-z]/g, '');
        colMap[key] = h + 1; // 1-based column index
      }

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id)) {
          var rowNum = i + 1;
          if (payload.date && colMap['date']) sheet.getRange(rowNum, colMap['date']).setValue(payload.date);
          if (payload.type && colMap['type']) sheet.getRange(rowNum, colMap['type']).setValue(String(payload.type).toLowerCase());
          if (payload.amount !== undefined && colMap['amount']) sheet.getRange(rowNum, colMap['amount']).setValue(Number(payload.amount));
          if (payload.category && colMap['category']) sheet.getRange(rowNum, colMap['category']).setValue(payload.category);
          if (payload.party !== undefined && colMap['party']) sheet.getRange(rowNum, colMap['party']).setValue(payload.party);
          if (payload.contactNumber !== undefined && (colMap['contactnumber'] || colMap['contact'])) {
            var cCol = colMap['contactnumber'] || colMap['contact'];
            var cVal = String(payload.contactNumber || '').trim();
            if (cVal && (cVal.indexOf('+') === 0 || cVal.indexOf('0') === 0)) {
              cVal = "'" + cVal;
            }
            sheet.getRange(rowNum, cCol).setValue(cVal);
          }
          if (payload.paymentMethod && colMap['paymentmethod']) sheet.getRange(rowNum, colMap['paymentmethod']).setValue(payload.paymentMethod);
          if (payload.referenceNumber !== undefined && colMap['referencenumber']) sheet.getRange(rowNum, colMap['referencenumber']).setValue(payload.referenceNumber);
          if (payload.description !== undefined && colMap['description']) sheet.getRange(rowNum, colMap['description']).setValue(payload.description);
          return jsonResponse({ ok: true, message: 'Transaction updated in Sheet' });
        }
      }
      return jsonResponse({ ok: false, error: 'Transaction ID not found' });
    }

    if (action === 'deleteTransaction') {
      var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
      if (!sheet) return jsonResponse({ ok: false, error: 'Transactions sheet not found' });

      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ ok: true, message: 'Transaction deleted from Sheet' });
        }
      }
      return jsonResponse({ ok: false, error: 'Transaction ID not found' });
    }

    if (action === 'updateSettings') {
      var sheet = ss.getSheetByName('Settings');
      if (!sheet) return jsonResponse({ ok: false, error: 'Settings sheet not found' });

      var data = sheet.getDataRange().getValues();
      var settings = payload.settings || {};
      for (var i = 1; i < data.length; i++) {
        var key = String(data[i][0]);
        if (settings[key] !== undefined) {
          sheet.getRange(i + 1, 2).setValue(settings[key]);
        }
      }
      return jsonResponse({ ok: true, message: 'Settings saved to Sheet' });
    }

    return jsonResponse({ ok: false, error: 'Unsupported action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function getSettingsData(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  var rows = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < rows.length; i++) {
    var key = rows[i][0];
    if (key) settings[key] = rows[i][1];
  }
  return settings;
}

function getCategoriesData(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Categories');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var categories = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][1]) {
      categories.push({
        id: String(rows[i][0]),
        name: String(rows[i][1]),
        type: String(rows[i][2]).toLowerCase(),
        is_active: String(rows[i][3]).toLowerCase() === 'active'
      });
    }
  }
  return categories;
}

function getTransactionsData(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  var headers = rows[0];
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    var key = String(headers[h] || '').toLowerCase().replace(/[^a-z]/g, '');
    colMap[key] = h;
  }

  var transactions = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var idIdx = colMap['id'] !== undefined ? colMap['id'] : 0;
    var id = String(r[idIdx] || '').trim();
    if (!id) continue;

    var dateIdx = colMap['date'] !== undefined ? colMap['date'] : 1;
    var dt = r[dateIdx];
    var dateStr = '';
    if (dt instanceof Date) {
      dateStr = Utilities.formatDate(dt, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(dt || '');
    }

    var typeIdx = colMap['type'] !== undefined ? colMap['type'] : 2;
    var amtIdx = colMap['amount'] !== undefined ? colMap['amount'] : 3;
    var catIdx = colMap['category'] !== undefined ? colMap['category'] : 4;
    var partyIdx = colMap['party'] !== undefined ? colMap['party'] : 5;
    var contactIdx = colMap['contactnumber'] !== undefined ? colMap['contactnumber'] : (colMap['contact'] !== undefined ? colMap['contact'] : (colMap['phone'] !== undefined ? colMap['phone'] : -1));
    var methodIdx = colMap['paymentmethod'] !== undefined ? colMap['paymentmethod'] : (contactIdx === -1 ? 6 : 7);
    var refIdx = colMap['referencenumber'] !== undefined ? colMap['referencenumber'] : (contactIdx === -1 ? 7 : 8);
    var descIdx = colMap['description'] !== undefined ? colMap['description'] : (contactIdx === -1 ? 8 : 9);
    var createdIdx = colMap['createdat'] !== undefined ? colMap['createdat'] : (contactIdx === -1 ? 9 : 10);

    transactions.push({
      id: id,
      transaction_date: dateStr,
      type: String(r[typeIdx] || 'expense').toLowerCase(),
      amount: Number(r[amtIdx] || 0),
      category_name: String(r[catIdx] || 'Uncategorized'),
      person_name: partyIdx >= 0 && r[partyIdx] ? String(r[partyIdx]) : null,
      contact_number: contactIdx >= 0 && r[contactIdx] ? String(r[contactIdx]).replace(/^'/, '').trim() : null,
      payment_method: methodIdx >= 0 && r[methodIdx] ? String(r[methodIdx]) : 'Cash',
      reference_number: refIdx >= 0 && r[refIdx] ? String(r[refIdx]) : null,
      description: descIdx >= 0 && r[descIdx] ? String(r[descIdx]) : null,
      created_at: createdIdx >= 0 && r[createdIdx] ? String(r[createdIdx]) : ''
    });
  }
  return transactions;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
