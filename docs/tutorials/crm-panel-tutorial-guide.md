# CRM Panel & Sales Command Center — Video Tutorial & Training Script

This comprehensive script is structured as an end-to-end video tutorial or guided walkthrough for onboarding Sales Executives and Sales Managers to the InTrust India CRM Panel. 

---

## 📋 Tutorial Metadata

| Attribute | Details |
| :--- | :--- |
| **Module** | Customer Relationship Management (`/crm`) |
| **Target Audience** | Sales Executives, Sales Managers, Admin & Super Admin |
| **Estimated Duration** | 8 – 10 Minutes |
| **Prerequisites** | Active Supabase user account with `sales_exec` or `sales_manager` role |
| **Key Features Covered** | Role-Based Dashboard, Revenue Funnel, Kanban Pipeline, Lead Management, Team Tasks |

---

## 🎬 Part 1: Introduction & Welcome Celebration
**Timecode: 00:00 - 01:15**

### 🖥️ Screen Action / Visual
- Start on the login screen, then transition directly into the CRM dashboard route: `/crm`.
- Highlight the **InTrust Logo** and the top header text: *"Sales Command Center"* (for managers) or *"My Sales Dashboard"* (for executives).
- Show the **Welcome Role Celebration Modal** popping up for first-time users, celebrating their new role assignment.

### 🎙️ Voiceover Narration
> *"Welcome to the InTrust India CRM Panel — your modern, real-time Sales Command Center. Whether you are a Sales Executive tracking your active daily pipeline or a Sales Manager forecasting revenue for the entire team, this platform gives you full visibility over every deal and interaction."*
>
> *"When you sign in for the first time, our specialized role greeting activates, instantly tailoring your dashboard to your exact permissions and responsibilities. Let’s dive into how to navigate and dominate your sales targets!"*

---

## 📊 Part 2: High-Velocity KPI Cards & Live Metric Tracking
**Timecode: 01:15 - 03:00**

### 🖥️ Screen Action / Visual
- Hover over the top 4 animated KPI Stat Cards:
  1. **Pipeline Value** (formatted in INR, e.g., `₹2,45,000` with growth trend badge).
  2. **Active Pipeline** (showing count of ongoing deals).
  3. **Conversion Rate** (percentage of won deals vs. total leads).
  4. **Follow-ups** (clock icon highlighting urgent pending calls/emails).
- Show the subtle background glow and Framer Motion hover animations.

### 🎙️ Voiceover Narration
> *"At the very top of your Command Center sits your high-velocity KPI summary. Powered by live database subscriptions, these figures update instantly the moment a lead progresses or a new deal value is assigned."*
>
> *"Your **Pipeline Value** calculates expected total revenue in real-time, while the **Active Pipeline** counter shows your ongoing deals currently in the Contacted, Qualified, and Proposal stages. Pay close attention to your **Conversion Rate** and **Follow-ups** counter — your roadmap to hitting quarterly bonuses!"*

> [!TIP]
> **Pro-Tip for Trainers:** Emphasize that all numbers are automatically scoped! Executives only see numbers for leads directly assigned to them, while managers view aggregate stats across the entire organization.

---

## 📈 Part 3: Pipeline Funnel & Stage Progression
**Timecode: 03:00 - 04:30**

### 🖥️ Screen Action / Visual
- Scroll down slightly to focus on the **Pipeline Funnel Chart** on the left.
- Hover over each bar in the Recharts BarChart: `New`, `Contacted`, `Qualified`, `Proposal`, and `Won` (displayed in vibrant emerald green).
- Click on **"Kanban Pipeline"** from the Quick Navigation box or visit `/crm/pipeline`.

### 🎙️ Voiceover Narration
> *"Our visual **Pipeline Funnel Chart** maps lead progression from initial inquiry to closed revenue. Every bar represents healthy momentum in your deal flow."*
>
> *"To move deals across these stages, jump straight into the **Kanban Pipeline**. Here, you can intuitively drag and drop deal cards as conversations evolve—from 'Contacted' to 'Qualified', setting proposal meetings, and ultimately celebrating when you drag a deal into the 'Won' column!"*

---

## 👥 Part 4: Lead Directory & Manager Team Pool
**Timecode: 04:30 - 06:30**

### 🖥️ Screen Action / Visual
- Navigate to `/crm/leads` or look at the **Recent Leads** widget on the dashboard.
- Show an individual lead row highlighting: Avatar monogram, Lead Title/Contact Name, Phone number, Deal Value in INR, and color-coded Status Badges (`bg-blue-500` for new, `bg-emerald-500` for won, etc.).
- **For Manager Demo:** Focus on the right sidebar's **Team Overview** box. Show the amber Alert Triangle badge: *"Action Required: X leads in the pool waiting to be assigned to executives."* Click the **Assign Leads** button.

### 🎙️ Voiceover Narration
> *"Need deep insights on a specific prospect? The **Lead Directory** displays all critical lead metrics at a glance, including phone contacts, expected revenue, and stage status."*
>
> *"For Sales Managers, keep a vigilant eye on the **Team Overview** widget on the right sidebar. If unassigned leads drop into the pool from web campaigns or customer signups, an alert badge will notify you instantly. With just one click on 'Assign Leads', you can distribute fresh prospects to your executives to ensure immediate follow-up and maximum conversion."*

> [!IMPORTANT]
> **Manager Alert:** Unassigned leads do not show up on executive dashboards until a Sales Manager or Admin directly assigns them to an executive's account!

---

## 📅 Part 5: Actionable Tasks & Daily Workflow
**Timecode: 06:30 - 08:00**

### 🖥️ Screen Action / Visual
- Highlight the **Upcoming Tasks / Team Tasks** widget on the right sidebar.
- Show due dates with calendar and clock icons.
- Demonstrate adding a new lead via the blue **"+ New Lead"** button at the top right of the dashboard.

### 🎙️ Voiceover Narration
> *"Never miss a client call or proposal deadline with the built-in **Actionable Tasks Widget**. Sorted chronologically by urgency, your upcoming follow-ups are always front and center."*
>
> *"Ready to bring in fresh opportunities? Simply hit the **+ New Lead** button in the header at any time to enter prospect details, assign anticipated deal values, and set follow-up tasks."*
>
> *"Thank you for joining this InTrust India CRM walkthrough. Stay proactive, keep your pipelines updated, and let’s close more deals together!"*

---

## 🛠️ Summary Checklist for Live Demonstrations
- [ ] Verify test session is using a user with `sales_manager` role to demonstrate both Executive & Manager features.
- [ ] Create at least 2 test leads in the `new` and `proposal` state before starting recording.
- [ ] Have at least 1 unassigned lead in the database to trigger the orange **"Action Required"** manager badge.
- [ ] Show switching between dark mode and light mode to demonstrate the sleek UI.
