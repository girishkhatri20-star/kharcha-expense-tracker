# Kharcha — Verification & Test Report 🧪

This document records the comprehensive review, testing process, test scenarios, execution results, and regression checks performed on the Kharcha Personal Expense Tracker.

---

## 📋 Test Matrix & Execution Status

| Test ID | Flow / Area | Scenario / Description | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|---|
| **TEST-01** | **Indian Currency (INR)** | Amounts formatted with Indian numbering system (thousands, lakhs, crores). | ₹0.00, ₹1,000.00, ₹1,00,000.00 (1 Lakh), ₹12,34,567.89 (12.34 Lakhs), ₹1,00,00,000.00 (1 Crore). | Exactly matches Indian locale formatting rules using `toLocaleString('en-IN')`. | ✅ **PASS** |
| **TEST-02** | **Flexible Indian Date Parser** | User enters or imports dates in `DD/MM/YYYY`, `DD-MM-YYYY`, or `YYYY-MM-DD`. | All variants parsed to canonical ISO `YYYY-MM-DD` and displayed as `25 Oct 2026`. | All date patterns parsed accurately to `YYYY-MM-DD`. Invalid dates return `null`. | ✅ **PASS** |
| **TEST-03** | **Google Sheets Date Object Coercion** | Google Sheets returns JavaScript `Date` objects from `.getValues()`. | `_formatDateValue` and `_formatMonthValue` normalize `Date` objects to `YYYY-MM-DD` and `YYYY-MM`, preventing silent failure in `.startsWith()`. | Normalizes `new Date(2026, 9, 25)` to `'2026-10-25'`; month filter matches accurately. | ✅ **PASS** |
| **TEST-04** | **Due Date Advancing & Timezone Invariance** | Recurring bills advance due date by weekly, monthly, quarterly, or yearly frequencies. | Advances by exact cycle without timezone midnight rollovers (e.g. `2026-10-15` -> `2026-11-15`). | All frequencies advanced cleanly without 1-day backward offsets. | ✅ **PASS** |
| **TEST-05** | **Dashboard Calculations & Transfer Exclusion** | Aggregation of Total Income, Total Expenses, Net Savings, and Savings Rate % with internal transfers. | Transfers (`type === 'transfer'`) are strictly excluded from monthly expense and income totals. | Income: ₹80,000, Expense: ₹25,000, Net: ₹55,000, Savings Rate: 68.75%. Transfers (₹35,000) excluded. | ✅ **PASS** |
| **TEST-06** | **Recurring Bills & Duplicate Prevention** | User marks a recurring bill as paid for the current month. | Expense transaction created; next due date advanced; duplicate attempt in same month throws error even if previous date is a Sheets `Date` object. | Transaction created, due date advanced. Second payment in same month threw `This bill was already paid this month`. | ✅ **PASS** |
| **TEST-07** | **Bank CSV Import & Duplicate Detection** | User uploads bank statement CSV with custom columns, currency symbols, and existing transactions. | Headers parsed, columns mapped, duplicate rows detected (case-insensitive) and flagged, valid rows ready for import. | DMart entry identified as valid (₹3,200.50); Swiggy duplicate flagged; invalid dates flagged as invalid. | ✅ **PASS** |
| **TEST-08** | **Budget Limits & Overspending Warnings** | User sets overall limit (e.g., ₹50,000) and category limits. | Calculates remaining amount, percentage used, and warns when spending crosses 100%. | At ₹32,000 spent: 64% used, ₹18,000 left. At ₹56,000 spent: over by -₹6,000 (112%). | ✅ **PASS** |
| **TEST-09** | **Savings Goals Progress** | User tracks savings goals with target amount and current savings. | Percentage completed updates accurately. | ₹1,85,000 / ₹3,00,000 correctly displays 62% progress. | ✅ **PASS** |
| **TEST-10** | **Server-Side Data Isolation Verification** | Client calls backend via `processRequest`. | Backend does NOT accept client-supplied `userId`, `userEmail`, or `spreadsheetId`. Manifest enforces `USER_ACCESSING`. | Verified: zero client overrides for spreadsheet or user identity. Isolated per Google Drive. | ✅ **PASS** |

