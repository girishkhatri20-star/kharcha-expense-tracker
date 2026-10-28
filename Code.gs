/**
 * ============================================================
 * PERSONAL EXPENSE TRACKER — Google Apps Script Backend
 * ============================================================
 * Deploy as: Execute as "User accessing the web app"
 *            Access: "Anyone with a Google account"
 *
 * Each user gets their own Google Sheet in their own Drive.
 * All data is isolated per-user — no shared DB.
 * ============================================================
 */

// ========================= ROUTING ==========================

/**
 * Serves the SPA HTML page.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Expense Tracker — India')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ====================== SHEET SETUP =========================

/**
 * Returns (and creates if needed) this user's personal spreadsheet.
 * ID is stored in UserProperties so it survives across sessions.
 */
function getOrCreateUserSpreadsheet() {
  var props = PropertiesService.getUserProperties();
  var ssId = props.getProperty('EXPENSE_TRACKER_SS_ID');
  var ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (err) {
      // File may have been deleted — create a new one
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('My Expense Tracker');
    props.setProperty('EXPENSE_TRACKER_SS_ID', ss.getId());
    initializeSheets(ss);
    beautifySpreadsheet(ss);
    props.setProperty('EXPENSE_TRACKER_STYLED_V2', 'true');
  } else {
    // If opened on an existing sheet, automatically upgrade to executive styling
    if (!props.getProperty('EXPENSE_TRACKER_STYLED_V2')) {
      try {
        beautifySpreadsheet(ss);
        props.setProperty('EXPENSE_TRACKER_STYLED_V2', 'true');
      } catch (styleErr) {}
    }
  }

  return ss;
}

/**
 * Creates all required sheets with headers and default data.
 */
