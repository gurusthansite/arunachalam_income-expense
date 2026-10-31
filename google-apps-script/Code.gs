/**
 * ORGANIZATION INCOME AND EXPENSE MANAGER - GOOGLE APPS SCRIPT
 * Pure ASCII - 100% safe for Google Apps Script editor
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ledger App')
    .addItem('Setup All Sheets', 'setupCompleteSheeting')
    .addItem('Add Paid, Pending & Phone Number Columns', 'updateSheetColumns')
    .addItem('Repair & Realign Data Rows', 'repairAndAlignDataRows')
    .addItem('Add Sample Transactions', 'addSampleTransactions')
    .addToUi();
}

/**
 * 1-Click Function to ensure all needed columns exist (Paid, Pending, Phone Number)
 * Completely safe for all existing transactions!
 */
function ensureTransactionsColumns(sheet) {
  var lastRow = sheet.getLastRow();
  // Auto-detect if row 2 has shifted data (e.g. column E contains category text instead of numbers)
  if (lastRow > 1) {
    var sampleE = sheet.getRange(2, 5).getValue();
    if (isNaN(Number(sampleE)) && String(sampleE || '').trim() !== '') {
      repairAndAlignDataRows();
      SpreadsheetApp.flush();
    }
  }

  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    var key = String(headers[c] || '').toLowerCase().replace(/[^a-z]/g, '');
    colMap[key] = c + 1; // 1-based index
  }

  // 1. Ensure 'Paid' and 'Pending' exist right after Amount
  if (!colMap['paid'] || !colMap['pending']) {
    var amtCol = colMap['amount'] || 4;
    sheet.insertColumnsAfter(amtCol, 2);
    sheet.getRange(1, amtCol + 1).setValue('Paid')
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e293b')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange(1, amtCol + 2).setValue('Pending')
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e293b')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setColumnWidth(amtCol + 1, 125);
    sheet.setColumnWidth(amtCol + 2, 125);

    if (lastRow > 1) {
      var amounts = sheet.getRange(2, amtCol, lastRow - 1, 1).getValues();
      var pVals = [];
      var dVals = [];
      for (var r = 0; r < amounts.length; r++) {
        var a = Number(amounts[r][0] || 0);
        pVals.push([a]);
        dVals.push([0]);
      }
      sheet.getRange(2, amtCol + 1, lastRow - 1, 1).setValues(pVals).setNumberFormat('#,##0.00');
      sheet.getRange(2, amtCol + 2, lastRow - 1, 1).setValues(dVals).setNumberFormat('#,##0.00');
    }

    // Refresh headers & colMap
    headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var key = String(headers[c] || '').toLowerCase().replace(/[^a-z]/g, '');
      colMap[key] = c + 1;
    }
  }

  // 2. Ensure 'Phone Number' exists right after Party
  var hasContact = colMap['phonenumber'] || colMap['phone'] || colMap['contactnumber'] || colMap['contact'] || colMap['mobile'] || colMap['mobilenumber'];
  if (!hasContact) {
    var partyCol = colMap['party'] || colMap['person'] || (sheet.getLastColumn() - 3);
    sheet.insertColumnAfter(partyCol);
    sheet.getRange(1, partyCol + 1).setValue('Phone Number')
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e293b')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setColumnWidth(partyCol + 1, 150);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, partyCol + 1, sheet.getLastRow() - 1, 1).setNumberFormat('@').setHorizontalAlignment('left');
    }

    // Refresh headers & colMap
    headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var key = String(headers[c] || '').toLowerCase().replace(/[^a-z]/g, '');
      colMap[key] = c + 1;
    }
  }

  return colMap;
}

/**
 * 1-Click Repair & Align Tool:
 * Automatically detects rows where headers were shifted and places every value in the correct column!
 */
function repairAndAlignDataRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
  if (!sheet) return;

  var standardHeaders = [
    'ID', 'Date', 'Type', 'Amount', 'Paid', 'Pending',
    'Category', 'Party', 'Phone Number', 'PaymentMethod',
    'ReferenceNumber', 'Description', 'CreatedAt'
  ];

  sheet.getRange(1, 1, 1, standardHeaders.length)
    .setValues([standardHeaders])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1e293b')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var lastCol = Math.max(standardHeaders.length, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var fixedRows = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var id = String(r[0] || '').trim();
    if (!id) continue;

    var date = r[1];
    var type = String(r[2] || 'expense').toLowerCase();
    var amt = Number(r[3] || 0);

    var colE = r[4];
    var colF = r[5];
    var colG = r[6];
    var colJ = r[9];

    // Detect if this row is shifted (Col E has category text like "Other Expenses", or Col J has timestamp, or Col G has "upi")
    var isShifted = (isNaN(Number(colE)) && String(colE || '').trim() !== '') ||
                    (String(colJ || '').indexOf('T') > 0 && String(colJ || '').indexOf('Z') > 0) ||
                    ['upi', 'cash', 'bank transfer', 'bank_transfer', 'cheque'].indexOf(String(colG || '').toLowerCase()) >= 0;

    var paid, pending, category, party, phone, paymentMethod, refNum, desc, createdAt;

    if (isShifted) {
      paid = amt;
      pending = 0;
      category = String(colE || 'Uncategorized');
      party = colF ? String(colF) : '';
      phone = '';
      paymentMethod = colG ? String(colG) : 'Cash';
      refNum = r[7] ? String(r[7]) : '';
      desc = r[8] ? String(r[8]) : '';
      createdAt = colJ ? String(colJ) : new Date().toISOString();
    } else {
      paid = (colE !== '' && colE !== null && !isNaN(Number(colE))) ? Number(colE) : amt;
      pending = (colF !== '' && colF !== null && !isNaN(Number(colF))) ? Number(colF) : Math.max(0, amt - paid);
      category = r[6] ? String(r[6]) : 'Uncategorized';
      party = r[7] ? String(r[7]) : '';
      phone = r[8] ? String(r[8]).replace(/^'/, '') : '';
      paymentMethod = r[9] ? String(r[9]) : 'Cash';
      refNum = r[10] ? String(r[10]) : '';
      desc = r[11] ? String(r[11]) : '';
      createdAt = r[12] ? String(r[12]) : (colJ ? String(colJ) : new Date().toISOString());
    }

    if (phone && phone.indexOf("'") !== 0) {
      phone = "'" + phone;
    }

    fixedRows.push([
      id, date, type, amt, paid, pending, category, party, phone, paymentMethod, refNum, desc, createdAt
    ]);
  }

  if (fixedRows.length > 0) {
    sheet.getRange(2, 1, fixedRows.length, standardHeaders.length).setValues(fixedRows);
    sheet.getRange(2, 4, fixedRows.length, 3).setNumberFormat('#,##0.00'); // Amount, Paid, Pending
    sheet.getRange(2, 9, fixedRows.length, 1).setNumberFormat('@'); // Phone Number
  }

  SpreadsheetApp.flush();
}

function updateSheetColumns() {
  repairAndAlignDataRows();
}

function addPaidAndPendingColumns() {
  repairAndAlignDataRows();
}

function addPhoneNumberColumn() {
  repairAndAlignDataRows();
}

