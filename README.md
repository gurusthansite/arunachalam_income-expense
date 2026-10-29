# Organization Income & Expense Management (Excel Powered)

A clean, modern, and responsive web application designed for managing the income, expenditures, and running balance of a single organization. **100% Excel-Powered** — uses local Microsoft Excel spreadsheets (`.xlsx`) directly for persistent data storage with zero database setup or cloud account requirements.

---

## Highlights

- **Excel-as-a-Database**:
  - All transactions, categories, organization settings, and audit logs are stored directly inside [`data/ledger.xlsx`](file:///d:/CodeBase/income-and-expense-manager/data/ledger.xlsx) on disk.
  - No Supabase, PostgreSQL, or external cloud databases required.
  - Works instantly out of the box with `npm run dev`.

- **Direct Excel Import & Export**:
  - **Live Download**: Download your organization's live Excel workbook (`.xlsx`) at any time directly from the sidebar or Settings page.
  - **Upload Existing Excel Files**: Upload and import an existing Excel spreadsheet to instantly load historical records into the system.
  - **Report Exports**: Export customized filtered statements to **Excel (.xlsx)**, **CSV**, or **PDF**.

- **Financial Dashboard**:
  - 4 Key Metric Cards: **Opening Balance**, **Total Income**, **Total Expenses**, and **Current Balance**:
    $$\text{Current Balance} = \text{Opening Balance} + \text{Total Income} - \text{Total Expenses}$$
  - Negative balance warning banner when expenses exceed available funds.
  - Income vs. Expense visual trend charts powered by **Recharts**.
  - Date filtering: Current Month, Last Month, Financial Year (FY), All Time, and Custom date ranges.

- **Add Income & Add Expense**:
  - Manual entry forms with INR (`₹`) currency formatting and integer paise precision to eliminate floating-point arithmetic errors.
  - Fields for Date, Category, Party (Received From / Paid To), Payment Method (Cash, UPI, Bank Transfer, Card, Other), Reference / Bill / Receipt Number, and Description notes.
  - Duplicate submission prevention and unsaved changes confirmation dialogs.

- **Transactions Table**:
  - Full-text search across descriptions, party names, reference numbers, and categories.
  - Filter by type (Income / Expense), category, and date range.
  - Sort by date and amount (ascending / descending).
  - Modal editing and deletion with immediate balance recalculation.
  - Pagination support.

- **Organization Settings & Categories**:
  - Configure Organization Profile, Opening Balance, Opening Date, and Financial Year Start Month.
  - Add, rename, and activate/deactivate income and expense categories.
  - **Data Safeguard**: Categories already linked to existing transactions cannot be permanently deleted (they can be deactivated to preserve ledger history).
  - Automatic audit trail recording all changes.

---

## Excel Workbook Structure (`data/ledger.xlsx`)

The application automatically creates and maintains `data/ledger.xlsx` with the following worksheets:

1. **`Transactions` Sheet**:
   - `ID`, `Date` (`YYYY-MM-DD`), `Type` (`income`/`expense`), `Amount` (INR numeric), `CategoryID`, `CategoryName`, `PersonName`, `PaymentMethod`, `ReferenceNumber`, `Description`, `CreatedAt`
2. **`Categories` Sheet**:
   - `ID`, `Name`, `Type` (`income`/`expense`), `IsActive` (`TRUE`/`FALSE`)
3. **`Settings` Sheet**:
   - `Key`, `Value` (stores `organization_name`, `logo_url`, `opening_balance`, `opening_balance_date`, `financial_year_start_month`)
4. **`AuditLogs` Sheet**:
   - `ID`, `Timestamp`, `Action` (`INSERT`/`UPDATE`/`DELETE`), `Entity`, `Summary`

---

## Getting Started Locally

### 1. Prerequisites
- Node.js 18.18+ (Node 20+ recommended)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The application will start immediately, auto-generate `data/ledger.xlsx` if it doesn't already exist, and load the dashboard.

---

## Managing Your Excel Data

1. **Download the Live Excel File**:
   - Click the **Download** button in the sidebar footer or navigate to **Settings -> Excel File Data**.
2. **Upload Existing Spreadsheet**:
   - Navigate to **Settings -> Excel File Data**, select your existing `.xlsx` spreadsheet, and click **Import Selected Excel File**.
3. **Edit Directly in Microsoft Excel**:
   - You can open `data/ledger.xlsx` directly in Microsoft Excel, Google Sheets, or LibreOffice Calc.