function initializeSheets(ss) {
  var sheetDefs = [
    {
      name: 'Transactions',
      headers: ['id', 'date', 'type', 'amount', 'category', 'subcategory',
                'description', 'payment_method', 'account_label', 'notes',
                'tags', 'recurring_id', 'created_at']
    },
    {
      name: 'Categories',
      headers: ['id', 'name', 'type', 'icon', 'color', 'parent_id', 'created_at']
    },
    {
      name: 'Budgets',
      headers: ['id', 'category_id', 'month', 'amount', 'created_at']
    },
    {
      name: 'Bills',
      headers: ['id', 'name', 'amount', 'category', 'due_day', 'next_due',
                'frequency', 'payment_method', 'auto_pay', 'notes', 'active', 'created_at']
    },
    {
      name: 'Goals',
      headers: ['id', 'name', 'target_amount', 'current_amount', 'target_date',
                'category', 'notes', 'created_at']
    },
    {
      name: 'Meta',
      headers: ['key', 'value']
    }
  ];

  // Remove the default "Sheet1" if it exists and is blank
  var existingSheets = ss.getSheets();

  sheetDefs.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    // Write headers in row 1
    var headerRange = sheet.getRange(1, 1, 1, def.headers.length);
    headerRange.setValues([def.headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4f46e5');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  });

  // Remove default blank sheet
  existingSheets.forEach(function(s) {
    if (s.getName() === 'Sheet1' && s.getLastRow() <= 1) {
      try { ss.deleteSheet(s); } catch(e) {}
    }
  });

  // Ensure Date column (B) in Transactions and Month column (C) in Budgets are stored as text
  try {
    var txSheet = ss.getSheetByName('Transactions');
    if (txSheet && txSheet.getMaxRows() > 1) {
      txSheet.getRange(2, 2, txSheet.getMaxRows() - 1, 1).setNumberFormat('@');
    }
    var bSheet = ss.getSheetByName('Budgets');
    if (bSheet && bSheet.getMaxRows() > 1) {
      bSheet.getRange(2, 3, bSheet.getMaxRows() - 1, 1).setNumberFormat('@');
    }
  } catch (fmtErr) {}

  // Populate default categories
  _seedDefaultCategories(ss);
}

function _seedDefaultCategories(ss) {
  var sheet = ss.getSheetByName('Categories');
  var defaultCategories = [
    // Expense categories
    [Utilities.getUuid(), 'Housing',        'expense', '🏠', '#6366f1', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Groceries',      'expense', '🛒', '#8b5cf6', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Food & Dining',  'expense', '🍽️', '#a855f7', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Transport',      'expense', '🚗', '#ec4899', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Utilities',      'expense', '💡', '#f43f5e', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Shopping',       'expense', '🛍️', '#f97316', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Health',         'expense', '❤️', '#ef4444', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Education',      'expense', '📚', '#eab308', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Entertainment',  'expense', '🎬', '#22c55e', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Travel',         'expense', '✈️', '#14b8a6', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Personal Care',  'expense', '💆', '#06b6d4', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Family',         'expense', '👨‍👩‍👧', '#3b82f6', '', new Date().toISOString()],
    [Utilities.getUuid(), 'EMI / Loans',    'expense', '🏦', '#6366f1', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Insurance',      'expense', '🛡️', '#8b5cf6', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Taxes & Fees',   'expense', '📋', '#a855f7', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Other',          'expense', '📌', '#64748b', '', new Date().toISOString()],
    // Income categories
    [Utilities.getUuid(), 'Salary',         'income',  '💼', '#22c55e', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Freelance',      'income',  '💻', '#16a34a', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Investments',    'income',  '📈', '#15803d', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Business',       'income',  '🏢', '#166534', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Gift',           'income',  '🎁', '#14532d', '', new Date().toISOString()],
    [Utilities.getUuid(), 'Other Income',   'income',  '💰', '#064e3b', '', new Date().toISOString()],
    // Transfer
    [Utilities.getUuid(), 'Transfer',       'transfer','↔️', '#94a3b8', '', new Date().toISOString()]
  ];
  if (sheet.getLastRow() <= 1) {
    sheet.getRange(2, 1, defaultCategories.length, defaultCategories[0].length)
         .setValues(defaultCategories);
  }
}

/**
 * Applies executive dashboard styling, Indian currency formatting,
 * custom column widths, and tab colors to the Google Spreadsheet.
 */
function beautifySpreadsheet(ss) {
  var sheetColors = {
    'Transactions': '#4338ca',
    'Budgets': '#0284c7',
    'Bills': '#ea580c',
    'Goals': '#16a34a',
    'Categories': '#9333ea',
    'Meta': '#64748b'
  };

  var sheets = ss.getSheets();
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (sheetColors[name]) {
      try { sheet.setTabColor(sheetColors[name]); } catch (e) {}
    }
    try { sheet.setHideGridlines(false); } catch (e) {}

    // Style Header Row
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      var headerRange = sheet.getRange(1, 1, 1, lastCol);
      headerRange.setFontFamily('Google Sans')
                 .setFontSize(10)
                 .setFontWeight('bold')
                 .setBackground('#312e81')
                 .setFontColor('#ffffff')
                 .setVerticalAlignment('middle');
      sheet.setRowHeight(1, 38);
      sheet.setFrozenRows(1);
    }
  });

  // 1. Transactions Sheet Styling
  var txSheet = ss.getSheetByName('Transactions');
  if (txSheet) {
    var txHeaders = [
      'Transaction ID', 'Date', 'Type', 'Amount (₹)', 'Category',
      'Subcategory', 'Description / Merchant', 'Payment Method',
      'Account / Card', 'Notes', 'Tags', 'Recurring Bill ID', 'Recorded At'
    ];
    txSheet.getRange(1, 1, 1, txHeaders.length).setValues([txHeaders]);

    txSheet.setColumnWidth(1, 95);  // ID
    txSheet.setColumnWidth(2, 110); // Date
    txSheet.setColumnWidth(3, 95);  // Type
    txSheet.setColumnWidth(4, 135); // Amount
    txSheet.setColumnWidth(5, 140); // Category
    txSheet.setColumnWidth(6, 130); // Subcategory
    txSheet.setColumnWidth(7, 240); // Description
    txSheet.setColumnWidth(8, 125); // Payment Method
    txSheet.setColumnWidth(9, 130); // Account Label
    txSheet.setColumnWidth(10, 180);// Notes
    txSheet.setColumnWidth(11, 120);// Tags
    txSheet.setColumnWidth(12, 100);// Recurring ID
    txSheet.setColumnWidth(13, 140);// Created At

    var maxRows = Math.max(txSheet.getMaxRows(), 50);
    txSheet.getRange(2, 2, maxRows - 1, 1).setNumberFormat('@').setHorizontalAlignment('center');
    txSheet.getRange(2, 3, maxRows - 1, 1).setHorizontalAlignment('center');
    txSheet.getRange(2, 4, maxRows - 1, 1).setNumberFormat('[$₹-en-IN] #,##,##0.00;[Red]([$₹-en-IN] #,##,##0.00);"-"').setFontWeight('bold');

    try {
      if (txSheet.getBandings().length === 0 && txSheet.getMaxRows() > 1 && txSheet.getMaxColumns() > 0) {
        txSheet.getRange(1, 1, txSheet.getMaxRows(), txSheet.getMaxColumns())
               .applyRowBanding(SpreadsheetApp.BandingTheme.INDIGO, true, false);
      }
    } catch (e) {}

    try {
      var rules = [];
      var typeRange = txSheet.getRange(2, 3, maxRows - 1, 1);
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('expense')
        .setBackground('#fee2e2')
        .setFontColor('#991b1b')
        .setRanges([typeRange])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('income')
        .setBackground('#dcfce7')
        .setFontColor('#166534')
        .setRanges([typeRange])
        .build());
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('transfer')
        .setBackground('#e0f2fe')
        .setFontColor('#075985')
        .setRanges([typeRange])
        .build());
      txSheet.setConditionalFormatRules(rules);
    } catch (e) {}
  }

  // 2. Budgets Sheet Styling
  var bSheet = ss.getSheetByName('Budgets');
  if (bSheet) {
    bSheet.getRange(1, 1, 1, 5).setValues([['Budget ID', 'Category / Scope', 'Month', 'Limit Amount (₹)', 'Created At']]);
    bSheet.setColumnWidth(1, 95);
    bSheet.setColumnWidth(2, 160);
    bSheet.setColumnWidth(3, 110);
    bSheet.setColumnWidth(4, 140);
    bSheet.setColumnWidth(5, 140);
    var bRows = Math.max(bSheet.getMaxRows(), 20);
    bSheet.getRange(2, 3, bRows - 1, 1).setNumberFormat('@').setHorizontalAlignment('center');
    bSheet.getRange(2, 4, bRows - 1, 1).setNumberFormat('[$₹-en-IN] #,##,##0.00').setFontWeight('bold');
    try {
      if (bSheet.getBandings().length === 0) {
        bSheet.getRange(1, 1, bSheet.getMaxRows(), bSheet.getMaxColumns())
              .applyRowBanding(SpreadsheetApp.BandingTheme.CYAN, true, false);
      }
    } catch (e) {}
  }

  // 3. Bills Sheet Styling
  var billSheet = ss.getSheetByName('Bills');
  if (billSheet) {
    billSheet.getRange(1, 1, 1, 12).setValues([[
      'Bill ID', 'Bill Name', 'Amount (₹)', 'Category', 'Due Day',
      'Next Due Date', 'Frequency', 'Payment Method', 'Auto Pay', 'Notes', 'Active', 'Created At'
    ]]);
    billSheet.setColumnWidth(1, 95);
    billSheet.setColumnWidth(2, 200);
    billSheet.setColumnWidth(3, 130);
    billSheet.setColumnWidth(4, 140);
    billSheet.setColumnWidth(6, 120);
    var billRows = Math.max(billSheet.getMaxRows(), 20);
    billSheet.getRange(2, 3, billRows - 1, 1).setNumberFormat('[$₹-en-IN] #,##,##0.00').setFontWeight('bold');
    billSheet.getRange(2, 6, billRows - 1, 1).setNumberFormat('@').setHorizontalAlignment('center');
    try {
      if (billSheet.getBandings().length === 0) {
        billSheet.getRange(1, 1, billSheet.getMaxRows(), billSheet.getMaxColumns())
                 .applyRowBanding(SpreadsheetApp.BandingTheme.ORANGE, true, false);
      }
    } catch (e) {}
  }

  // 4. Goals Sheet Styling
  var gSheet = ss.getSheetByName('Goals');
  if (gSheet) {
    gSheet.getRange(1, 1, 1, 8).setValues([[
      'Goal ID', 'Goal Name', 'Target Amount (₹)', 'Saved Amount (₹)', 'Target Date',
      'Category', 'Notes', 'Created At'
    ]]);
    gSheet.setColumnWidth(1, 95);
    gSheet.setColumnWidth(2, 220);
    gSheet.setColumnWidth(3, 140);
    gSheet.setColumnWidth(4, 140);
    gSheet.setColumnWidth(5, 120);
    var gRows = Math.max(gSheet.getMaxRows(), 20);
    gSheet.getRange(2, 3, gRows - 1, 2).setNumberFormat('[$₹-en-IN] #,##,##0.00').setFontWeight('bold');
    try {
      if (gSheet.getBandings().length === 0) {
        gSheet.getRange(1, 1, gSheet.getMaxRows(), gSheet.getMaxColumns())
              .applyRowBanding(SpreadsheetApp.BandingTheme.GREEN, true, false);
      }
    } catch (e) {}
  }
}

