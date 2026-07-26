export type HRMRole =
  | 'employee'
  | 'sales_exec'
  | 'sales_manager'
  | 'hr_manager'
  | 'admin'
  | 'super_admin';

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid';

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
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus;
  override_by?: string | null;
  override_reason?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  is_onsite?: boolean | null;
  created_at?: string;
  user_profiles?: Partial<EmployeeProfile>;
}

export interface LeaveRequestRecord {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  reviewed_by?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  user_profiles?: Partial<EmployeeProfile>;
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: 'pending' | 'processed';
  payslip_url?: string | null;
  processed_at?: string | null;
  created_at?: string;
  user_profiles?: Partial<EmployeeProfile>;
}

export interface CandidateApplication {
  id: string;
  job_role_id?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  resume_url: string;
  role_category?: string | null;
  status: 'pending' | 'under_review' | 'interview_scheduled' | 'offer_sent' | 'hired' | 'rejected';
  notes?: string | null;
  offered_salary?: number | null;
  created_at?: string;
}
