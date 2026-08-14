import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { getAuthorizedTeamScope } from '@/lib/teamAuth';

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user || !profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the authorized team scope for the current user using the server-side teamAuth logic
        const scope = await getAuthorizedTeamScope(user, profile, admin);

        // Fetch eligible reps using admin client
        let query = admin
            .from('user_profiles')
            .select('id, full_name, role, email, team_id')
            .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
            .order('full_name', { ascending: true });

        // Apply team scoping
        if (scope.authorizedTeamIds !== null) {
            if (scope.authorizedTeamIds.length === 0) {
                // If they have no teams, they should only see themselves
                query = query.eq('id', user.id);
            } else {
                // Return eligible members of their authorized teams, OR themselves
                query = query.or(`team_id.in.(${scope.authorizedTeamIds.join(',')}),id.eq.${user.id}`);
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('[API] Reps Fetch Error:', error);
            return NextResponse.json({ error: 'Failed to fetch representatives' }, { status: 500 });
        }

        return NextResponse.json({ reps: data || [] });
    } catch (err) {
        console.error('[API] Reps Unexpected Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