// =================== TRANSACTION CRUD =======================

/**
 * Adds a new transaction row.
 * @param {Object} data - Transaction fields
 * @returns {string} New transaction ID
 */
function addTransaction(data) {
  _validateTransaction(data);
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  var id = Utilities.getUuid();
  var now = new Date().toISOString();
  var row = [
    id,
    data.date,
    data.type,
    parseFloat(data.amount),
    data.category || '',
    data.subcategory || '',
    data.description || '',
    data.payment_method || 'cash',
    data.account_label || '',
    data.notes || '',
    data.tags || '',
    data.recurring_id || '',
    now
  ];
  sheet.appendRow(row);
  return id;
}

/**
 * Returns transactions filtered by month/category/type/method/search.
 * @param {Object} filters - { month:'YYYY-MM', category, type, payment_method, search, page, pageSize }
 * @returns {Object} { rows, total, page, pageSize }
 */
function getTransactions(filters) {
  filters = filters || {};
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { rows: [], total: 0, page: 1, pageSize: 50 };

  var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  var rows = data.map(function(r) {
    return {
      id: r[0], date: _formatDateValue(r[1]), type: r[2], amount: parseFloat(r[3]) || 0, category: r[4],
      subcategory: r[5], description: r[6], payment_method: r[7],
      account_label: r[8], notes: r[9], tags: r[10],
      recurring_id: r[11], created_at: r[12]
    };
  }).filter(function(r) { return r.id !== ''; });

  // Apply filters
  if (filters.month) {
    var normMonth = _formatMonthValue(filters.month);
    rows = rows.filter(function(r) {
      return r.date.startsWith(normMonth);
    });
  }
  if (filters.category) {
    rows = rows.filter(function(r) { return r.category === filters.category; });
  }
  if (filters.type) {
    rows = rows.filter(function(r) { return r.type === filters.type; });
  }
  if (filters.payment_method) {
    rows = rows.filter(function(r) { return r.payment_method === filters.payment_method; });
  }
  if (filters.search) {
    var q = filters.search.toLowerCase();
    rows = rows.filter(function(r) {
      return (r.description || '').toLowerCase().indexOf(q) >= 0 ||
             (r.notes || '').toLowerCase().indexOf(q) >= 0 ||
             (r.category || '').toLowerCase().indexOf(q) >= 0 ||
             (r.tags || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  // Sort by date descending
  rows.sort(function(a, b) { return b.date > a.date ? 1 : -1; });

  var total = rows.length;
  var page = parseInt(filters.page) || 1;
  var pageSize = parseInt(filters.pageSize) || 50;
  var start = (page - 1) * pageSize;
  var paged = rows.slice(start, start + pageSize);

  return { rows: paged, total: total, page: page, pageSize: pageSize };
}

/**
 * Updates an existing transaction by ID.
 */
function updateTransaction(id, data) {
  _validateTransaction(data);
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Transaction not found: ' + id);
  sheet.getRange(rowIndex, 1, 1, 13).setValues([[
    id,
    data.date,
    data.type,
    parseFloat(data.amount),
    data.category || '',
    data.subcategory || '',
    data.description || '',
    data.payment_method || 'cash',
    data.account_label || '',
    data.notes || '',
    data.tags || '',
    data.recurring_id || '',
    sheet.getRange(rowIndex, 13).getValue() // preserve created_at
  ]]);
  return true;
}

/**
 * Deletes a transaction row by ID.
 */
function deleteTransaction(id) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Transaction not found: ' + id);
  sheet.deleteRow(rowIndex);
  return true;
}

// ==================== DASHBOARD DATA ========================

/**
 * Returns all data needed for the dashboard for a given month.
 * @param {string} month - "YYYY-MM"
 * @returns {Object} Dashboard aggregates
 */
function getDashboardData(month) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  var lastRow = sheet.getLastRow();
  var normMonth = _formatMonthValue(month);

  var allRows = [];
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    allRows = data.map(function(r) {
      return { id: r[0], date: _formatDateValue(r[1]), type: r[2], amount: parseFloat(r[3]) || 0, category: r[4] };
    }).filter(function(r) { return r.id !== ''; });
  }

  // Current month rows (exclude transfers from expense/income calculations)
  var monthRows = allRows.filter(function(r) { return r.date.startsWith(normMonth); });

  var totalExpense = 0, totalIncome = 0;
  var byCategory = {};

  monthRows.forEach(function(r) {
    if (r.type === 'expense') {
      totalExpense += r.amount;
      byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;
    } else if (r.type === 'income') {
      totalIncome += r.amount;
    }
    // transfers excluded from totals
  });

  // 6-month trend (ending at `normMonth`)
  var trend = _buildTrend(allRows, normMonth, 6);

  // Budgets for this month
  var budgets = getBudgets(normMonth);

  // Goals
  var goals = getGoals();

  // Re-fetch full recent rows
  var recentFull = [];
  if (lastRow > 1) {
    var fullData = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    var monthFull = fullData.map(function(r) {
      return {
        id: r[0], date: _formatDateValue(r[1]), type: r[2], amount: parseFloat(r[3]) || 0,
        category: r[4], subcategory: r[5], description: r[6], payment_method: r[7]
      };
    }).filter(function(r) { return r.date.startsWith(normMonth) && r.id !== ''; });
    monthFull.sort(function(a, b) { return b.date > a.date ? 1 : -1; });
    recentFull = monthFull.slice(0, 10);
  }

  return {
    totalExpense: totalExpense,
    totalIncome: totalIncome,
    netSavings: totalIncome - totalExpense,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0,
    byCategory: byCategory,
    trend: trend,
    budgets: budgets,
    goals: goals,
    recentTransactions: recentFull
  };
}

function _buildTrend(allRows, endMonth, count) {
  var parts = endMonth.split('-');
  var year = parseInt(parts[0]);
  var month = parseInt(parts[1]);
  var result = [];

  for (var i = count - 1; i >= 0; i--) {
    var m = month - i;
    var y = year;
    while (m <= 0) { m += 12; y--; }
    var key = y + '-' + (m < 10 ? '0' + m : m);
    var expense = 0, income = 0;
    allRows.forEach(function(r) {
      if (r.date.startsWith(key)) {
        if (r.type === 'expense') expense += r.amount;
        else if (r.type === 'income') income += r.amount;
      }
    });
    result.push({ month: key, expense: expense, income: income });
  }
  return result;
}

// ======================= BUDGETS ============================

function setBudget(categoryId, month, amount) {
  var numAmt = parseFloat(amount);
  if (isNaN(numAmt) || numAmt < 0) {
    throw new Error('Budget amount must be a positive number or zero.');
  }
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Budgets');
  var lastRow = sheet.getLastRow();
  var now = new Date().toISOString();
  var normMonth = _formatMonthValue(month);

  // Check if budget already exists for this category+month
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][1]) === String(categoryId) && _formatMonthValue(data[i][2]) === normMonth) {
        // Update existing
        sheet.getRange(i + 2, 4).setValue(numAmt);
        return data[i][0];
      }
    }
  }
  var id = Utilities.getUuid();
  sheet.appendRow([id, categoryId, normMonth, numAmt, now]);
  return id;
}