function addContactNumberColumn() {
  repairAndAlignDataRows();
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
    'Paid',
    'Pending',
    'Category',
    'Party',
    'Phone Number',
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

  var widths = [130, 110, 95, 125, 125, 125, 160, 180, 150, 130, 150, 240, 180];
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

  if (action === 'migrate' || action === 'setupColumns' || action === 'updateSheet') {
    var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
    if (!sheet) return jsonResponse({ ok: false, error: 'Transactions sheet not found' });
    var colMap = ensureTransactionsColumns(sheet);
    SpreadsheetApp.flush();
    return jsonResponse({
      ok: true,
      message: 'Sheet columns updated successfully! Added Paid, Pending, and ContactNumber.',
      columns: Object.keys(colMap)
    });
  }

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

      var colMap = ensureTransactionsColumns(sheet);
      var lastCol = sheet.getLastColumn();
      var id = 'tx_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);

      var contactVal = payload.contactNumber !== undefined && payload.contactNumber !== null ? String(payload.contactNumber).trim() : '';
      if (contactVal && contactVal.indexOf("'") !== 0) {
        contactVal = "'" + contactVal;
      }

      var amt = Number(payload.amount || 0);
      var paidAmt = payload.paid !== undefined && payload.paid !== '' && payload.paid !== null ? Number(payload.paid) : amt;
      var pendingAmt = payload.pending !== undefined && payload.pending !== '' && payload.pending !== null ? Number(payload.pending) : Math.max(0, amt - paidAmt);

      var newRow = new Array(lastCol);
      for (var k = 0; k < newRow.length; k++) newRow[k] = '';

      var setVal = function(name, val) {
        var idx = colMap[name];
        if (idx !== undefined && idx <= lastCol) newRow[idx - 1] = val;
      };

      setVal('id', id);
      setVal('date', payload.date);
      setVal('type', String(payload.type).toLowerCase());
      setVal('amount', amt);
      setVal('paid', paidAmt);
      setVal('pending', pendingAmt);
      setVal('category', payload.category || 'Uncategorized');
      setVal('party', payload.party || '');
      var cIdx = colMap['phonenumber'] || colMap['phone'] || colMap['contactnumber'] || colMap['contact'] || colMap['mobile'] || colMap['mobilenumber'];
      if (cIdx && cIdx <= lastCol) newRow[cIdx - 1] = contactVal;
      setVal('paymentmethod', payload.paymentMethod || 'Cash');
      setVal('referencenumber', payload.referenceNumber || '');
      setVal('description', payload.description || '');
      setVal('createdat', new Date().toISOString());

      sheet.appendRow(newRow);
      return jsonResponse({ ok: true, id: id, message: 'Transaction recorded in Sheet' });
    }

    if (action === 'updateTransaction') {
      var sheet = ss.getSheetByName('Transactions') || ss.getActiveSheet();
      if (!sheet) return jsonResponse({ ok: false, error: 'Transactions sheet not found' });

      var colMap = ensureTransactionsColumns(sheet);
      var data = sheet.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(payload.id)) {
          var rowNum = i + 1;
          if (payload.date && colMap['date']) sheet.getRange(rowNum, colMap['date']).setValue(payload.date);
          if (payload.type && colMap['type']) sheet.getRange(rowNum, colMap['type']).setValue(String(payload.type).toLowerCase());
          if (payload.amount !== undefined && colMap['amount']) sheet.getRange(rowNum, colMap['amount']).setValue(Number(payload.amount));
          if (payload.paid !== undefined && colMap['paid']) sheet.getRange(rowNum, colMap['paid']).setValue(Number(payload.paid));
          if (payload.pending !== undefined && colMap['pending']) sheet.getRange(rowNum, colMap['pending']).setValue(Number(payload.pending));
          if (payload.category && colMap['category']) sheet.getRange(rowNum, colMap['category']).setValue(payload.category);
          if (payload.party !== undefined && colMap['party']) sheet.getRange(rowNum, colMap['party']).setValue(payload.party);

          var cCol = colMap['phonenumber'] || colMap['phone'] || colMap['contactnumber'] || colMap['contact'] || colMap['mobile'] || colMap['mobilenumber'];
          if (cCol && payload.contactNumber !== undefined) {
            var cVal = payload.contactNumber !== null ? String(payload.contactNumber).trim() : '';
            if (cVal && cVal.indexOf("'") !== 0) {
              cVal = "'" + cVal;
            }
            sheet.getRange(rowNum, cCol).setNumberFormat('@').setValue(cVal);
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

    if (action === 'addCategory') {
      var sheet = ss.getSheetByName('Categories');
      if (!sheet) {
        setupCategoriesSheet(ss);
        sheet = ss.getSheetByName('Categories');
      }
      var id = 'cat_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
      sheet.appendRow([id, payload.name, String(payload.type).toLowerCase(), 'Active']);
      return jsonResponse({ ok: true, id: id, message: 'Category added to Sheet' });
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

  // Auto-migrate columns if Paid, Pending, or ContactNumber are missing
  if (colMap['paid'] === undefined || colMap['pending'] === undefined || (colMap['contactnumber'] === undefined && colMap['contact'] === undefined && colMap['phone'] === undefined)) {
    try {
      ensureTransactionsColumns(sheet);
      rows = sheet.getDataRange().getValues();
      headers = rows[0];
      colMap = {};
      for (var h = 0; h < headers.length; h++) {
        var key = String(headers[h] || '').toLowerCase().replace(/[^a-z]/g, '');
        colMap[key] = h;
      }
    } catch (e) {
      // In case sheet execution permissions are read-only, proceed gracefully
    }
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
    var paidIdx = colMap['paid'] !== undefined ? colMap['paid'] : (colMap['paidamount'] !== undefined ? colMap['paidamount'] : -1);
    var pendingIdx = colMap['pending'] !== undefined ? colMap['pending'] : (colMap['pendingamount'] !== undefined ? colMap['pendingamount'] : -1);
    var catIdx = colMap['category'] !== undefined ? colMap['category'] : (paidIdx === -1 ? 4 : 6);
    var partyIdx = colMap['party'] !== undefined ? colMap['party'] : (paidIdx === -1 ? 5 : 7);
    var contactIdx = colMap['phonenumber'] !== undefined ? colMap['phonenumber'] :
      (colMap['phone'] !== undefined ? colMap['phone'] :
      (colMap['contactnumber'] !== undefined ? colMap['contactnumber'] :
      (colMap['contact'] !== undefined ? colMap['contact'] :
      (colMap['mobile'] !== undefined ? colMap['mobile'] :
      (colMap['mobilenumber'] !== undefined ? colMap['mobilenumber'] : -1)))));
    var methodIdx = colMap['paymentmethod'] !== undefined ? colMap['paymentmethod'] : (contactIdx === -1 ? 6 : 7);
    var refIdx = colMap['referencenumber'] !== undefined ? colMap['referencenumber'] : (contactIdx === -1 ? 7 : 8);
    var descIdx = colMap['description'] !== undefined ? colMap['description'] : (contactIdx === -1 ? 8 : 9);
    var createdIdx = colMap['createdat'] !== undefined ? colMap['createdat'] : (contactIdx === -1 ? 9 : 10);

    var amtVal = Number(r[amtIdx] || 0);

    // Auto-detect if row was written in old 10-column layout before Paid/Pending were inserted
    var valColE = paidIdx >= 0 ? r[paidIdx] : r[4];
    var valColG = catIdx >= 0 ? r[catIdx] : r[6];
    var valColJ = methodIdx >= 0 ? r[methodIdx] : r[9];

    var isShifted = (isNaN(Number(valColE)) && String(valColE || '').trim() !== '') ||
                    (String(valColJ || '').indexOf('T') > 0 && String(valColJ || '').indexOf('Z') > 0) ||
                    ['upi', 'cash', 'bank transfer', 'bank_transfer', 'cheque'].indexOf(String(valColG || '').toLowerCase()) >= 0;

    var paidVal, pendingVal, categoryName, personName, contactNumber, paymentMethod, refNumber, description, createdAt;

    if (isShifted) {
      paidVal = amtVal;
      pendingVal = 0;
      categoryName = String(valColE || 'Uncategorized');
      personName = r[5] ? String(r[5]) : null;
      contactNumber = null;
      paymentMethod = r[6] ? String(r[6]) : 'Cash';
      refNumber = r[7] ? String(r[7]) : null;
      description = r[8] ? String(r[8]) : null;
      createdAt = r[9] ? String(r[9]) : '';
    } else {
      paidVal = paidIdx >= 0 && r[paidIdx] !== '' && r[paidIdx] !== null && !isNaN(Number(r[paidIdx])) ? Number(r[paidIdx]) : amtVal;
      pendingVal = pendingIdx >= 0 && r[pendingIdx] !== '' && r[pendingIdx] !== null && !isNaN(Number(r[pendingIdx])) ? Number(r[pendingIdx]) : Math.max(0, amtVal - paidVal);
      categoryName = catIdx >= 0 && r[catIdx] ? String(r[catIdx]) : 'Uncategorized';
      personName = partyIdx >= 0 && r[partyIdx] ? String(r[partyIdx]) : null;
      contactNumber = contactIdx >= 0 && r[contactIdx] ? String(r[contactIdx]).replace(/^'/, '').trim() : null;
      paymentMethod = methodIdx >= 0 && r[methodIdx] ? String(r[methodIdx]) : 'Cash';
      refNumber = refIdx >= 0 && r[refIdx] ? String(r[refIdx]) : null;
      description = descIdx >= 0 && r[descIdx] ? String(r[descIdx]) : null;
      createdAt = createdIdx >= 0 && r[createdIdx] ? String(r[createdIdx]) : '';
    }

    transactions.push({
      id: id,
      transaction_date: dateStr,
      type: String(r[typeIdx] || 'expense').toLowerCase(),
      amount: amtVal,
      paid: paidVal,
      pending: pendingVal,
      category_name: categoryName,
      person_name: personName,
      contact_number: contactNumber,
      payment_method: paymentMethod,
      reference_number: refNumber,
      description: description,
      created_at: createdAt
    });
  }
  return transactions;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
