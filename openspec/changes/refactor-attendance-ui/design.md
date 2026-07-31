## Context

The current `Employee Attendance` module (both the employee dashboard and HRM log) uses hardcoded UI layouts and dummy metrics for leaves. The interface lacks an enterprise look, and the shift tracking logic fails to handle edge cases like when an employee forgets to clock out the previous day, resulting in infinite "ongoing" shifts.

## Goals / Non-Goals

**Goals:**
- Dynamically fetch leave balances, holidays, and attendance records from Supabase tables (`leave_balances`, `holidays`, `attendance`).
- Revamp the UI using standard enterprise Tailwind patterns (minimal shadows, muted borders, clean typography).
- Resolve the multi-day shift bug through a lazy-checkout validation check upon loading the attendance page.

**Non-Goals:**
- Completely rewriting the backend Supabase tables (we assume tables like `holidays` and `leave_balances` exist or can be quickly mocked without altering the entire database schema drastically).
- Adding complex timesheet approval workflows (only standard clock in/out tracking is in scope).

## Decisions

1. **Shift Validation (Multi-day Bug):**
   - *Decision:* Implement a lazy validation check on page load.
   - *Rationale:* Instead of using a server cron job which adds infrastructure complexity, the Next.js client/server component will fetch the *most recent* attendance record for the user. If `check_out` is null and `date !== today`, the UI will prompt the user to enter a manual checkout time for the previous shift before unlocking today's clock-in button.
   - *Alternative:* Auto-clocking out at 11:59 PM. However, this loses accurate data about when the employee actually left.

2. **Enterprise UI System:**
   - *Decision:* Replace all `bg-gradient-to-r` styles with `bg-white border-gray-200 shadow-sm`. Replace massive icons with Lucide icons sized at 16px to 20px. Use `font-mono` for live clocks.
   - *Rationale:* Aligns with products like Gusto and Linear. Reduces cognitive load and looks more professional.

## Risks / Trade-offs

- **Risk:** Existing employees may have pending shifts right now. If we deploy the validation prompt, they will immediately be blocked from clocking in until they resolve past shifts.
  - *Mitigation:* The prompt will be clear and allow a quick 1-click override ("Auto-checkout at 6:00 PM yesterday") to reduce friction.
- **Risk:** Missing tables (`leave_balances`, `holidays`) in Supabase.
  - *Mitigation:* We will verify table structures and provide the required `.sql` migration files if they do not exist.