function getBudgets(month) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Budgets');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var targetMonth = month ? _formatMonthValue(month) : '';
  return data.filter(function(r) {
    var rMonth = _formatMonthValue(r[2]);
    return r[0] !== '' && (!targetMonth || rMonth === targetMonth);
  }).map(function(r) {
    return {
      id: r[0], category_id: r[1], month: _formatMonthValue(r[2]),
      amount: parseFloat(r[3]) || 0, created_at: r[4]
    };
  });
}

function deleteBudget(id) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Budgets');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Budget not found: ' + id);
  sheet.deleteRow(rowIndex);
  return true;
}

// ======================== BILLS =============================

function addBill(data) {
  _validateBill(data);
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Bills');
  var id = Utilities.getUuid();
  var now = new Date().toISOString();
  sheet.appendRow([
    id, data.name, parseFloat(data.amount), data.category || '',
    parseInt(data.due_day) || 1, data.next_due || '',
    data.frequency || 'monthly', data.payment_method || 'auto',
    data.auto_pay === true ? 'true' : 'false',
    data.notes || '', 'true', now
  ]);
  return id;
}

function getBills() {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Bills');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  return data.filter(function(r) { return r[0] !== '' && String(r[10]) !== 'false'; })
    .map(function(r) {
      return { id: r[0], name: r[1], amount: parseFloat(r[2]) || 0, category: r[3],
               due_day: r[4], next_due: _formatDateValue(r[5]), frequency: r[6],
               payment_method: r[7], auto_pay: r[8], notes: r[9],
               active: r[10], created_at: r[11] };
    });
}

