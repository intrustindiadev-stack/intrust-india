import { z } from 'zod';

export const CANONICAL_LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity'] as const;

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave',
  unpaid: 'Unpaid Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
};

export const CreateEmployeeSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  phone: z.string().optional().nullable(),
  department: z.enum(['Engineering', 'Sales', 'Operations', 'HR', 'Customer Support', 'Marketing', 'Finance', '']).optional(),
  employee_id: z.string().optional().nullable(),
  joining_date: z.string().optional().nullable(),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  city: z.string().optional().nullable(),
  base_salary: z.coerce.number().nonnegative("Base salary cannot be negative").default(0),
  role: z.enum([
    'employee', 'relationship_exec', 'relationship_manager', 'freelancer',
    'video_editor', 'social_media_manager', 'seo_specialist', 'advertiser',
    'support_agent', 'hr_manager', 'admin', 'super_admin'
  ]),
}).strict();

export const ProcessSalarySchema = z.object({
  employee_id: z.string().uuid("Invalid employee ID"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  base_salary: z.coerce.number().nonnegative(),
  hra: z.coerce.number().nonnegative().default(0),
  allowances: z.coerce.number().nonnegative().default(0),
  deductions: z.coerce.number().nonnegative().default(0),
  net_salary: z.coerce.number().nonnegative(),
});

export const CandidateHireSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID"),
  stage: z.enum(['pending', 'under_review', 'interview_scheduled', 'offer_sent', 'hired', 'rejected']),
  panelAccessGranted: z.string().optional().nullable(),
  offeredSalary: z.coerce.number().optional().nullable(),
  commissionPercent: z.coerce.number().optional().nullable(),
  joiningBonus: z.coerce.number().optional().nullable(),
  offerLetterNotes: z.string().optional().nullable(),
  interviewDate: z.string().optional().nullable(),
  interviewNotes: z.string().optional().nullable(),
  teamId: z.string().uuid().optional().nullable(),
  reportingManagerId: z.string().uuid().optional().nullable(),
  department: z.string().optional().nullable(),
});

export const ClockInSchema = z.object({
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  selfieBase64: z.string().optional().nullable(),
}).strict();

export const ClockOutSchema = z.object({
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
}).strict();

export const LeaveRequestSchema = z.object({
  leave_type: z.string().min(1, "Leave type is required"),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)"),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional().nullable(),
}).strict().refine((data) => data.to_date >= data.from_date, {
  message: "End date must be greater than or equal to start date",
  path: ["to_date"],
});

export const LeaveReviewSchema = z.object({
  action: z.enum(['approved', 'rejected', 'recommend']),
  note: z.string().max(500).optional().nullable(),
}).strict();

export const HRLeaveReviewSchema = z.object({
  action: z.enum(['recommend', 'reject']),
  note: z.string().max(500, "Note must not exceed 500 characters").optional().nullable(),
}).strict().refine(data => data.action !== 'reject' || (data.note && data.note.trim().length > 0), {
  message: "Rejection note is mandatory",
  path: ["note"],
});

export const AdminLeaveReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(500, "Note must not exceed 500 characters").optional().nullable(),
}).strict().refine(data => data.action !== 'reject' || (data.note && data.note.trim().length > 0), {
  message: "Rejection note is mandatory",
  path: ["note"],
});

export const LeaveCancelSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
}).strict();

export const LeavePolicyYearSchema = z.object({
  policy_year: z.coerce.number().int().min(2000).max(2100),
  name: z.string().min(3, "Policy name is required").max(100),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  effective_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
}).strict().refine(data => data.effective_to >= data.effective_from, {
  message: "Effective to date must be greater than or equal to effective from date",
  path: ["effective_to"],
});

export const LeavePolicySchema = z.object({
  policy_year_id: z.string().uuid("Invalid policy year ID"),
  leave_type_key: z.string().min(2).max(50).regex(/^[a-z0-9_]+$/, "Leave type key must be lowercase alphanumeric with underscores"),
  display_name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  annual_entitlement: z.coerce.number().nonnegative("Entitlement cannot be negative"),
  is_paid: z.boolean().default(true),
  is_active: z.boolean().default(true),
  requires_balance: z.boolean().default(true),
  allow_half_day: z.boolean().default(false),
  allow_negative_balance: z.boolean().default(false),
  max_consecutive_days: z.coerce.number().nonnegative().optional().nullable(),
  min_notice_days: z.coerce.number().int().nonnegative().default(0),
  max_carry_forward_days: z.coerce.number().nonnegative().default(0),
  requires_attachment_after_days: z.coerce.number().nonnegative().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
}).strict();

