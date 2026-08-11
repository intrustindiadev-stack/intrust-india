import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { BulkAssignSchema } from '@/lib/crm/validation';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || !['relationship_manager', 'admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Unauthorized: Admin or Relationship Manager access required' }, { status: 403 });
        }

        const body = await request.json();
        const parsed = BulkAssignSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
        }

        const { selectAllMatching, explicitIds, excludedIds, newRepId, filters } = parsed.data;

        let targetLeadIds = [];

        if (selectAllMatching && filters) {
            // Build the query to resolve all matching IDs securely
            let query = adminClient.from('crm_leads').select('id');
            
            // Archiving
            if (!filters.includeArchived) {
                query = query.is('archived_at', null);
            }

            // Status
            if (filters.status && filters.status.length > 0) {
                query = query.in('status', filters.status);
            }

            // Assignee
            if (filters.assignee && filters.assignee.length > 0) {
                const assigneeConditions = [];
                const ids = [];
                for (const a of filters.assignee) {
                    if (a === 'unassigned') assigneeConditions.push('assigned_to.is.null');
                    else if (a === 'me') ids.push(user.id);
                    else ids.push(a);
                }
                if (ids.length > 0) {
                    assigneeConditions.push(`assigned_to.in.(${ids.join(',')})`);
                }
                if (assigneeConditions.length > 0) {
                    query = query.or(assigneeConditions.join(','));
                }
            }

            // Source
            if (filters.source && filters.source.length > 0) {
                query = query.in('source', filters.source);
            }

            // Temperature
            if (filters.temperature && filters.temperature.length > 0) {
                query = query.in('temperature', filters.temperature);
            }

            // Ranges

            if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
            if (filters.toDate) query = query.lte('created_at', filters.toDate);

            // Search
            if (filters.search) {
                const search = filters.search.trim().replace(/[%_]/g, '\\$&');
                query = query.or(`contact_name.ilike.%${search}%,title.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
            }

            // Fetch max 5000 records
            query = query.limit(5000);
            const { data: matchingLeads, error: queryError } = await query;

            if (queryError) {
                console.error('[API] Bulk Assign Query Error:', queryError);
                return NextResponse.json({ error: 'Failed to resolve matching leads' }, { status: 500 });
            }

            targetLeadIds = (matchingLeads || []).map(l => l.id).filter(id => !excludedIds.includes(id));
        } else {
            targetLeadIds = explicitIds;
        }

        if (targetLeadIds.length === 0) {
            return NextResponse.json({ error: 'No eligible leads selected' }, { status: 400 });
        }
        
        if (targetLeadIds.length > 5000) {
             return NextResponse.json({ error: 'Cannot assign more than 5000 leads at once' }, { status: 400 });
        }

        // Call the SECURITY DEFINER RPC using the authenticated user client so auth.uid() is populated
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('crm_bulk_assign_leads', {
                p_lead_ids: targetLeadIds,
                p_new_rep_id: newRepId,
            });

        if (rpcError) {
            console.error('[API] crm_bulk_assign_leads RPC error:', rpcError);
            return NextResponse.json({ error: 'Database error: ' + rpcError.message }, { status: 500 });
        }

        if (!rpcData?.success) {
            return NextResponse.json({ error: rpcData?.error || 'Unknown database error' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: rpcData.message,
            affected_count: rpcData.affected_count
        });

    } catch (err) {
        console.error('[API] Bulk Assign Unexpected Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