function updateBill(id, data) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Bills');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Bill not found: ' + id);
  var existing = sheet.getRange(rowIndex, 1, 1, 12).getValues()[0];
  sheet.getRange(rowIndex, 1, 1, 12).setValues([[
    id,
    data.name !== undefined ? data.name : existing[1],
    data.amount !== undefined ? parseFloat(data.amount) : existing[2],
    data.category !== undefined ? data.category : existing[3],
    data.due_day !== undefined ? parseInt(data.due_day) : existing[4],
    data.next_due !== undefined ? data.next_due : existing[5],
    data.frequency !== undefined ? data.frequency : existing[6],
    data.payment_method !== undefined ? data.payment_method : existing[7],
    data.auto_pay !== undefined ? String(data.auto_pay) : existing[8],
    data.notes !== undefined ? data.notes : existing[9],
    data.active !== undefined ? String(data.active) : existing[10],
    existing[11]
  ]]);
  return true;
}

function deleteBill(id) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Bills');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Bill not found: ' + id);
  sheet.deleteRow(rowIndex);
  return true;
}

/**
 * Marks a bill as paid: creates an expense transaction, advances next_due.
 * Prevents duplicate payment if already paid this month.
 */
function markBillPaid(billId) {
  var ss = getOrCreateUserSpreadsheet();
  var billSheet = ss.getSheetByName('Bills');
  var rowIndex = _findRowById(billSheet, billId, 1);
  if (!rowIndex) throw new Error('Bill not found: ' + billId);

  var billRow = billSheet.getRange(rowIndex, 1, 1, 12).getValues()[0];
  var billName = billRow[1];
  var amount   = parseFloat(billRow[2]) || 0;
  var category = billRow[3];
  var nextDue  = _formatDateValue(billRow[5]);
  var frequency= String(billRow[6]) || 'monthly';

  // Duplicate check: search transactions for this bill in the same month
  var today = _todayISO();
  var dupeMonth = today.substring(0, 7);
  var txSheet = ss.getSheetByName('Transactions');
  var lastTx = txSheet.getLastRow();
  if (lastTx > 1) {
    var txData = txSheet.getRange(2, 1, lastTx - 1, 13).getValues();
    var duplicate = txData.some(function(r) {
      return String(r[6]) === 'Bill: ' + billName &&
             _formatDateValue(r[1]).startsWith(dupeMonth);
    });
    if (duplicate) throw new Error('This bill was already paid this month.');
  }

  // Create expense transaction
  var txId = addTransaction({
    date: today,
    type: 'expense',
    amount: amount,
    category: category,
    description: 'Bill: ' + billName,
    payment_method: billRow[7] || 'other',
    recurring_id: billId
  });

  // Advance next_due
  var newNextDue = _advanceDueDate(nextDue, frequency);
  billSheet.getRange(rowIndex, 6).setValue(newNextDue);

  return { transactionId: txId, newNextDue: newNextDue };
}