export const AdjustBalanceSchema = z.object({
  delta_days: z.coerce.number().refine(val => val !== 0, "Delta days must be non-zero"),
  reason: z.string().min(3, "Adjustment reason must be at least 3 characters").max(500),
}).strict();

export const AttendanceOverrideSchema = z.object({
  attendance_id: z.string().uuid("Invalid attendance ID"),
  status: z.enum(['present', 'absent', 'late', 'half_day', 'holiday', 'wfh']),
  reason: z.string().min(3, "Override reason must be at least 3 characters").max(500),
}).strict();

export const CreateIndividualIncentiveSchema = z.object({
  recipient_mode: z.literal('individual'),
  employee_id: z.string().uuid("Invalid employee ID"),
  incentive_type: z.enum(['performance_bonus', 'referral_bonus', 'festival_bonus', 'spot_award', 'retention_bonus', 'other']),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(10000000, "Amount exceeds maximum limit"),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  internal_note: z.string().max(500, "Internal note cannot exceed 500 characters").optional().nullable(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD").optional().nullable(),
  payroll_month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  payroll_year: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  idempotency_key: z.string().max(100).optional().nullable(),
}).strict();

export const CreateTeamIncentiveSchema = z.object({
  recipient_mode: z.literal('team'),
  team_id: z.string().uuid("Invalid team ID"),
  allocation_mode: z.enum(['per_person', 'total_pool']),
  incentive_type: z.enum(['performance_bonus', 'referral_bonus', 'festival_bonus', 'spot_award', 'retention_bonus', 'other']),
  amount: z.coerce.number().positive("Amount must be greater than zero").max(10000000, "Amount exceeds maximum limit"),
  include_lead: z.boolean().default(true),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
  internal_note: z.string().max(500, "Internal note cannot exceed 500 characters").optional().nullable(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD").optional().nullable(),
  payroll_month: z.coerce.number().int().min(1).max(12).optional().nullable(),
  payroll_year: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  idempotency_key: z.string().max(100).optional().nullable(),
}).strict();

export const IncentiveTransitionSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel', 'mark_paid', 'reverse']),
  expectedStatus: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'paid', 'reversed']),
  expectedVersion: z.number().int().min(1),
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional().nullable(),
}).strict();

export const IncentiveRecipientQuerySchema = z.object({
  search: z.string().max(100).optional(),
  team_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type ProcessSalaryInput = z.infer<typeof ProcessSalarySchema>;
export type CandidateHireInput = z.infer<typeof CandidateHireSchema>;
export type ClockInInput = z.infer<typeof ClockInSchema>;
export type ClockOutInput = z.infer<typeof ClockOutSchema>;
export type LeaveRequestInput = z.infer<typeof LeaveRequestSchema>;
export type LeaveReviewInput = z.infer<typeof LeaveReviewSchema>;
export type HRLeaveReviewInput = z.infer<typeof HRLeaveReviewSchema>;
export type AdminLeaveReviewInput = z.infer<typeof AdminLeaveReviewSchema>;
export type LeaveCancelInput = z.infer<typeof LeaveCancelSchema>;
export type LeavePolicyYearInput = z.infer<typeof LeavePolicyYearSchema>;
export type LeavePolicyInput = z.infer<typeof LeavePolicySchema>;
export type AdjustBalanceInput = z.infer<typeof AdjustBalanceSchema>;
export type AttendanceOverrideInput = z.infer<typeof AttendanceOverrideSchema>;
export type CreateIndividualIncentiveInput = z.infer<typeof CreateIndividualIncentiveSchema>;
export type CreateTeamIncentiveInput = z.infer<typeof CreateTeamIncentiveSchema>;
export type IncentiveTransitionInput = z.infer<typeof IncentiveTransitionSchema>;
export type IncentiveRecipientQueryInput = z.infer<typeof IncentiveRecipientQuerySchema>;
