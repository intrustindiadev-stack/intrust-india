import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { IncentiveRecipientQuerySchema } from '@/lib/hrm/validation';

const HR_ROLES = ['hr_manager', 'admin', 'super_admin'];

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, { status: 401 });
        }

        if (!HR_ROLES.includes(profile?.role)) {
            return NextResponse.json({ success: false, code: 'FORBIDDEN', error: 'Forbidden. HR Access required.' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const teamId = searchParams.get('team_id');
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

        // Fetch Eligible Employees
        let empQuery = admin
            .from('user_profiles')
            .select('id, full_name, email, employee_id, role, department')
            .eq('is_suspended', false)
            .in('role', [
                'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
                'freelancer', 'video_editor', 'social_media_manager',
                'seo_specialist', 'advertiser', 'support_agent', 'admin'
            ]);

        if (search) {
            empQuery = empQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,employee_id.ilike.%${search}%`);
        }

        if (teamId) {
            // Filter by team membership
            const { data: teamMembers } = await admin
                .from('team_members')
                .select('user_id')
                .eq('team_id', teamId);
            const userIds = (teamMembers || []).map(m => m.user_id);
            if (userIds.length > 0) {
                empQuery = empQuery.in('id', userIds);
            } else {
                return NextResponse.json({ success: true, employees: [], teams: [] });
            }
        }

        empQuery = empQuery.order('full_name', { ascending: true }).limit(limit);

        // Fetch Active Teams
        let teamQuery = admin
            .from('teams')
            .select('id, name, region_level, state, city, team_lead_id')
            .eq('is_active', true);

        if (search) {
            teamQuery = teamQuery.ilike('name', `%${search}%`);
        }
        teamQuery = teamQuery.order('name', { ascending: true }).limit(20);

        const [{ data: employees, error: empErr }, { data: teams, error: teamErr }] = await Promise.all([
            empQuery,
            teamQuery
        ]);

        if (empErr) throw empErr;
        if (teamErr) throw teamErr;

        const response = NextResponse.json({
            success: true,
            employees: employees || [],
            teams: teams || []
        });

        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return response;

    } catch (err) {
        console.error('[API] Recipients Search Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