function _advanceDueDate(dateStr, frequency) {
  if (!dateStr) return '';
  var parts = String(dateStr).substring(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);

  var d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;

  switch (frequency) {
    case 'weekly':    d.setDate(d.getDate() + 7); break;
    case 'monthly':   d.setMonth(d.getMonth() + 1); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    default:          d.setMonth(d.getMonth() + 1); break;
  }

  var y = d.getFullYear();
  var m = String(d.getMonth() + 1);
  if (m.length < 2) m = '0' + m;
  var dt = String(d.getDate());
  if (dt.length < 2) dt = '0' + dt;
  return y + '-' + m + '-' + dt;
}

// ======================== GOALS =============================

function addGoal(data) {
  if (!data.name) throw new Error('Goal name is required.');
  if (!data.target_amount || parseFloat(data.target_amount) <= 0)
    throw new Error('Target amount must be positive.');
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Goals');
  var id = Utilities.getUuid();
  var now = new Date().toISOString();
  sheet.appendRow([
    id, data.name, parseFloat(data.target_amount),
    parseFloat(data.current_amount) || 0,
    data.target_date || '', data.category || '',
    data.notes || '', now
  ]);
  return id;
}

function getGoals() {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Goals');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return data.filter(function(r) { return r[0] !== ''; }).map(function(r) {
    return {
      id: r[0], name: r[1],
      target_amount: parseFloat(r[2]) || 0,
      current_amount: parseFloat(r[3]) || 0,
      target_date: _formatDateValue(r[4]),
      category: r[5], notes: r[6], created_at: r[7]
    };
  });
}

function updateGoal(id, data) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Goals');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Goal not found: ' + id);
  var ex = sheet.getRange(rowIndex, 1, 1, 8).getValues()[0];
  sheet.getRange(rowIndex, 1, 1, 8).setValues([[
    id,
    data.name !== undefined ? data.name : ex[1],
    data.target_amount !== undefined ? parseFloat(data.target_amount) : ex[2],
    data.current_amount !== undefined ? parseFloat(data.current_amount) : ex[3],
    data.target_date !== undefined ? data.target_date : ex[4],
    data.category !== undefined ? data.category : ex[5],
    data.notes !== undefined ? data.notes : ex[6],
    ex[7]
  ]]);
  return true;
}

function deleteGoal(id) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Goals');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Goal not found: ' + id);
  sheet.deleteRow(rowIndex);
  return true;
}

// ====================== CATEGORIES ==========================

function getCategories() {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Categories');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  return data.filter(function(r) { return r[0] !== ''; }).map(function(r) {
    return { id: r[0], name: r[1], type: r[2], icon: r[3], color: r[4],
             parent_id: r[5], created_at: r[6] };
  });
}

function addCategory(data) {
  if (!data.name) throw new Error('Category name is required.');
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Categories');
  var id = Utilities.getUuid();
  var now = new Date().toISOString();
  sheet.appendRow([id, data.name, data.type || 'expense',
    data.icon || '📌', data.color || '#64748b', data.parent_id || '', now]);
  return id;
}

function updateCategory(id, data) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Categories');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Category not found: ' + id);
  var ex = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];
  sheet.getRange(rowIndex, 1, 1, 7).setValues([[
    id,
    data.name !== undefined ? data.name : ex[1],
    data.type !== undefined ? data.type : ex[2],
    data.icon !== undefined ? data.icon : ex[3],
    data.color !== undefined ? data.color : ex[4],
    data.parent_id !== undefined ? data.parent_id : ex[5],
    ex[6]
  ]]);
  return true;
}

function deleteCategory(id) {
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Categories');
  var rowIndex = _findRowById(sheet, id, 1);
  if (!rowIndex) throw new Error('Category not found: ' + id);
  sheet.deleteRow(rowIndex);
  return true;
}

// ====================== CSV IMPORT ==========================

/**
 * Parses CSV text and returns a preview with duplicate detection.
 * @param {string} csvText - Raw CSV string
 * @param {Object} mapping - { dateCol, amountCol, descriptionCol, typeCol, debitValue, creditValue }
 * @returns {Object} { rows (parsed), duplicates (indices), headers }
 */
