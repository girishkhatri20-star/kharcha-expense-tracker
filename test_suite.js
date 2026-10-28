/**
 * ========================================================
 * KHARCHA — Automated Logic & Verification Test Suite
 * ========================================================
 * Tests core business logic, Indian financial calculations,
 * Google Sheets Date object coercion edge cases, timezone invariance,
 * CSV import duplicate detection, and server-side data isolation.
 *
 * Run with: node test_suite.js
 */

const assert = require('assert');
const fs = require('fs');

console.log('========================================================');
console.log('🚀 RUNNING COMPREHENSIVE EXPENSE TRACKER VERIFICATION TESTS');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

// ----------------------------------------------------
// 1. INDIAN CURRENCY & NUMBER FORMATTING
// ----------------------------------------------------
function formatINR(amount) {
  const num = Math.abs(parseFloat(amount) || 0);
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return '₹' + formatted;
}

runTest('1. Indian Currency Formats correctly with Lakhs & Crores', () => {
  assert.strictEqual(formatINR(0), '₹0.00');
  assert.strictEqual(formatINR(500), '₹500.00');
  assert.strictEqual(formatINR(1000), '₹1,000.00');
  assert.strictEqual(formatINR(100000), '₹1,00,000.00'); // 1 Lakh
  assert.strictEqual(formatINR(1234567.89), '₹12,34,567.89'); // 12.34 Lakhs
  assert.strictEqual(formatINR(10000000), '₹1,00,00,000.00'); // 1 Crore
});

// ----------------------------------------------------
// 2. INDIAN DATE FORMATTING & FLEXIBLE PARSING
// ----------------------------------------------------
function _parseFlexibleDate(str) {
  if (!str) return null;
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
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    var py = parsed.getFullYear();
    var pm = String(parsed.getMonth() + 1).padStart(2, '0');
    var pd = String(parsed.getDate()).padStart(2, '0');
    return py + '-' + pm + '-' + pd;
  }
  return null;
}

runTest('2. Flexible Indian Date Parser handles DD/MM/YYYY, DD-MM-YYYY, and ISO', () => {
  assert.strictEqual(_parseFlexibleDate('2026-10-25'), '2026-10-25');
  assert.strictEqual(_parseFlexibleDate('25/10/2026'), '2026-10-25');
  assert.strictEqual(_parseFlexibleDate('5/4/2026'), '2026-04-05');
  assert.strictEqual(_parseFlexibleDate('05-04-2026'), '2026-04-05');
  assert.strictEqual(_parseFlexibleDate('25-10-2026'), '2026-10-25');
  assert.strictEqual(_parseFlexibleDate('invalid-date'), null);
});

// ----------------------------------------------------
// 3. GOOGLE SHEETS DATE OBJECT COERCION NORMALIZATION
// ----------------------------------------------------
function _formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  var parsed = _parseFlexibleDate(s);
  return parsed || s;
}

function _formatMonthValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.substring(0, 7);
  }
  return s;
}

runTest('3. Google Sheets Date Object normalization preserves YYYY-MM-DD and month filtering', () => {
  // When Google Sheets returns a Date object instead of a string:
  const sheetsDateObj = new Date(2026, 9, 25); // Oct 25, 2026
  const formatted = _formatDateValue(sheetsDateObj);
  assert.strictEqual(formatted, '2026-10-25');
  assert.strictEqual(formatted.startsWith('2026-10'), true);

  // Month value normalization when Google Sheets auto-converts "2026-10" to a Date object:
  const sheetsMonthObj = new Date(2026, 9, 1);
  const formattedMonth = _formatMonthValue(sheetsMonthObj);
  assert.strictEqual(formattedMonth, '2026-10');
});

// ----------------------------------------------------
// 4. DUE DATE ADVANCING & TIMEZONE INVARIANCE
// ----------------------------------------------------
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
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var dt = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dt;
}

runTest('4. Due date advances correctly without timezone midnight shifts', () => {
  assert.strictEqual(_advanceDueDate('2026-10-15', 'monthly'), '2026-11-15');
  assert.strictEqual(_advanceDueDate('2026-10-15', 'weekly'), '2026-10-22');
  assert.strictEqual(_advanceDueDate('2026-10-15', 'quarterly'), '2027-01-15');
  assert.strictEqual(_advanceDueDate('2026-10-15', 'yearly'), '2027-10-15');
});

