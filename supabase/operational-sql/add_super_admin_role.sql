-- Add super_admin role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create admin_tasks table
CREATE TABLE IF NOT EXISTS public.admin_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    assigned_by UUID REFERENCES auth.users(id),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_tasks
CREATE POLICY "Admins can view their tasks" ON public.admin_tasks FOR SELECT USING (auth.uid() = assigned_to);
CREATE POLICY "Super admins can view all tasks" ON public.admin_tasks FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'));
CREATE POLICY "Super admins can manage all tasks" ON public.admin_tasks FOR ALL USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'));

-- Create indices
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned_to ON public.admin_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON public.admin_tasks(status);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