function previewCSVImport(csvText, mapping) {
  if (!csvText) throw new Error('CSV text is empty.');
  var lines = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (lines.length < 2) throw new Error('CSV must have at least a header row and one data row.');

  var headers = _parseCSVLine(lines[0]);
  var rows = [];
  for (var i = 1; i < Math.min(lines.length, 201); i++) {
    var cols = _parseCSVLine(lines[i]);
    if (cols.length < 2) continue;
    var dateVal  = (cols[mapping.dateCol] || '').trim();
    var amtVal   = (cols[mapping.amountCol] || '').replace(/[₹,\s]/g, '').trim();
    var descVal  = (cols[mapping.descriptionCol] || '').trim();
    var typeInd  = mapping.typeCol !== undefined ? (cols[mapping.typeCol] || '').trim() : '';
    var type     = 'expense';
    if (mapping.typeCol !== undefined) {
      type = (typeInd === mapping.debitValue) ? 'expense' : 'income';
    }
    var parsedDate = _parseFlexibleDate(dateVal);
    var amount = Math.abs(parseFloat(amtVal)) || 0;
    rows.push({
      raw: cols, parsedDate: parsedDate, amount: amount,
      description: descVal, type: type, valid: !!parsedDate && amount > 0,
      error: !parsedDate ? 'Invalid date' : (amount <= 0 ? 'Invalid amount' : '')
    });
  }

  // Duplicate detection against existing transactions
  var ss = getOrCreateUserSpreadsheet();
  var txSheet = ss.getSheetByName('Transactions');
  var lastRow = txSheet.getLastRow();
  var existingKeys = {};
  if (lastRow > 1) {
    var txData = txSheet.getRange(2, 1, lastRow - 1, 7).getValues();
    txData.forEach(function(r) {
      var dStr = _formatDateValue(r[1]);
      var amtNum = parseFloat(r[3]) || 0;
      var descStr = String(r[6] || '').trim().toLowerCase();
      var key = dStr + '|' + amtNum + '|' + descStr;
      existingKeys[key] = true;
    });
  }
  rows.forEach(function(r, idx) {
    var descStr = String(r.description || '').trim().toLowerCase();
    var key = r.parsedDate + '|' + (parseFloat(r.amount) || 0) + '|' + descStr;
    r.isDuplicate = !!existingKeys[key];
  });

  return { headers: headers, rows: rows.slice(0, 100), totalParsed: rows.length };
}

/**
 * Bulk-inserts approved rows into Transactions sheet.
 * @param {Array} rows - Array of { parsedDate, amount, description, type, category }
 * @returns {Object} { imported, skipped, errors }
 */
function confirmCSVImport(rows) {
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error('No rows to import.');
  var ss = getOrCreateUserSpreadsheet();
  var sheet = ss.getSheetByName('Transactions');
  var imported = 0, skipped = 0, errors = 0;
  var now = new Date().toISOString();
  var toAppend = [];

  rows.forEach(function(r) {
    if (r.skip || r.isDuplicate) { skipped++; return; }
    if (!r.parsedDate || !r.amount) { errors++; return; }
    toAppend.push([
      Utilities.getUuid(), r.parsedDate, r.type || 'expense',
      parseFloat(r.amount), r.category || 'Other', r.subcategory || '',
      r.description || '', r.payment_method || 'other', '', '', '', '', now
    ]);
    imported++;
  });

  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, 13).setValues(toAppend);
  }
  return { imported: imported, skipped: skipped, errors: errors };
}

// ====================== CSV EXPORT ==========================

/**
 * Returns a CSV string of filtered transactions.
 */
function exportTransactionsCSV(filters) {
  var result = getTransactions(Object.assign({}, filters || {}, { page: 1, pageSize: 10000 }));
  var rows = result.rows;
  var headers = ['ID','Date','Type','Amount','Category','Subcategory','Description',
                 'Payment Method','Account Label','Notes','Tags','Created At'];
  var lines = [headers.join(',')];
  rows.forEach(function(r) {
    lines.push([
      _csvEscape(r.id), _csvEscape(r.date), _csvEscape(r.type),
      r.amount, _csvEscape(r.category), _csvEscape(r.subcategory),
      _csvEscape(r.description), _csvEscape(r.payment_method),
      _csvEscape(r.account_label), _csvEscape(r.notes),
      _csvEscape(r.tags), _csvEscape(r.created_at)
    ].join(','));
  });
  return lines.join('\n');
}

// ==================== MAIN ENTRY POINT ======================

/**
 * Single server-side entry point.
 * Called from client via: google.script.run.processRequest(action, params, callback)
 *
 * @param {string} action - Function name to dispatch
 * @param {*}      params - Arguments to pass
 * @returns {Object} { success: true, data: ... } or { success: false, error: '...' }
 */
