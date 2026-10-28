# Kharcha — Mobile-Friendly Personal Expense Tracker (India) 🇮🇳

A clean, responsive, privacy-first personal expense tracker designed specifically for users in India. Works smoothly on mobile phones, tablets, and desktop computers.

Built with **Google Apps Script** and **Google Sheets**, ensuring each user has their own dedicated private spreadsheet stored in their own Google Drive.

---

## 🌟 Key Features

### 1. Indian Locale & Customizations
- **Currency**: Indian Rupees (`₹`, INR) formatted with standard Indian lakh/crore grouping (`₹1,00,000.00`).
- **Dates**: Clean India-friendly display formats (`25 Oct 2026`).
- **Payment Methods**: Tailored for Indian finance: UPI (Google Pay, PhonePe, Paytm), Debit Card, Credit Card, Net Banking, Cash, Digital Wallet, and Other.
- **Starting Categories**: Housing/Rent, Groceries, Food & Dining, Transport, Utilities, Shopping, Health, Education, Entertainment, Travel, Personal Care, Family, EMI/Loans, Insurance, Taxes/Fees, Salary, Freelance, Investments, and Transfers.

### 2. Privacy & Multi-User Architecture
- **Strict Data Isolation**: Deployed with **"Execute as: User accessing the web app"**.
- Each user who signs in accesses or automatically creates **their own private Google Sheet in their own Google Drive**.
- The script physically operates within the authenticated user's Google session, making cross-user data leakage impossible at the infrastructure level.
- **No Shared Database**: No single monolithic spreadsheet holding multiple people's financial details.
- **No Bank Passwords**: Never asks for or stores banking credentials.

### 3. Expense & Income Records
- Add, view, edit, search, and delete records.
- Records track: Type (Expense, Income, Transfer), Amount, Date, Category, Subcategory, Description/Merchant, Payment Method, Account Label, Notes, and Tags.
- **Transfer Exclusion**: Transfer records are accurately excluded from expense and income totals.

### 4. Interactive Dashboard
- Monthly overview of Total Income, Total Expenses, Net Savings, and Savings Rate %.
- Visual category spending breakdown with horizontal progress bars.
- 6-Month spending and income trend chart (pure CSS).
- Month-by-month navigation.
- Recent transactions list.

### 5. Budgets, Recurring Bills & Savings Goals
- **Monthly Budgets**: Set overall and per-category spending limits with progress indicators (Green <80%, Orange 80–99%, Red ≥100% with over-budget alerts).
- **Recurring Bills**: Track due dates, frequencies, and amounts.
- **"Mark as Paid" Automation**: Records an expense transaction automatically, advances the next due date, and **strictly prevents duplicate payments in the same cycle**.
- **Savings Goals**: Track progress toward financial milestones (Emergency Fund, Gold, Gadgets, etc.) with completion percentages and "+ Add Funds" quick actions.

### 6. Bank Statement CSV Import & Export
- Upload any bank or credit card CSV statement (HDFC, SBI, ICICI, Axis, Kotak, etc.).
- Step-by-step column mapping (Date, Amount, Description, Debit/Credit).
- Flexible Indian date parsing (`DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`).
- **Intelligent Duplicate Detection**: Compares against existing records and flags duplicates before importing.
- Preview table showing valid, duplicate, and error rows before final confirmation.
- One-click CSV export of filtered transactions.

---

## 🚀 Setup & Deployment Guide

Follow these steps to deploy your private web app to Google Apps Script:

### Step 1: Create a Google Apps Script Project
1. Open [script.google.com](https://script.google.com) in your browser.
2. Click **New project** (top left).
3. Name the project `Kharcha Expense Tracker`.

### Step 2: Add the Code Files
1. In the left file tree, click on `Code.gs`.
2. Replace all its contents with the code from `Code.gs` in this repository.
3. Click the **+** (Add a file) button next to "Files" and select **HTML**.
4. Name the file `index` (Google Apps Script will automatically append `.html`).
5. Replace all its contents with the code from `index.html` in this repository.
6. *(Recommended)* Click **Project Settings** (gear icon on left sidebar) > Check **Show "appsscript.json" manifest file in editor**. Back in the editor, click `appsscript.json` and paste the contents of `appsscript.json` from this repository (sets timezone to `Asia/Kolkata` and configures web app access).
7. Click the disk icon (**Save project**) or press `Cmd+S` / `Ctrl+S`.

### Step 3: Deploy as Web App
1. Click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon (**Select type**) and select **Web app**.
3. Fill in the deployment details:
   - **Description**: `Version 1.0 - Production`
   - **Execute as**: `User accessing the web app` *(CRITICAL for per-user privacy!)*
   - **Who has access**: `Anyone with a Google account`
4. Click **Deploy**.
5. Google will ask you to authorize permissions (Google Sheets and Google Drive access). Click **Authorize access**, choose your Google account, and proceed.
6. Copy the **Web App URL**. Share this URL with your users or bookmark it on your phone and computer.

---

## 🔒 Security & Privacy Model Analysis

### Why "Execute as: User accessing the web app" was chosen
| Approach | Privacy & Security Risk |
|---|---|
| **Single Shared Sheet (Execute as: Owner)** | ❌ **High Risk**. All users' records sit in one sheet. A script bug, regex error, or query injection could leak one user's financial details to another. |
| **Per-User Google Sheet (Execute as: User)** | ✅ **Completely Isolated**. The web app executes in the visiting user's authenticated context. The script creates and opens a spreadsheet inside **that specific user's Google Drive**. The script physically has zero permissions to access any other person's Drive or Sheet. |

### Limitations of Google Apps Script
1. **Initial OAuth Consent**: When a user opens the web app for the first time, Google displays standard OAuth permission consent screen requesting permission to create/manage spreadsheets in their Drive.
2. **Execution Quotas**: Google Apps Script has a daily execution time quota (90 minutes/day for free Gmail accounts, 6 hours/day for Google Workspace). Because execution is user-scoped, each user uses **their own personal Google account quota**, preventing one heavy user from exhausting someone else's quota.
3. **Cold Starts**: Apps Script web apps can take 1–2 seconds to wake up on the first load. The app provides immediate skeleton/loading feedback to keep the UI smooth.

---

## 📱 Mobile Experience (PWA / Add to Home Screen)
- **iOS Safari**: Open the Web App URL in Safari > Tap the **Share** button > Tap **Add to Home Screen**.
- **Android Chrome**: Open the Web App URL in Chrome > Tap the **3 dots** menu > Tap **Add to Home Screen** / **Install app**.
- Features mobile-first bottom navigation, slide-up bottom sheets for adding transactions, and touch-friendly controls.

---

## 🧪 Testing

To run the automated verification test suite locally:
```bash
node test_suite.js
```
See `TESTING.md` for complete testing details and results.
