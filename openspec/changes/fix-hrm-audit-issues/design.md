## Context

During the pre-testing audit of the HRM panel, several critical vulnerabilities and edge cases were identified:
1. RLS policy inconsistency between `20260425_hrm_schema_and_rls.sql` (which allows `'hr'`) and `20260509_hr_manager_user_profiles_rls.sql` (which excludes `'hr'`).
2. Client-side form submission flaws in `AddEmployeeDrawer` (`employees/page.jsx`), `ProcessModal` (`salary/page.jsx`), and `ReviewModal` (`leaves/page.jsx`).
3. Date calculation edge cases resulting in `NaN` or invalid durations.
4. Lack of a systematic end-to-end testing matrix for manual QA.

## Goals / Non-Goals

**Goals:**
- Harmonize Supabase RLS policies across all HRM tables for uniform role checks.
- Add client-side input validation and error handling across HRM drawer/modal components.
- Safeguard salary net pay and leave day calculations against invalid or negative numbers.
- Provide a clear, actionable testing guide and plan for developer verification.

**Non-Goals:**
- Creating new HRM features or adding new UI pages outside the existing panel scope.
- Refactoring legacy DB tables (`employees`, `attendance_logs`, `leave_balances`) which are slated for future cleanup.

## Decisions

### 1. SQL Migration for Role Alignment
- **Decision**: Deploy a single migration `20260722_fix_hrm_rls_role_consistency.sql` updating `user_profiles` policies to explicitly include `'hr'`, `'hr_manager'`, `'admin'`, and `'super_admin'`.
- **Alternatives Considered**: Modifying existing historical migration files (rejected to maintain migration idempotency and history integrity).

### 2. Client-Side Defensive Guards
- **Decision**: Perform validation before Supabase network requests in React components (`AddEmployeeDrawer`, `ProcessModal`).
- **Rationale**: Prevents unhelpful Postgres database error messages from displaying to the user and avoids invalid state mutation.

### 3. Structured Testing Matrix
- **Decision**: Create a dedicated manual test plan embedded in the proposal change tasks for verification.

## Risks / Trade-offs

- **[Risk]**: Database unique constraint error (`code 23505`) on email during employee creation if email already exists in `user_profiles`.
  - **Mitigation**: Catch error code `23505` explicitly and present a friendly toast message: `"An account with this email already exists."`
- **[Risk]**: Overriding RLS policies might expose restricted user profiles if role checks are too broad.
  - **Mitigation**: Strictly limit RLS policy check to `role IN ('hr', 'hr_manager', 'admin', 'super_admin')`.