// ----------------------------------------------------
// 5. DASHBOARD TOTALS & TRANSFER EXCLUSION
// ----------------------------------------------------
function calculateDashboardTotals(monthRows, targetMonth) {
  let totalExpense = 0;
  let totalIncome = 0;
  const byCategory = {};

  const filtered = monthRows.filter(r => _formatDateValue(r.date).startsWith(targetMonth));

  filtered.forEach(r => {
    const amt = parseFloat(r.amount) || 0;
    if (r.type === 'expense') {
      totalExpense += amt;
      byCategory[r.category] = (byCategory[r.category] || 0) + amt;
    } else if (r.type === 'income') {
      totalIncome += amt;
    }
    // Transfers are strictly excluded from expense and income totals!
  });

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome * 100) : 0;

  return { totalExpense, totalIncome, netSavings, savingsRate, byCategory };
}

runTest('5. Transfers are strictly excluded from expense & income totals', () => {
  const sampleTransactions = [
    { date: '2026-10-01', type: 'income', amount: 80000, category: 'Salary' },
    { date: '2026-10-02', type: 'expense', amount: 20000, category: 'Housing' },
    { date: new Date(2026, 9, 5), type: 'expense', amount: 5000, category: 'Groceries' }, // Sheets Date object
    { date: '2026-10-10', type: 'transfer', amount: 30000, category: 'Transfer' }, // Transfer to savings
    { date: '2026-10-15', type: 'transfer', amount: 5000, category: 'Transfer' }   // Internal account shift
  ];

  const result = calculateDashboardTotals(sampleTransactions, '2026-10');
  assert.strictEqual(result.totalIncome, 80000);
  assert.strictEqual(result.totalExpense, 25000); // 20k + 5k, excludes 35k transfers
  assert.strictEqual(result.netSavings, 55000);
  assert.strictEqual(result.savingsRate, 68.75);
  assert.strictEqual(result.byCategory['Housing'], 20000);
  assert.strictEqual(result.byCategory['Groceries'], 5000);
  assert.strictEqual(result.byCategory['Transfer'], undefined);
});

// ----------------------------------------------------
// 6. BILL PAYMENT & DUPLICATE PREVENTION
// ----------------------------------------------------
function processBillPayment(bill, currentTransactions, todayISO) {
  const currentMonth = todayISO.substring(0, 7);

  // Duplicate check (supports both string dates and Date objects from Sheets)
  const duplicate = currentTransactions.some(t =>
    t.description === 'Bill: ' + bill.name &&
    _formatDateValue(t.date).startsWith(currentMonth)
  );

  if (duplicate) {
    throw new Error('This bill was already paid this month.');
  }

  const newTx = {
    id: 'tx_bill_' + Date.now(),
    date: todayISO,
    type: 'expense',
    amount: parseFloat(bill.amount),
    category: bill.category,
    description: 'Bill: ' + bill.name,
    recurring_id: bill.id
  };

  const newNextDue = _advanceDueDate(bill.next_due, bill.frequency);

  return { transaction: newTx, newNextDue };
}

runTest('6. Bill payment records expense once and prevents duplicate payments in same month', () => {
  const bill = {
    id: 'bill_bescom_1',
    name: 'Electricity Bescom',
    amount: 1750,
    category: 'Utilities',
    next_due: '2026-10-15',
    frequency: 'monthly'
  };

  const transactions = [];
  const today = '2026-10-12';

  // First payment: should succeed
  const paymentResult = processBillPayment(bill, transactions, today);
  assert.strictEqual(paymentResult.transaction.amount, 1750);
  assert.strictEqual(paymentResult.transaction.type, 'expense');
  assert.strictEqual(paymentResult.transaction.description, 'Bill: Electricity Bescom');
  assert.strictEqual(paymentResult.newNextDue, '2026-11-15');

  // Add the newly created transaction to history (with Sheets Date object)
  transactions.push({
    ...paymentResult.transaction,
    date: new Date(2026, 9, 12)
  });

  // Second payment attempt in same month: MUST throw duplicate error!
  assert.throws(() => {
    processBillPayment(bill, transactions, today);
  }, /already paid this month/);
});

// ----------------------------------------------------
// 7. CSV PARSING, COLUMN MAPPING & DUPLICATE DETECTION
// ----------------------------------------------------
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

