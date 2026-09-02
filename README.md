# ArtXenith HRIS & Attendance System

**ArtXenith HRIS** is an enterprise-grade, full-stack Human Resource Information System built for ArtXenith. It manages employee lifecycles, org charts, request workflows, campaign & SDR performance tracking, dynamic commission slabs, spiffs, loans, direct HRIS web check-in & check-out attendance tracking, internal communications workspace, SDR dialer, and automated payroll with PDF payslips.

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Hosting_Cloud["Cloud Hosting (Namecheap / Vercel / VPS)"]
        API["ArtXenith HRIS Backend API\n(Express.js Node 22+)"]
        AuthMiddleware["JWT Authentication Middleware"]
        DB[(Database\nPostgreSQL / Supabase)]
        Frontend["ArtXenith HRIS Frontend\n(React / Modern Web Interface)"]
        
        API <--> DB
        Frontend <--> API
    end

    User["Employees / SDRs / Staff"] -- "Web Check-In / Check-Out (Timestamp Recorded)" --> Frontend
```

---

## Key Modules & Features

### 1. Authentication & Security
- **Multi-Tenant Auth**: JWT Bearer authentication with short-lived access tokens and refresh tokens.
- **Google SSO**: One-click Google Sign-In (`Sign in with Google`).
- **First-Time Login Security**: Enforced password change upon initial account creation.

### 2. Employee Records & Org Chart
- **360° Employee Profiles**: Full name, employee code (`EMP-001`), designation, phone, bank details, emergency contacts, photo, and shift parameters.
- **Hierarchical Org Chart**: Built automatically from manager-subordinate relations.
- **Compensation History**: Full audit trail of salary increments with effective dates and reasons.

### 3. HRIS Web Check-In & Attendance Management
- **Direct Web Check-In & Check-Out**: Staff members mark check-in/check-out directly from their HRIS dashboard portal.
- **Timestamp Accuracy**: Exact server timestamps recorded automatically upon check-in/out.
- **Late Minutes & Grace Period**: Automatic late minute calculation against employee shift start (`09:30`) and custom grace periods (`15 mins`).
- **Summary Metrics**: Monthly present days, late count, total late minutes, half-days, early departures, overtime, and leave totals.

### 4. Employee Self-Service & Request Workflows
- **Leave Requests**: Annual, Sick, Casual, Unpaid leave applications with manager approval/rejection workflow.
- **Half-Day Requests**: Single-click half-day applications.
- **Work From Home (WFH) Requests**: Date range WFH requests with approval status tracking.

### 5. SDR & Campaign Performance Tracking
- **Campaign Management**: Active/inactive campaigns with monthly show-up targets.
- **Team Allocation**: Assign Team Leads and SDRs to campaigns (`CampaignMember`).
- **Performance Logging**: Monthly performance metrics per SDR (Meetings Booked, Show-ups, No-shows, Cancelled Meetings).

### 6. Dynamic Commission Slabs & Spiffs
- **Slab-Based Commissions**: Tiered show-up commission rates (e.g., 1–10 showups @ $10/ea, 11–20 @ $15/ea, 21+ @ $20/ea).
- **Spiff Incentives**: Manager/Admin awarded one-off cash spiffs with audit reasons.

### 7. Loans & Salary Advances
- **Employee Loan Requests**: Request salary advances or loans with specified repayment target month/year.
- **Automated Deduction Engine**: Automatically deducts approved loan repayments during monthly payroll processing.

### 8. Payroll Engine & PDF Payslips
- **Automated Monthly Payroll**: Computes base salary, pro-rated attendance deductions, late penalties, loan repayments, spiffs, and commissions.
- **Automated PDF Payslips**: Generates downloadable PDF payslips using `PDFKit`.

### 9. Excel Sales Sheet & 4-Stage Project Progression
- **Interactive Sales Sheet**: Monthly filtered sales grid tracking Client Name, Project Name, Sale Amount, Amount Received, Remaining Balance, Installments, Payment Method, and Notes.
- **4 Predefined Project Stages**: `Initial Sketch` → `Line Art` → `Base Color` → `Final Artwork` with stage duration logging.
- **Stagnant Project & Missing Brief Alerts**: Automated alerts for projects stuck >5 days in the same stage or missing briefs after 2 days.

### 10. Brief Management & Document Versioning
- **Multi-Format Brief Uploads**: Store DOCX, PDF, and client guidelines linked directly to project sales.
- **Version History**: Maintained version history (`v1`, `v2`, `v3`...) with full download access.

### 11. Executive Finance & Profit / Loss Portal (Admin Only)
- **Company Expenses Log**: Track Office Expenses, Rent, Utilities, Software/Subscriptions, Equipment, and Misc.
- **Company Receivings**: Aggregated client payments and installment receipts.
- **Salary Payout Manager**: Basic Salary, configurable Commission %, Bonuses, Deductions, Net Salary, Amount Paid, and Outstanding Salaries.
- **Profit & Loss Engine**: Automatically computes `Receivings − Expenses − Salaries` with monthly/yearly breakdowns.

### 12. Artist Work Assignment Board
- **Artist Tracking**: Displays assigned artists, current project stages, days spent, progress bars, and alert badges.

---

## Role-Based Access Control (RBAC) Matrix

| Feature / Module | Admin / CEO / COO | Team Lead | SDR / Regular Employee |
| :--- | :---: | :---: | :---: |
| **Manage Employees & Salaries** | Full Access | Read-Only | Read Self Only |
| **View Org Chart** | Full Access | Full Access | Full Access |
| **Approve / Reject Requests** | Full Access | Team Members Only | Self Only (Submit) |
| **HRIS Web Attendance** | View All / Manual Override | Team Members Only | Self Only |
| **Sales Sheet & Projects** | View All | Team Sales Only | Self Sales Only |
| **Project Briefs & Versions** | View All | Team Briefs Only | Self Briefs Only |
| **Executive Finance & P&L** | Full Access | No Access | No Access |
| **Campaign & Performance Management** | Full Access | Assigned Campaigns | Self Performance |
| **Manage Commission Slabs** | Full Access | Read-Only | No Access |
| **Award Spiffs** | Full Access | Team Members | No Access |
| **Payroll & Payslip Generation** | Full Access | No Access | View Own Payslip |
| **Audit Logs & System Settings** | Full Access | No Access | No Access |

---

## Database & Supabase Deployment

The system uses **Prisma ORM** & **Supabase PostgreSQL** for type-safe, database-level secured data access.

### Environment Setup (`.env`)
```env
PORT=4000
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?schema=public"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
JWT_SECRET="your_generated_jwt_secret"
COMPANY_NAME="ArtXenith"
```

### Running Migrations & RLS Security
```bash
# Push database schema & RLS policies
npx prisma db push
```

---

## Deploying to Vercel

```bash
# Deploy production build via Vercel CLI
npx vercel --prod
```

---

## License & Support
Built for internal use at **ArtXenith**. All rights reserved.
