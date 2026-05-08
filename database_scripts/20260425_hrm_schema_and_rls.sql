-- ==========================================
-- HRM Schema (HR & Employees) - LIVE DESIGN
-- ==========================================
--
-- ARCHITECTURE NOTE:
-- The HRM module uses the `user_profiles` table as the employee identity source
-- (not a separate `employees` table).
--
-- HRM-specific fields (department, employee_id, joining_date, employment_type, city, base_salary)
-- are columns on `user_profiles`.
--
-- `attendance`, `leave_requests`, and `salary_records` use `employee_id UUID REFERENCES public.user_profiles(id)`.
--
-- The `employees`, `attendance_logs`, `leave_balances`, `audit_logs_hrm` tables exist in the DB
-- but are NOT used by the current application and should be considered for future migration or removal.
-- ==========================================

-- Leave Status ENUM
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Leave Type ENUM
CREATE TYPE leave_type AS ENUM ('casual', 'sick', 'earned', 'unpaid');

-- Attendance Table (Live)
CREATE TABLE public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status TEXT DEFAULT 'present' NOT NULL,
    override_by UUID REFERENCES public.user_profiles(id),
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Leave Requests Table (Live)
CREATE TABLE public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES public.user_profiles(id),
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Records Table (Live)
CREATE TABLE public.salary_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_salary NUMERIC DEFAULT 0,
    hra NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payslip_url TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- Training Materials Table (Live)
CREATE TABLE public.training_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    type TEXT NOT NULL, -- e.g., 'pdf', 'video', 'link'
    url TEXT NOT NULL,
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Job Roles Table (Live)
CREATE TABLE public.career_job_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Applications Table (Live)
CREATE TABLE public.career_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_role_id UUID REFERENCES public.career_job_roles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    resume_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HRM RLS Policies (Live)
-- ==========================================

-- Attendance
CREATE POLICY "employee_insert_attendance"
    ON public.attendance FOR INSERT
    WITH CHECK (employee_id = auth.uid());

CREATE POLICY "employee_view_own_attendance"
    ON public.attendance FOR SELECT
    USING (employee_id = auth.uid());

CREATE POLICY "hr_all_attendance"
    ON public.attendance FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr', 'hr_manager', 'admin', 'super_admin')
    );

-- Leave Requests
CREATE POLICY "employee_insert_leave"
    ON public.leave_requests FOR INSERT
    WITH CHECK (employee_id = auth.uid());

CREATE POLICY "employee_view_own_leaves"
    ON public.leave_requests FOR SELECT
    USING (employee_id = auth.uid());

CREATE POLICY "hr_all_leaves"
    ON public.leave_requests FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr', 'hr_manager', 'admin', 'super_admin')
    );

-- Salary Records
CREATE POLICY "employee_view_own_salary"
    ON public.salary_records FOR SELECT
    USING (employee_id = auth.uid());

CREATE POLICY "hr_all_salary"
    ON public.salary_records FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr', 'hr_manager', 'admin', 'super_admin')
    );


-- ==========================================
-- FUTURE / NOT DEPLOYED (Unused Tables)
-- ==========================================

-- Employee Status ENUM
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'terminated');

-- Attendance Status ENUM
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'leave');

-- Employees Table
CREATE TABLE public.employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) UNIQUE, -- Link to user profile
    emp_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    department TEXT,
    designation TEXT,
    date_of_joining DATE,
    reporting_manager_id UUID REFERENCES auth.users(id),
    status employee_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee Documents Table
CREATE TABLE public.employee_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- e.g., 'kyc', 'nda', 'contract', 'payslip'
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Logs Table
CREATE TABLE public.attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    status attendance_status DEFAULT 'present' NOT NULL,
    override_by UUID REFERENCES auth.users(id),
    override_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Leave Balances Table
CREATE TABLE public.leave_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    casual_total NUMERIC DEFAULT 0,
    casual_used NUMERIC DEFAULT 0,
    sick_total NUMERIC DEFAULT 0,
    sick_used NUMERIC DEFAULT 0,
    earned_total NUMERIC DEFAULT 0,
    earned_used NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, year)
);

-- Audit Logs HRM Table
CREATE TABLE public.audit_logs_hrm (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
