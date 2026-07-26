## 1. Database & Security Hardening

- [x] 1.1 Create migration `supabase/migrations/20260722_fix_hrm_rls_role_consistency.sql` to harmonize `user_profiles` RLS policy role checks for `'hr'`, `'hr_manager'`, `'admin'`, and `'super_admin'`.
- [x] 1.2 Validate database RLS policies against unauthorized role access.

## 2. Frontend Validation & Component Defensive Guards

- [x] 2.1 Update `app/(hrm)/hrm/employees/page.jsx` `AddEmployeeDrawer` with email regex, phone length check, salary non-negativity guard, and unique email duplicate key handling (`23505`).
- [x] 2.2 Update `app/(hrm)/hrm/salary/page.jsx` `ProcessModal` to enforce non-negative net salary (`Math.max(0, ...)`).
- [x] 2.3 Update `app/(hrm)/hrm/leaves/page.jsx` `ReviewModal` and day counter to handle invalid date strings gracefully without outputting `NaN`.
- [x] 2.4 Update `app/(hrm)/hrm/attendance/page.jsx` duration formatting function to handle missing check-out and date edge cases cleanly.

## 3. Testing Guide & Verification Suite Execution

- [x] 3.1 Execute Manual Test 1: Verify Auth Bypass / Role Redirection (`/hrm` route protection).
- [x] 3.2 Execute Manual Test 2: Verify Employee Onboarding Validation (Invalid Email, Negative Salary, Duplicate Email).
- [x] 3.3 Execute Manual Test 3: Verify Attendance Log Overrides & `audit_logs_hrm` Record Generation.
- [x] 3.4 Execute Manual Test 4: Verify Leave Queue Approvals & Rejections.
- [x] 3.5 Execute Manual Test 5: Verify Payroll Calculation & Payslip PDF Download.
