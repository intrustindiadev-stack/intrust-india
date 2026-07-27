# HRM Panel & Personnel Command — Video Tutorial & Training Script

This document serves as an official training script and walkthrough guide for creating video tutorials, live demos, or onboarding manuals for HR Managers, Administrators, and Leadership navigating the InTrust India HRM Panel.

---

## 📋 Tutorial Metadata

| Attribute | Details |
| :--- | :--- |
| **Module** | Human Resource Management (`/hrm`) |
| **Target Audience** | HR Managers, Operations Leads, Administrators & Super Admins |
| **Estimated Duration** | 9 – 12 Minutes |
| **Prerequisites** | Supabase auth account with `hr_manager`, `admin`, or `super_admin` role |
| **Key Modules Covered** | Personnel Command Hub, Live Ops Feed, Leave Approval Queue, Recruitment & Upskilling Portal, Audit Logs |

---

## 🎬 Part 1: Welcome to Personnel Command
**Timecode: 00:00 - 01:30**

### 🖥️ Screen Action / Visual
- Start on the home portal or login screen, navigating directly to `/hrm`.
- Highlight the vibrant top header: **Personnel Command** with the green **"HR Hub"** pill badge and current month/year display.
- Show the action bar on the top right containing the **Download Report** icon and the prominent black/white **" + New Hire "** button.

### 🎙️ Voiceover Narration
> *"Welcome to InTrust India’s HRM Panel — your centralized **Personnel Command** hub designed for seamless workforce governance, talent acquisition, and operational oversight."*
>
> *"Engineered with real-time feedback and glassmorphic UI aesthetics, this dashboard unites employee attendance, recruitment pipelines, upskilling modules, and instant leave approvals into one command station. Let's take a comprehensive tour of how HR Managers can leverage these powerful tools."*

---

## 📊 Part 2: Real-Time Workforce Telemetry & Stat Cards
**Timecode: 01:30 - 03:15**

### 🖥️ Screen Action / Visual
- Hover over the 4 primary animated Stat Cards in the top grid:
  1. **Total Force** (Blue badge: showing total active employees across roles).
  2. **Attendance** (Emerald badge: showing employees clocked in today, e.g., `98%` trend).
  3. **Pending Leaves** (Amber badge: immediate action required counter).
  4. **New Leads / Talent Pipeline** (Violet badge: recent career applications received).
- Note the clean typography and responsive sub-labels.

### 🎙️ Voiceover Narration
> *"Your dashboard immediately gives you real-time telemetry over your organization. Your **Total Force** displays all active personnel spanning staff, sales executives, and managers."*
>
> *"Right beside it, **Attendance** verifies how many employees have successfully clocked in today. Keep an eye on your **Pending Leaves** counter in amber—this flags immediate employee requests awaiting your approval, while **New Leads** alerts you to incoming job applications in your talent acquisition pipeline."*

> [!NOTE]
> **System Insight:** Attendance statistics automatically reset daily at midnight and sync with real-time employee check-in/check-out events in the `attendance` database table.

---

## ⚡ Part 3: One-Click Leave Approvals & Automatic Audit Logging
**Timecode: 03:15 - 06:00**

### 🖥️ Screen Action / Visual
- Focus on the **Leave Approvals** queue located on the left section of the dashboard.
- Show an employee leave row: Employee avatar/initials, Full Name, Leave Type (e.g., `Sick Leave`, `Casual Leave`), and dates.
- Hover over a row to reveal the animated action buttons: **Approve** (green) and **Reject** (rose/red).
- Click **Approve**. Show the instant toast notification: *"Leave approved successfully"*, and show the record smoothly animating out of the pending queue.
- Explain or briefly link to `/hrm/audit` to show the system generated audit trail.

### 🎙️ Voiceover Narration
> *"One of the busiest daily tasks for HR is managing leave requests. In our **Leave Approvals** queue, pending requests are displayed clearly with employee details, leave types, and date ranges."*
>
> *"We’ve streamlined this workflow: simply hover over any request to reveal swift **Approve** or **Reject** action buttons. With a single click, the system updates the employee's status instantly, sends them a status update, and dynamically decrements your pending workload."*
>
> *"Best of all, behind the scenes, every single leave decision automatically fires a tamper-proof event into our specialized HR Audit Log—recording the decision maker, timestamp, and severity to ensure 100% compliance and transparency."*

> [!IMPORTANT]
> **Audit Compliance:** Every action taken in the HRM dashboard (leave approvals, recruitment status updates, payroll changes) is permanently written to `audit_logs_hrm` for regulatory auditing.

---

## 🚀 Part 4: Talent Acquisition Pipeline & Upskilling Portal
**Timecode: 06:00 - 08:30**

### 🖥️ Screen Action / Visual
- Show the two large graphical promotional banners below the leave queue:
  1. **Talent Acquisition (Pipeline)**: Dark gradient banner with active application count badge. Click through to `/hrm/recruitment`.
  2. **Upskilling Portal (Growth)**: Emerald green gradient banner featuring a 4.8 Star rating badge. Click through to `/hrm/training`.
- Show how navigating to `/hrm/jobs` or `/hrm/recruitment` lets HR manage incoming job applications.
- Click the top **"+ New Hire"** button to show how onboarding a new employee is initiated.

### 🎙️ Voiceover Narration
> *"Growth and learning are at the heart of InTrust India. Just below your action queue, you’ll find dedicated access portals for two vital pillars: **Talent Acquisition** and our **Upskilling Portal**."*
>
> *"Clicking into Talent Acquisition launches our recruitment management interface, where you can review applicant profiles, schedule interviews, and track candidates from application to job offer. Meanwhile, the **Upskilling Portal** enables you to assign internal training programs, evaluate course completions, and foster continuous professional development across your teams."*

---

## 📡 Part 5: Live Ops Feed & Full System Audit Logs
**Timecode: 08:30 - 10:30**

### 🖥️ Screen Action / Visual
- Move focus to the right sidebar: **Live Ops (Real-time Activity)**.
- Highlight the vertical timeline containing glowing status indicators (amber for pending applications, emerald for approved/active actions) and timestamps.
- Click the **"Full Audit Logs"** button at the bottom of the sidebar (`/hrm/audit`).
- Highlight additional HR navigation capabilities: `/hrm/employees` (employee registry), `/hrm/attendance` (attendance sheets), and `/hrm/salary` (payroll & compensation).

### 🎙️ Voiceover Narration
> *"Finally, stay connected to the heartbeat of your enterprise with the **Live Ops Feed** on the right sidebar. This real-time activity ticker displays live events as they happen—whether a candidate submits a fresh application or an employee updates their profile."*
>
> *"For comprehensive administrative governance, clicking **Full Audit Logs** opens a granular historical archive of every administrative action taken across the entire HR ecosystem."*
>
> *"From payroll management to daily attendance sheets, InTrust India’s Personnel Command provides everything you need to build and manage an elite organization. Thank you for watching!"*

---

## 🛠️ Demonstration Preparation Checklist
- [ ] Ensure the logged-in demo user has `hr_manager` or `admin` permissions in `user_profiles`.
- [ ] Insert at least 2 sample records into `leave_requests` with `status = 'pending'` to showcase live approvals.
- [ ] Have sample career applications in `career_applications` so the **Live Ops Feed** displays active timeline items.
- [ ] Confirm that sound and high-resolution screen capturing (1080p or 4K) are enabled for capturing micro-animations.
