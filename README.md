# ArtXenith Enterprise HRIS & Operations Platform

**ArtXenith HRIS** is an enterprise-grade, full-stack Human Resource Information System and digital art agency operations management suite custom-tailored for **ArtXenith**. It manages employee lifecycles, team hierarchies, interactive 18-column sales sheets, multi-stage artwork brief assignments, installment tracking, real-time multi-tab pop-up notification engines, attendance penalties, float advances, and automated monthly payroll.

---

## 🎨 Xenith Brand Design Identity

The platform strictly adheres to the official **Xenith Logo & Palette Guidelines**:

- **Core Identity Colors**:
  - **Black** (`#000000`, `#090909`, `#111111`, `#171717`)
  - **White** (`#FFFFFF`, `#F4F4F0`)
  - **Electric Lime** (`#D7F000`) — Primary Identity & Highlight Accent
  - **Lemon Green** (`#E8F52A`, `#F0FF3D`) — Secondary Highlight Accent
- **Protected Contrast**: All logo renders sit inside solid black capsule backdrops (`.xenith-logo-container`) to eliminate background blending in both Light and Dark modes.

---

## 🏢 Organizational Structure & Team Leadership

### 1. Executive Leadership
- **Muhammad Ahsan**: **CEO & Founder** (`ahsankhanzada1122@gmail.com`)
  - Oversees company-wide performance, master sales sheets, artist allocations, float/advance approvals, and executive P&L.
- **Subu Ahad**: **Admin & Sales Team Lead** (`subuahad1@gmail.com`)
  - Manages **Team Subu**, admin system configuration, team sales, and project brief submissions.
- **Anas Ahmed**: **Sales Team Lead** (`anasahmyd16@gmail.com`)
  - Manages **Team Anas**, team sales, attendance verification, and brief submissions.

### 2. Active Sales Teams

| Team Name | Team Leader | Assigned Sales Executives & Staff |
| :--- | :--- | :--- |
| **Team Subu** | **Subu Ahad** | Adeen Afzal, Usama Riyaz, Muhammad Umar, Taha Asrar |
| **Team Anas** | **Anas Ahmed** | Ahmed Ali, Muhammad Safiullah Khan, Muhammad Visam Khan |

---

## ⚡ Core Operational Rules & Workflows

### 1. 📅 5th-to-5th Billing & Financial Settlement Cycle
- Financial calculations, monthly sales sheet totals, remaining installment collections, and artist salary payouts run strictly from the **5th of previous month to 5th of current month** (e.g., Aug 5th to Sept 5th).

### 2. ⏰ 18:20 PKT Shift Timing & Attendance Rules
- **Shift Start**: 18:00 PKT (6:00 PM PKT).
- **Grace Period**: **20 minutes grace time** (Late threshold at **18:20 PKT**).
- **Adeen Afzal Override**: 45 minutes grace time (Late threshold at **18:45 PKT**).
- **Deduction Formula**: Calculated over a 26-working-day base (`30 days − 4 Sundays`). **2 late check-ins = 1 day absence penalty** (`(Base Salary / 26) * Days Worked`).
- **Artist Exemption**: Artists (Designers) are exempt from daily shift clock-in penalties (`attendanceExempt = true`).

### 3. 📊 18-Column Interactive Sales Sheet & Sub-Sheet Installments
- **Spreadsheet Interface** ([SalesSheet.jsx](file:///c:/Users/nasir/Desktop/artxenith/frontend/src/pages/SalesSheet.jsx)): Custom monthly & yearly filterable sales sheet.
- **Installment Sub-Sheet Drawer**: When a sale is marked with installments, a sub-drawer opens tracking payment dates, gross amounts, fee deductions, and net PKR.
- **Remaining Payments Ledger**: Installments collected in subsequent billing months count under **Remaining Payments** without duplicating the base sales count.

### 4. 🎨 4-Stage Artwork Progression & 5-Day SLA Alert Triggers
- **Stage Progression**: `Initial Sketch` → `Line Art` → `Base Color` → `Final Artwork`.
- **5-Day SLA Alerts**: Automated alerts and warning triggers if a project sits in a stage for more than 5 days without artwork updates.
- **Scoped Artwork Visibility**: Team Leads can **ONLY view artwork updates for projects belonging to their team** (`Team Subu` vs `Team Anas`).

### 5. 🔔 Real-Time Multi-Tab & Desktop OS Pop-Up Notification Engine
- **In-App Pop-Up Toasts**: Styled in solid **Black + Electric Lime (`#D7F000`)** with direct action links.
- **Desktop OS Pop-Ups**: Triggers native OS notifications (`Notification.requestPermission()`) when the user is on **another tab, another window, or has the browser minimized**.
- **Web Audio Chime**: Synthesizes a crisp modern audio chime (`playNotificationChime()`) on every incoming alert.
- **10-Second High-Frequency Engine**: Polls every 10 seconds across all user roles.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Feature / Module | CEO (Muhammad Ahsan) | Admin / TL (Subu Ahad) | Team Lead (Anas Ahmed) | Sales Executives | Artists (Designers) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Global Operations & P&L** | Full Access | Full Access | No Access | No Access | No Access |
| **Manage Employee Accounts** | Full Access | Full Access | Read Team Only | Read Self Only | Read Self Only |
| **Sales Sheet & Installments** | All Teams | Team Subu & All | Team Anas | Self Sales Only | Read Assigned |
| **Project Brief Uploads** | Full Access | Full Access | Full Access | Create / Submit | Read Assigned |
| **Brief Assignment to Artists** | Full Access | Full Access | Read Only | No Access | Read Assigned |
| **Artwork Stage Updates** | View & Download | Team Subu Projects | Team Anas Projects | Track Owned | Upload & Update |
| **Artist Credentials Directory** | Full Access | Full Access | Read Only | No Access | Self Credentials |
| **Attendance & Check-In** | View All | View Team Subu | View Team Anas | Self Only | Attendance Exempt |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, TailwindCSS (v4 @theme system), Framer Motion, Lucide Icons, Recharts, React-Hot-Toast.
- **Backend**: Node.js 22+, Express.js, Prisma ORM (v5.22), Supabase PostgreSQL.
- **Authentication**: JWT Bearer Tokens, Bcryptjs, Role-Based Access Control (RBAC).

---

## 🚀 Local Development Setup

```bash
# 1. Install Backend Dependencies
cd backend
npm install

# 2. Run Database Migrations & Seed Team Hierarchy
npx prisma db push
node prisma/seedEmployees.js

# 3. Start Backend Development Server
npm run dev

# 4. In a new terminal, start Frontend Development Server
cd ../frontend
npm install
npm run dev
```

---

## 📜 License & Operations Notice

Built specifically for internal enterprise operations at **ArtXenith**. All rights reserved.
