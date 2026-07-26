## Why

The HRM (Human Resource Management) panel has identified critical security vulnerabilities (RLS role inconsistencies), data integrity risks (unvalidated employee additions, negative salary calculations, invalid leave date math), and missing test coverage before manual testing. Addressing these issues now ensures robust access control, prevents silent data corruption, and provides an actionable testing guide for verification.

## What Changes

- **RLS Policy Synchronization**: Align `user_profiles` RLS policies so `'hr'`, `'hr_manager'`, `'admin'`, and `'super_admin'` have uniform read/update access to employee profiles.
- **Employee Onboarding Validation**: Add strict client-side email format and phone number validation, salary non-negativity checks, and clean duplicate email constraint handling in `AddEmployeeDrawer`.
- **Payroll & Salary Safeguards**: Enforce non-negative net salary calculations in `ProcessModal` and protect payslip PDF generation against null/invalid input values.
- **Leave & Attendance Calculations**: Fix leave day duration calculation edge cases for invalid date inputs and handle night-shift clock-in/out transitions safely.
- **Audit Log Resilience**: Handle background audit log execution errors safely without silent drops.
- **Comprehensive Testing Guide**: Provide a structured end-to-end testing suite and manual testing plan covering auth bypass, onboarding validation, attendance overrides, leave workflows, and payroll generation.

## Capabilities

### New Capabilities
- `hrm-security-and-testing`: Covers unified RLS authorization policies, input validation guards for core HR operations, payroll safeguards, and comprehensive testing procedures for the HRM panel.

### Modified Capabilities
<!-- None -->

## Impact

- **Affected Code**: `app/(hrm)/hrm/employees/page.jsx`, `app/(hrm)/hrm/salary/page.jsx`, `app/(hrm)/hrm/leaves/page.jsx`, `app/(hrm)/hrm/attendance/page.jsx`, `supabase/migrations/`
- **APIs & DB**: `user_profiles`, `salary_records`, `leave_requests`, `attendance`, `audit_logs_hrm` RLS policies and table constraints.
