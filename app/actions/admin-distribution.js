'use server';

import { createAdminClient } from '@/lib/supabaseServer';

export async function fetchLeadDistributionStats() {
    try {
        const { createServerSupabaseClient } = await import('@/lib/supabaseServer');
        const supabase = await createServerSupabaseClient();
        
        // Use the authenticated client for the RPC so auth.uid() is populated correctly
        const { data: rpcData, error: rpcError } = await supabase.rpc('crm_territory_dashboard');
        
        if (rpcError) {
            console.error('[admin-distribution] Error fetching territory dashboard stats:', rpcError);
            return { error: 'Failed to fetch distribution stats' };
        }
        
        // Use head: true queries to get exact counts without downloading all rows (and avoiding the 1000 row cap)
        const getCount = async (filterBuilder, name) => {
            const { count, error } = await filterBuilder
                .is('archived_at', null)
                .neq('source', 'Users')
                .neq('source', 'App User');
            if (error) {
                console.error(`[admin-distribution] Error in getCount for ${name}:`, error);
                throw error;
            }
            return count || 0;
        };

        const baseSelect = () => supabase.from('crm_leads').select('*', { count: 'exact', head: true });

        const [assigned, unassigned, reroutePending] = await Promise.all([
            getCount(baseSelect().neq('assigned_to', null), 'assigned'),
            getCount(baseSelect().is('assigned_to', null), 'unassigned'),
            getCount(baseSelect().eq('routing_status', 'reroute_pending'), 'reroutePending')
        ]);

        return {
            data: {
                total: rpcData?.total || 0,
                assigned: assigned,
                unassigned: unassigned,
                unmatched: rpcData?.unmatched || 0,
                manual: rpcData?.manual || 0,
                auto: rpcData?.auto || 0,
                reroute_pending: reroutePending
            }
        };
    } catch (err) {
        console.error('[admin-distribution] Unexpected error in fetchLeadDistributionStats:', err);
        return { error: 'An unexpected error occurred' };
    }
}

