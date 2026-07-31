## 1. Supabase Data Integration

- [x] 1.1 Update `app/(employee)/employee/page.jsx` to fetch `leave_balances` and `holidays` from Supabase instead of using hardcoded variables.
- [x] 1.2 Update the dashboard metrics to calculate remaining leaves based on real `leave_balances` data.

## 2. Shift Validation Logic

- [ ] 2.1 In `app/(employee)/employee/attendance/page.jsx`, modify the fetch query to pull the single most recent attendance record regardless of date.
- [ ] 2.2 Add conditional logic to check if the most recent record has a null `check_out` and a date prior to `today`.
- [ ] 2.3 Implement a UI modal or alert that blocks the user from clocking in today until they manually check out of their previous shift.

## 3. UI/UX Refactoring

- [ ] 3.1 Redesign the Clock-In Widget in `app/(employee)/employee/page.jsx` and `app/(employee)/employee/attendance/page.jsx` to use a clean white background, monospace fonts, and a sleek button layout.
- [ ] 3.2 Refactor the Quick Stats Sidebar (Leave Balance, Team Tasks) into minimal, professional metric cards with subtle borders and shadows.
- [ ] 3.3 Replace the Attendance Log list view in `app/(employee)/employee/attendance/page.jsx` with a structured HTML `<table>` layout containing First In, Last Out, Total Hours, and semantic Status Badges.