---

## 🛠️ Automated Test Suite Execution Output

Run via `node test_suite.js`:

```
========================================================
🚀 RUNNING COMPREHENSIVE EXPENSE TRACKER VERIFICATION TESTS
========================================================

✅ PASS: 1. Indian Currency Formats correctly with Lakhs & Crores
✅ PASS: 2. Flexible Indian Date Parser handles DD/MM/YYYY, DD-MM-YYYY, and ISO
✅ PASS: 3. Google Sheets Date Object normalization preserves YYYY-MM-DD and month filtering
✅ PASS: 4. Due date advances correctly without timezone midnight shifts
✅ PASS: 5. Transfers are strictly excluded from expense & income totals
✅ PASS: 6. Bill payment records expense once and prevents duplicate payments in same month
✅ PASS: 7. Bank CSV Import correctly parses mapped columns and detects existing duplicates
✅ PASS: 8. Budget remaining and overspending calculations
✅ PASS: 9. Savings goal progress percentage
✅ PASS: 10. Server-side code does not accept client-provided user IDs or spreadsheet IDs

========================================================
🎉 TEST SUMMARY: 10/10 TESTS PASSED
========================================================
```

---

## 🔍 Problems Identified and Resolved During Review

1. **Google Sheets Date Object Coercion in `getTransactions` & `getDashboardData`**:
   - *Problem*: In Google Sheets, cells formatted as dates are returned as JavaScript `Date` instances by `.getValues()`. Calling `.startsWith()` on `String(dateObj)` resulted in strings like `"Sun Oct 25 2026..."`, causing all transactions to fail month-filtering (`startsWith("2026-10") === false`).
   - *Fix*: Created `_formatDateValue(val)` and `_formatMonthValue(val)` to normalize `Date` objects and date strings to canonical `YYYY-MM-DD` and `YYYY-MM`. Also configured explicit text number format (`@`) on the Date column during sheet initialization.

2. **Timezone Rollover in `_advanceDueDate` and Client Dates**:
   - *Problem*: `new Date().toISOString().substring(0, 10)` in Indian Standard Time (UTC+5:30) can yield the previous day's date during morning hours before 05:30 AM IST.
   - *Fix*: Replaced `toISOString().substring(0, 10)` with local calendar component extraction (`getFullYear()`, `getMonth()`, `getDate()`) in both client and server logic. In Apps Script, `_todayISO()` now utilizes `Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')`.

3. **Hardcoded Month Selection**:
   - *Problem*: Client `selectedMonth` was hardcoded to `'2026-10'`.
   - *Fix*: Initialized dynamically via `getLocalCurrentMonth()` to the active device month.

4. **Category Dropdown UX in Add/Edit Transaction**:
   - *Problem*: Selecting "Income" or "Transfer" continued to show expense categories like "Groceries" and "Housing" in the dropdown.
   - *Fix*: Updated `populateCategorySelect(type)` to filter categories strictly matching the selected type.

5. **Missing Category & Budget Removal Controls**:
   - *Problem*: Users had no UI button to delete custom categories or remove a set category budget.
   - *Fix*: Added delete actions with confirmation dialogs, backed by `deleteCategory` and new `deleteBudget` endpoints.

6. **Missing Project Manifest (`appsscript.json`)**:
   - *Problem*: Without `appsscript.json`, Apps Script defaults to the project creator's timezone (or US Eastern) and unconfigured web app settings.
   - *Fix*: Added `appsscript.json` with `"timeZone": "Asia/Kolkata"`, `"runtimeVersion": "V8"`, and `"executeAs": "USER_ACCESSING"`.