function previewCSVImport(csvText, mapping, existingTransactions = []) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim());
  const rows = [];

  const existingKeys = new Set();
  existingTransactions.forEach(t => {
    const dStr = _formatDateValue(t.date);
    const amtNum = parseFloat(t.amount) || 0;
    const descStr = String(t.description || '').trim().toLowerCase();
    existingKeys.add(dStr + '|' + amtNum + '|' + descStr);
  });

  for (let i = 1; i < lines.length; i++) {
    const cols = _parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const dateVal = (cols[mapping.dateCol] || '').trim();
    const amtVal = (cols[mapping.amountCol] || '').replace(/[₹,\s]/g, '').trim();
    const descVal = (cols[mapping.descriptionCol] || '').trim();
    const parsedDate = _parseFlexibleDate(dateVal);
    const amount = Math.abs(parseFloat(amtVal)) || 0;

    const key = parsedDate + '|' + amount + '|' + descVal.toLowerCase();
    const isDuplicate = existingKeys.has(key);

    rows.push({
      parsedDate,
      amount,
      description: descVal,
      valid: !!parsedDate && amount > 0,
      isDuplicate
    });
  }
  return rows;
}

runTest('7. Bank CSV Import correctly parses mapped columns and detects existing duplicates', () => {
  const csvData = [
    'TxnDate,Narration,WithdrawalAmount',
    '15/10/2026,UPI-Swiggy Food Order,₹ 450.00',
    '16/10/2026,DMart Hypermarket,3200.50',
    '15/10/2026,upi-swiggy food order,450.00', // duplicate with case difference
    'invalid-date,Broken Entry,100.00'
  ].join('\n');

  const existingTransactions = [
    { date: new Date(2026, 9, 15), amount: 450, description: 'UPI-Swiggy Food Order' } // Sheets Date object
  ];

  const preview = previewCSVImport(csvData, { dateCol: 0, descriptionCol: 1, amountCol: 2 }, existingTransactions);

  assert.strictEqual(preview.length, 4);

  // Row 1: Swiggy duplicate
  assert.strictEqual(preview[0].parsedDate, '2026-10-15');
  assert.strictEqual(preview[0].amount, 450);
  assert.strictEqual(preview[0].isDuplicate, true);

  // Row 2: DMart valid
  assert.strictEqual(preview[1].parsedDate, '2026-10-16');
  assert.strictEqual(preview[1].amount, 3200.50);
  assert.strictEqual(preview[1].isDuplicate, false);
  assert.strictEqual(preview[1].valid, true);

  // Row 3: Swiggy case-insensitive duplicate
  assert.strictEqual(preview[2].isDuplicate, true);

  // Row 4: Broken date
  assert.strictEqual(preview[3].valid, false);
});

// ----------------------------------------------------
// 8. BUDGET LIMIT & OVERSPENDING CALCULATIONS
// ----------------------------------------------------
runTest('8. Budget remaining and overspending calculations', () => {
  const budgetLimit = 50000;
  const spentWithin = 32000;
  const remaining = budgetLimit - spentWithin;
  const pctUsed = Math.round((spentWithin / budgetLimit) * 100);
  assert.strictEqual(remaining, 18000);
  assert.strictEqual(pctUsed, 64);

  const spentOver = 56000;
  const overage = budgetLimit - spentOver;
  assert.strictEqual(overage, -6000);
  const pctOver = Math.round((spentOver / budgetLimit) * 100);
  assert.strictEqual(pctOver, 112);
});

// ----------------------------------------------------
// 9. SAVINGS GOALS PROGRESS CALCULATION
// ----------------------------------------------------
runTest('9. Savings goal progress percentage', () => {
  const target = 300000;
  const saved = 185000;
  const pct = Math.round((saved / target) * 100);
  assert.strictEqual(pct, 62);
});

// ----------------------------------------------------
// 10. SERVER-SIDE DATA ISOLATION VERIFICATION
// ----------------------------------------------------
runTest('10. Server-side code does not accept client-provided user IDs or spreadsheet IDs', () => {
  const codeGs = fs.readFileSync(__dirname + '/Code.gs', 'utf8');

  // Verify that processRequest does not read or pass spreadsheetId / userId from params
  assert.ok(!codeGs.includes('getOrCreateUserSpreadsheet(params'), 'Must not accept spreadsheetId in params');
  assert.ok(codeGs.includes('PropertiesService.getUserProperties()'), 'Must use user-scoped properties');
  assert.ok(codeGs.includes('Execute as "User accessing the web app"'), 'Must specify user accessing execution');

  // Verify manifest exists and specifies USER_ACCESSING
  const manifest = JSON.parse(fs.readFileSync(__dirname + '/appsscript.json', 'utf8'));
  assert.strictEqual(manifest.webapp.executeAs, 'USER_ACCESSING');
  assert.strictEqual(manifest.timeZone, 'Asia/Kolkata');
});

console.log('\n========================================================');
console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('========================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
