export type HRMRole =
  | 'employee'
  | 'relationship_exec'
  | 'relationship_manager'
  | 'freelancer'
  | 'video_editor'
  | 'social_media_manager'
  | 'seo_specialist'
  | 'advertiser'
  | 'support_agent'
  | 'hr_manager'
  | 'admin'
  | 'super_admin';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid' | 'maternity' | 'paternity';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'half_day'
  | 'holiday'
  | 'wfh';

export interface EmployeeProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  employee_id?: string | null;
  joining_date?: string | null;
  employment_type: EmploymentType;
  city?: string | null;
  base_salary: number;
  role: HRMRole;
  avatar_url?: string | null;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  work_date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
  override_by?: string | null;
  override_reason?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  is_onsite?: boolean | null;
  check_in_location_status?: string | null;
  check_out_location_status?: string | null;
  closure_source?: 'employee' | 'hr' | 'automatic' | null;
  closure_reason?: string | null;
  needs_review?: boolean | null;
  version?: number;
  created_at?: string;
  updated_at?: string;
  user_profiles?: Partial<EmployeeProfile>;
}

export interface LeaveRequestRecord {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason?: string | null;
  status: LeaveStatus;
  requested_days?: number | null;
  chargeable_days?: number | null;
  calendar_breakdown?: LeaveBreakdown | null;
  policy_year?: number | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  user_profiles?: Partial<EmployeeProfile>;
}

export interface EmployeeLeaveBalance {
  id: string;
  employee_id: string;
  policy_year: number;
  leave_type: LeaveType;
  entitled_days: number;
  carried_forward_days: number;
  accrued_days: number;
  used_days: number;
  reserved_days: number;
  adjustment_days: number;
  available_days: number;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationPolicy {
  id: string;
  timezone: string;
  standard_start_time: string;
  standard_end_time: string;
  grace_minutes: number;
  maximum_shift_minutes: number;
  stale_shift_cutoff_time: string;
  weekend_days: number[];
  geofence_required: boolean;
  allow_offsite: boolean;
  office_lat?: number | null;
  office_lng?: number | null;
  geofence_radius_meters?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface HolidayRecord {
  id: string;
  holiday_date: string;
  name: string;
  scope: string;
  is_optional: boolean;
  created_at?: string;
}

export interface LeaveBreakdown {
  calendar_days: number;
  weekend_days: number;
  holiday_days: number;
  chargeable_days: number;
  holidays: Array<{ date: string; name: string }>;
  weekends: Array<{ date: string; day: string }>;
}

export type RecipientMode = 'individual' | 'team';
export type AllocationMode = 'per_person' | 'total_pool';

export interface IncentiveBatch {
  id: string;
  recipient_mode: RecipientMode;
  team_id?: string | null;
  team_name_snapshot?: string | null;
  allocation_mode: AllocationMode;
  incentive_type: string;
  description?: string | null;
  internal_note?: string | null;
  effective_date: string;
  payroll_month?: number | null;
  payroll_year?: number | null;
  total_amount_paise: number;
  per_person_amount_paise?: number | null;
  eligible_member_count: number;
  excluded_member_count: number;
  status: string;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  reversed_by?: string | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  idempotency_key?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  allocations?: IncentiveAllocation[];
}

export interface IncentiveAllocation {
  id: string;
  batch_id: string;
  employee_id: string;
  employee_name_snapshot: string;
  employee_code_snapshot?: string | null;
  team_id_snapshot?: string | null;
  team_name_snapshot?: string | null;
  amount_paise: number;
  status: string;
  salary_record_id?: string | null;
  payroll_line_item_id?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  batch?: Partial<IncentiveBatch>;
}

export interface PayrollLineItem {
  id: string;
  salary_record_id: string;
  employee_id: string;
  source_type: 'incentive' | 'allowance' | 'deduction' | 'adjustment';
  source_id?: string | null;
  label: string;
  amount_paise: number;
  taxable: boolean;
  created_at: string;
}

