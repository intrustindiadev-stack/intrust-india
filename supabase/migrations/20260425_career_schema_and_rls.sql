-- ==========================================
-- Career Applications Schema
-- ==========================================

-- Job Roles Table (admin configures available positions)
CREATE TABLE IF NOT EXISTS public.career_job_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('freelancer', 'agent', 'dsa', 'sales', 'other')),
    description TEXT,
    requirements TEXT,
    commission_structure TEXT,
    location TEXT DEFAULT 'Pan India',
    is_active BOOLEAN DEFAULT TRUE,
    panel_access TEXT, -- which panel they get after approval: 'crm', 'employee', 'merchant', null
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Career Applications Table
CREATE TABLE IF NOT EXISTS public.career_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_role_id UUID REFERENCES public.career_job_roles(id),
    role_category TEXT NOT NULL CHECK (role_category IN ('freelancer', 'agent', 'dsa', 'sales', 'other')),
    
    -- Applicant Details
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    city TEXT,
    state TEXT,
    
    -- Professional Details
    experience_years INT DEFAULT 0,
    current_occupation TEXT,
    education TEXT,
    languages_known TEXT[],
    
    -- Application
    cover_message TEXT,
    referral_code TEXT,
    
    -- Status & Admin Review
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    panel_access_granted TEXT, -- 'crm', 'employee', 'merchant', null
    access_granted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.career_job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies for career_job_roles
-- ==========================================

-- Anyone can view active job roles
CREATE POLICY "Anyone can view active job roles"
    ON public.career_job_roles FOR SELECT
    USING (is_active = TRUE);

-- Only admins can manage job roles
CREATE POLICY "Admins can manage job roles"
    ON public.career_job_roles FOR ALL
    USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- ==========================================
-- RLS Policies for career_applications
-- ==========================================

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
    ON public.career_applications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can submit applications (one per role)
CREATE POLICY "Users can insert applications"
    ON public.career_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their pending applications
CREATE POLICY "Users can update pending applications"
    ON public.career_applications FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view and manage all applications
CREATE POLICY "Admins can manage all applications"
    ON public.career_applications FOR ALL
    USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- ==========================================
-- Seed: Default Job Roles
-- ==========================================

INSERT INTO public.career_job_roles (title, category, description, requirements, commission_structure, location, panel_access) VALUES
(
    'Freelance Financial Consultant',
    'freelancer',
    'Earn money by referring customers for loans, insurance, and financial products. Work from anywhere, at your own pace.',
    '• Age 18+\n• Smartphone with internet\n• Basic communication skills\n• No prior experience needed',
    '• ₹500–₹5,000 per successful loan referral\n• 1–2% commission on insurance products\n• Monthly bonus for top performers',
    'Pan India',
    'crm'
),
(
    'Field Sales Agent',
    'agent',
    'Join our ground-level sales force. Build your network and earn commissions by onboarding new merchants and customers.',
    '• Age 21+\n• Own vehicle preferred\n• Strong communication skills\n• Willingness to travel locally',
    '• ₹800–₹2,000 per merchant onboarded\n• 0.5% on monthly merchant GMV\n• Target-based quarterly bonus',
    'Pan India',
    'crm'
),
(
    'Direct Selling Agent (DSA)',
    'dsa',
    'Become an authorized DSA partner and distribute financial products including credit cards, personal loans, and business loans.',
    '• Age 21+\n• Previous sales or banking experience preferred\n• Own laptop/smartphone\n• IRDA/AMFI certification a plus',
    '• 0.5–2.5% of loan disbursement amount\n• ₹300–₹1,500 per credit card activation\n• Monthly payout with no cap',
    'Pan India',
    'crm'
),
(
    'Digital Marketing Freelancer',
    'freelancer',
    'Help Intrust grow its digital presence. Create content, manage campaigns, and earn per project or on a retainer basis.',
    '• Portfolio of past work\n• Experience with social media / content creation\n• Knowledge of basic SEO/paid ads a plus',
    '• Project-based: ₹3,000–₹25,000 per campaign\n• Retainer options available\n• Performance bonuses for lead generation',
    'Remote',
    null
),
(
    'Merchant Acquisition Agent',
    'agent',
    'Help local businesses discover Intrust''s merchant panel. Earn high commissions for every merchant you bring on board.',
    '• Age 18+\n• Existing local business network a plus\n• Good negotiation and follow-up skills',
    '• ₹1,000–₹3,000 per active merchant\n• Recurring commission on their sales\n• Top agent recognition program',
    'Pan India',
    'merchant'
);
