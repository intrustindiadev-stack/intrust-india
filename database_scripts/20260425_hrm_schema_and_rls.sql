-- ==========================================
-- HRM Schema (HR & Employees)
-- ==========================================

-- Employee Status ENUM
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'terminated');

-- Leave Status ENUM
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Leave Type ENUM
CREATE TYPE leave_type AS ENUM ('casual', 'sick', 'earned', 'unpaid');

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

-- Leave Requests Table
CREATE TABLE public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Salary Records Table
CREATE TABLE public.salary_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    basic NUMERIC DEFAULT 0,
    hra NUMERIC DEFAULT 0,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    net_pay NUMERIC DEFAULT 0,
    payslip_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- Training Materials Table
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

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs_hrm ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HRM RLS Policies
-- ==========================================

-- Employees
CREATE POLICY "Employees can view own profile, HR/Admins can view all"
    ON public.employees FOR SELECT
    USING (
        user_id = auth.uid() OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "HR/Admins can insert/update employees"
    ON public.employees FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Employee Documents
CREATE POLICY "Employees can view own documents, HR/Admins can view all"
    ON public.employee_documents FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()) OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "HR/Admins can manage employee documents"
    ON public.employee_documents FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Attendance Logs
CREATE POLICY "Employees can view own attendance, HR/Admins can view all"
    ON public.attendance_logs FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()) OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "Employees can insert own attendance"
    ON public.attendance_logs FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
    );

CREATE POLICY "HR/Admins can update attendance"
    ON public.attendance_logs FOR UPDATE
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Leave Requests
CREATE POLICY "Employees can view own leaves, HR/Admins can view all"
    ON public.leave_requests FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()) OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "Employees can insert own leaves"
    ON public.leave_requests FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
    );

CREATE POLICY "HR/Admins can update leaves"
    ON public.leave_requests FOR UPDATE
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Leave Balances
CREATE POLICY "Employees can view own leave balances, HR/Admins can view all"
    ON public.leave_balances FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()) OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "HR/Admins can manage leave balances"
    ON public.leave_balances FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Salary Records
CREATE POLICY "Employees can view own salary records, HR/Admins can view all"
    ON public.salary_records FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.user_id = auth.uid()) OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "HR/Admins can manage salary records"
    ON public.salary_records FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Training Materials
CREATE POLICY "All authenticated users can view active training materials"
    ON public.training_materials FOR SELECT
    USING (
        is_active = true OR 
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "HR/Admins can manage training materials"
    ON public.training_materials FOR ALL
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

-- Audit Logs HRM
CREATE POLICY "HR/Admins can view audit logs"
    ON public.audit_logs_hrm FOR SELECT
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_admin', 'admin', 'super_admin')
    );

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs_hrm FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
    );