function processRequest(action, params) {
  try {
    var data;
    switch (action) {
      // Transactions
      case 'addTransaction':       data = addTransaction(params);              break;
      case 'getTransactions':      data = getTransactions(params);             break;
      case 'updateTransaction':    data = updateTransaction(params.id, params.data); break;
      case 'deleteTransaction':    data = deleteTransaction(params.id);        break;
      // Dashboard
      case 'getDashboardData':     data = getDashboardData(params.month);      break;
      // Budgets
      case 'setBudget':            data = setBudget(params.categoryId, params.month, params.amount); break;
      case 'getBudgets':           data = getBudgets(params.month);            break;
      case 'deleteBudget':         data = deleteBudget(params.id);             break;
      // Bills
      case 'addBill':              data = addBill(params);                     break;
      case 'getBills':             data = getBills();                          break;
      case 'updateBill':           data = updateBill(params.id, params.data); break;
      case 'deleteBill':           data = deleteBill(params.id);              break;
      case 'markBillPaid':         data = markBillPaid(params.billId);        break;
      // Goals
      case 'addGoal':              data = addGoal(params);                    break;
      case 'getGoals':             data = getGoals();                         break;
      case 'updateGoal':           data = updateGoal(params.id, params.data); break;
      case 'deleteGoal':           data = deleteGoal(params.id);              break;
      // Categories
      case 'getCategories':        data = getCategories();                    break;
      case 'addCategory':          data = addCategory(params);                break;
      case 'updateCategory':       data = updateCategory(params.id, params.data); break;
      case 'deleteCategory':       data = deleteCategory(params.id);          break;
      // CSV
      case 'previewCSVImport':     data = previewCSVImport(params.csvText, params.mapping); break;
      case 'confirmCSVImport':     data = confirmCSVImport(params.rows);      break;
      case 'exportTransactionsCSV':data = exportTransactionsCSV(params);      break;
      // Beautify
      case 'beautifySheet':        beautifySpreadsheet(getOrCreateUserSpreadsheet()); data = true; break;
      // Init
      case 'init':
        var ss = getOrCreateUserSpreadsheet();
        data = {
          spreadsheetId: ss.getId(),
          spreadsheetUrl: ss.getUrl(),
          categories: getCategories(),
          userEmail: Session.getActiveUser().getEmail()
        };
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    return { success: true, data: data };
  } catch (err) {
    Logger.log('processRequest error [' + action + ']: ' + err.message);
    return { success: false, error: err.message };
  }
}

// ==================== PRIVATE HELPERS =======================

function _validateTransaction(data) {
  if (!data) throw new Error('Transaction data is required.');
  if (!data.date) throw new Error('Date is required.');
  if (!_isValidDate(data.date)) throw new Error('Invalid date format. Use YYYY-MM-DD.');
  if (!data.type || ['expense','income','transfer'].indexOf(data.type) < 0)
    throw new Error('Type must be expense, income, or transfer.');
  if (data.amount === undefined || data.amount === null || parseFloat(data.amount) <= 0)
    throw new Error('Amount must be a positive number.');
  var validMethods = ['cash','UPI','debit_card','credit_card','net_banking','wallet','other'];
  if (data.payment_method && validMethods.indexOf(data.payment_method) < 0)
    throw new Error('Invalid payment method.');
}

function _validateBill(data) {
  if (!data.name) throw new Error('Bill name is required.');
  if (!data.amount || parseFloat(data.amount) <= 0) throw new Error('Amount must be positive.');
}

function _isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function _todayISO() {
  try {
    return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  } catch (e) {
    var d = new Date();
    var mm = d.getMonth() + 1;
    var dd = d.getDate();
    return d.getFullYear() + '-' + (mm < 10 ? '0' + mm : mm) + '-' + (dd < 10 ? '0' + dd : dd);
  }
}

/**
 * Normalizes any date value (Date object, ISO string, etc.) to canonical 'YYYY-MM-DD'.
 */
function _formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    var d = String(val.getDate());
    if (d.length < 2) d = '0' + d;
    return y + '-' + m + '-' + d;
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  var parsed = _parseFlexibleDate(s);
  return parsed || s;
}

/**
 * Normalizes any month value (Date object, string) to 'YYYY-MM'.
 */
function _formatMonthValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    return y + '-' + m;
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.substring(0, 7);
  }
  return s;
}

/**
 * Finds the sheet row number (1-based) of the row with matching ID in column `idCol`.
 */
function _findRowById(sheet, id, idColIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  var colVals = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
  var targetId = String(id);
  for (var i = 0; i < colVals.length; i++) {
    if (String(colVals[i][0]) === targetId) return i + 2;
  }
  return null;
}

function _parseCSVLine(line) {
  var result = [];
  var inQuotes = false;
  var current = '';
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function _parseFlexibleDate(str) {
  if (!str) return null;
  // ISO: 2026-10-25
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // DD/MM/YYYY or DD-MM-YYYY
  var m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    var d = m[1].padStart(2,'0'), mo = m[2].padStart(2,'0'), y = m[3];
    return y + '-' + mo + '-' + d;
  }
  // MM/DD/YYYY
  var m2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) {
    var mo2 = m2[1].padStart(2,'0'), d2 = m2[2].padStart(2,'0'), y2 = m2[3];
    if (parseInt(mo2) <= 12) return y2 + '-' + mo2 + '-' + d2;
  }
  // Try native parse as last resort
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    var py = parsed.getFullYear();
    var pm = String(parsed.getMonth() + 1);
    if (pm.length < 2) pm = '0' + pm;
    var pd = String(parsed.getDate());
    if (pd.length < 2) pd = '0' + pd;
    return py + '-' + pm + '-' + pd;
  }
  return null;
}

function _csvEscape(val) {
  if (val === undefined || val === null) return '';
  var s = String(val);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
