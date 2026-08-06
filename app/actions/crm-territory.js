'use server';

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getAuthorizedTeamScope } from '@/lib/teamAuth';

export async function overrideLeadTerritory(leadId, newTeamId) {
    try {
        const supabase = await createServerSupabaseClient();
        
        // Ensure user is manager/admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');
        
        // Let's do a basic role check
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (!['admin', 'super_admin', 'relationship_manager'].includes(profile?.role)) {
            throw new Error('Only managers can manually override territories');
        }

        const { data, error } = await supabase
            .from('crm_leads')
            .update({
                assigned_team_id: newTeamId,
                routing_status: 'manual_override',
                territory_match_type: null // Not matched by area type anymore
            })
            .eq('id', leadId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, lead: data };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
}
