## Why

The client has requested a new "Incentives & Bonuses" feature to be added to the HRM (Human Resource Management) panel. This will allow HR managers to systematically track, award, and manage bonuses and incentives for employees in a centralized and premium interface.

## What Changes

- Create a new `incentives` table in Supabase to track all incentive/bonus records.
- Add a new Next.js page at `/hrm/incentives` (or similar) for the HRM panel.
- Implement an "Award Incentive" form/modal for HR managers to grant bonuses.
- Implement a data table displaying the history of awarded incentives, with columns for Employee Name, Type, Amount, Date, and a Status Badge.
- Enhance UI with premium enterprise-grade styling (Tailwind CSS, clean typography, elevated shadows, and no heavily saturated background colors).
- Ensure server-side data fetching or React Query is used to pull the incentive records dynamically.

## Capabilities

### New Capabilities
- `hrm-incentives`: Ability for HR managers to award, track, and manage employee incentives and bonuses.

### Modified Capabilities

## Impact

- **Database**: Adds a new `incentives` table in Supabase with foreign key relation to the users/employees table.
- **Frontend**: Adds new UI components for awarding incentives and viewing historical records within the HRM dashboard.
- **API**: Requires data fetching logic (React Query or Server Actions) to fetch, create, and list incentives.
