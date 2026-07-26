import { z } from 'zod';

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
  role: z.enum(['employee', 'sales_exec', 'sales_manager', 'hr_manager', 'admin', 'super_admin']),
});

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

export const LeaveRequestSchema = z.object({
  leave_type: z.enum(['casual', 'sick', 'earned', 'unpaid']),
  from_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  to_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
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
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type ProcessSalaryInput = z.infer<typeof ProcessSalarySchema>;
export type LeaveRequestInput = z.infer<typeof LeaveRequestSchema>;
export type CandidateHireInput = z.infer<typeof CandidateHireSchema>;
