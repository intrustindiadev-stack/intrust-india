DROP TABLE IF EXISTS panel_access_requests;
CREATE TABLE panel_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
    requested_role TEXT NOT NULL,
    department TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    reporting_manager_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    requested_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    rejected_reason TEXT,
    notes TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE panel_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all access requests" ON panel_access_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "HR can read access requests" ON panel_access_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role IN ('hr_manager'))
);
CREATE POLICY "Users can read their own access requests" ON panel_access_requests FOR SELECT USING (
    user_id = auth.uid()
);
CREATE POLICY "HR can create access requests" ON panel_access_requests FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role IN ('hr_manager'))
);
CREATE POLICY "Admins can update access requests" ON panel_access_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Create index for faster lookup
CREATE INDEX idx_panel_access_requests_user_id ON panel_access_requests(user_id);
CREATE INDEX idx_panel_access_requests_status ON panel_access_requests(status);