export async function fetchExtendedLeadsForDistribution(page = 1, search = '', filter = 'all', teamId = null, limit = 20) {
    try {
        const { createServerSupabaseClient } = await import('@/lib/supabaseServer');
        const supabase = await createServerSupabaseClient();
        const adminClient = createAdminClient();
        const offset = (Math.max(1, page) - 1) * limit;

        let query = supabase
            .from('crm_leads')
            .select(`
                id, title, contact_name, phone, email, status, assigned_to, assigned_team_id, 
                created_at, source, routing_status, territory_match_type,
                state, city, area, zone, pincode
            `, { count: 'exact' })
            .is('archived_at', null)
            .neq('source', 'Users')
            .neq('source', 'App User')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (filter === 'unassigned') {
            query = query.is('assigned_to', null);
        } else if (filter === 'reroute_pending') {
            query = query.eq('routing_status', 'reroute_pending');
        } else if (filter === 'needs_action') {
            query = query.in('routing_status', ['reroute_pending', 'unmatched']);
        }

        if (teamId) {
            query = query.eq('assigned_team_id', teamId);
        }

        if (search) {
            query = query.or(`contact_name.ilike.%${search}%,title.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, count, error: queryError } = await query;

        if (queryError) {
            console.error('[admin-distribution] Error fetching extended leads:', queryError);
            return { error: 'Failed to fetch leads' };
        }

        // Resolve assigned rep names and team names
        const assignedIds = [...new Set((data || []).map(l => l.assigned_to).filter(Boolean))];
        const assignedTeamIds = [...new Set((data || []).map(l => l.assigned_team_id).filter(Boolean))];
        
        let repMap = {};
        if (assignedIds.length > 0) {
            const { data: profiles } = await adminClient
                .from('user_profiles')
                .select('id, full_name')
                .in('id', assignedIds);
            (profiles || []).forEach(p => { repMap[p.id] = p.full_name; });
        }

        let teamMap = {};
        if (assignedTeamIds.length > 0) {
            const { data: teams } = await adminClient
                .from('teams')
                .select('id, name')
                .in('id', assignedTeamIds);
            (teams || []).forEach(t => { teamMap[t.id] = t.name; });
        }

        const enriched = (data || []).map(l => ({
            ...l,
            assigned_rep_name: l.assigned_to ? (repMap[l.assigned_to] || 'Unknown') : null,
            assigned_team_name: l.assigned_team_id ? (teamMap[l.assigned_team_id] || 'Unknown') : null,
        }));

        return { data: enriched, total: count || 0 };
    } catch (err) {
        console.error('[admin-distribution] Unexpected error in fetchExtendedLeads:', err);
        return { error: 'An unexpected error occurred' };
    }
}

export async function fetchRoutingDiagnosis(pincode, zone, area, city, state) {
    try {
        const adminClient = createAdminClient();
        
        const { data, error } = await adminClient.rpc('crm_preview_team_for_location', {
            p_pincode: pincode,
            p_zone: zone,
            p_area: area,
            p_city: city,
            p_state: state
        });

        if (error) {
            console.error('[admin-distribution] Error fetching routing diagnosis:', error);
            return { error: 'Failed to diagnose routing' };
        }

        return { data };
    } catch (err) {
        console.error('[admin-distribution] Unexpected error in fetchRoutingDiagnosis:', err);
        return { error: 'An unexpected error occurred' };
    }
}

export async function fetchRoutingLog(leadId) {
    try {
        const adminClient = createAdminClient();
        
        const { data, error } = await adminClient
            .from('crm_lead_routing_log')
            .select(`
                id, lead_id, from_team_id, to_team_id, match_type, reason, created_at,
                actor_id,
                actor:user_profiles!actor_id(full_name),
                from_team:teams!from_team_id(name),
                to_team:teams!to_team_id(name)
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[admin-distribution] Error fetching routing log:', error);
            return { error: 'Failed to fetch routing history' };
        }

        return { data: data || [] };
    } catch (err) {
        console.error('[admin-distribution] Unexpected error in fetchRoutingLog:', err);
        return { error: 'An unexpected error occurred' };
    }
}

export async function fetchTeamWorkloadSummary() {
    try {
        const adminClient = createAdminClient();
        
        // Get all active teams
        const { data: teams, error: teamsError } = await adminClient
            .from('teams')
            .select('id, name, region_level, state, city, area')
            .eq('is_active', true);
            
        if (teamsError) throw teamsError;
        
        // Get all team members count per team
        const { data: members, error: membersError } = await adminClient
            .from('team_members')
            .select('team_id');
            
        if (membersError) throw membersError;
        
        const memberCounts = members.reduce((acc, m) => {
            acc[m.team_id] = (acc[m.team_id] || 0) + 1;
            return acc;
        }, {});
        
        // Get open leads per team
        const { data: leads, error: leadsError } = await adminClient
            .from('crm_leads')
            .select('assigned_team_id, status, routing_status')
            .is('archived_at', null)
            .neq('source', 'Users')
            .neq('source', 'App User');
            
        if (leadsError) throw leadsError;
        
        const workload = teams.map(t => {
            const teamLeads = leads.filter(l => l.assigned_team_id === t.id);
            const openLeads = teamLeads.filter(l => !['won', 'lost'].includes(l.status));
            const pendingLeads = teamLeads.filter(l => l.routing_status === 'reroute_pending');
            
            return {
                ...t,
                member_count: memberCounts[t.id] || 0,
                total_leads: teamLeads.length,
                open_leads: openLeads.length,
                pending_leads: pendingLeads.length
            };
        });
        
        // Sort by open leads descending
        workload.sort((a, b) => b.open_leads - a.open_leads);
        
        return { data: workload };
    } catch (err) {
        console.error('[admin-distribution] Unexpected error in fetchTeamWorkloadSummary:', err);
        return { error: 'An unexpected error occurred' };
    }
}

export async function checkReroutePreview() {
    try {
        const adminClient = createAdminClient();
        
        // Get count of reroute_pending leads
        const { count: pendingCount, error: countError } = await adminClient
            .from('crm_leads')
            .select('*', { count: 'exact', head: true })
            .in('routing_status', ['unmatched', 'reroute_pending'])
            .is('archived_at', null);
            
        if (countError) throw countError;
        
        return {
            data: {
                total_pending: pendingCount || 0,
                expected_matches: 'Unknown', // We would need a complex query to preview matches, for now we just show total
                expected_unresolved: 'Unknown'
            }
        };
    } catch (err) {
        console.error('[admin-distribution] Unexpected error in checkReroutePreview:', err);
        return { error: 'An unexpected error occurred' };
    }
}
