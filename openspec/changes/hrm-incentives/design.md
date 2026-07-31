## Context

The HRM system lacks a dedicated way to award and track financial bonuses/incentives for employees. We need to introduce an end-to-end mechanism combining a backend data store and a premium UI dashboard component for HR managers.

## Goals / Non-Goals

**Goals:**
- Create a scalable `incentives` schema in Supabase.
- Build an enterprise-grade UI using Next.js and Tailwind CSS (with clean styling, shadows, and subtle colors).
- Ensure the UI allows HR managers to award new incentives and view a history of all past awards.
- Fetch data dynamically via Next.js API or Server Actions.

**Non-Goals:**
- Implementing the payout process or integration with third-party payroll software.
- Elaborate complex multi-step approval workflows for bonuses (a simple 'Status' is enough for now).

## Decisions

- **Database Design**: We will add an `incentives` table with:
  - `id` (UUID, primary key)
  - `employee_id` (UUID, references `employees.id` or `users.id`)
  - `amount` (Numeric/Decimal)
  - `type` (Text: 'Performance Bonus', 'Referral', 'Festival Bonus', 'Other')
  - `description` (Text)
  - `date_awarded` (Timestamp)
  - `status` (Text: 'Pending', 'Approved', 'Paid')
- **UI Design System**: We will use enterprise UI aesthetics (Tailwind): white background, gray borders, elevated shadows, subtle badges (e.g., `bg-green-50 text-green-700` for Paid).
- **Data Fetching**: We will use Server Components or React Query to ensure robust data loading and updates.

## Risks / Trade-offs

- **Risk: Type Safety in Enums**: Using Postgres Enums can be tricky to migrate later. 
  - **Mitigation**: We will use a standard `text` field with constraint-level validation.
