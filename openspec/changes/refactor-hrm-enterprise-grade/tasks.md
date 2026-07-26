## 1. Enterprise Security & Database Encryption

- [x] 1.1 Create migration `supabase/migrations/20260723_enterprise_hrm_security_mfa_pii.sql` to enable `pgcrypto`, define PII encryption functions, and update RLS with `aal2` MFA enforcement.
- [x] 1.2 Add composite indexes for attendance (`idx_attendance_date_status_checkin`), salary (`idx_salary_records_employee_period`), and career applications (`idx_career_apps_status_created`).

## 2. API Validation & Rate Limiting

- [x] 2.1 Create `lib/hrm/validation.ts` with Zod validation schemas for `CreateEmployeeSchema`, `ProcessSalarySchema`, `LeaveRequestSchema`, and `CandidateHireSchema`.
- [x] 2.2 Create `lib/hrm/rateLimiter.ts` for sliding window rate limiting on API routes.
- [x] 2.3 Refactor `app/api/hrm/hire-candidate/route.js` to use Zod parsing and rate limiting.

## 3. RSC Fetching & Optimistic UI

- [x] 3.1 Create `types/hrm.ts` with strict TypeScript types for employees, attendance, leaves, and salary.
- [x] 3.2 Refactor `/hrm` Dashboard into React Server Component with parallel `Promise.all` fetching and Suspense skeletons.
- [x] 3.3 Implement `useOptimistic` hook in `LeaveApprovalList` and `AttendanceLog` components.
