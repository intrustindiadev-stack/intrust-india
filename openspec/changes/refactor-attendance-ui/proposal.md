## Why

The current Employee Attendance panel uses an unpolished, AI-generated boilerplate aesthetic with massive solid-color neon blocks and hardcoded dummy data for leaves and holidays. Furthermore, the clock-in/out logic contains bugs where shifts can remain "ongoing" for multiple days if an employee forgets to clock out. We need to refactor this to look like a premium, modern HRMS platform (e.g., Gusto, Rippling, Linear) and fetch real data from Supabase, while fixing the multi-day shift bug.

## What Changes

- Strip out hardcoded dummy data for holidays, leaves, and attendance stats.
- Implement data fetching logic to pull real data from Supabase tables (`attendance`, `leaves_balances`, `holidays`).
- Fix the clock-in validation bug by detecting open shifts from previous days and prompting users or auto-clocking them out.
- Refactor the Clock-In Widget into a sleek, compact "Time Clock" card with clear states and a monospace font.
- Redesign the Stat Cards into professional, minimal metric cards using standard enterprise UI practices (white/gray backgrounds, subtle borders, muted text).
- Upgrade the Attendance Log into a proper data table with Date, First In, Last Out, Total Hours, and Status Badges.

## Capabilities

### New Capabilities
- `attendance-validation`: The logic for handling multi-day shifts and auto-checkouts.

### Modified Capabilities
- `attendance`: Modifying the requirements to dynamically fetch leave balances and holidays instead of using hardcoded values, and revamping the UI components.

## Impact

- `app/(employee)/employee/page.jsx`
- `app/(employee)/employee/attendance/page.jsx`
- Data fetching logic relying on Supabase.
