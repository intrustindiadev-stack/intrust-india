import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { LeadFilterSchema } from '@/lib/crm/validation';

export async function GET(request) {
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

        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
        }

        const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(profile.role);
        const isExec = profile.role === 'relationship_exec';

        if (!isManager && !isExec) {
            return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
        }

        // Parse query params
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        // Array params
        const parseArrayParam = (key) => url.searchParams.getAll(key).filter(Boolean);
        if (url.searchParams.has('status')) queryParams.status = parseArrayParam('status');
        if (url.searchParams.has('assignee')) queryParams.assignee = parseArrayParam('assignee');
        if (url.searchParams.has('source')) queryParams.source = parseArrayParam('source');
        if (url.searchParams.has('temperature')) queryParams.temperature = parseArrayParam('temperature');

        const parsed = LeadFilterSchema.safeParse(queryParams);
        
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.issues }, { status: 400 });
        }

        const filters = parsed.data;
        const limit = filters.limit;
        const page = filters.page;
        const offset = (page - 1) * limit;

        let query = adminClient.from('crm_leads').select('*', { count: 'exact' });

        // RBAC Filter
        if (!isManager) {
            query = query.eq('assigned_to', user.id);
        }

        // Archiving
        if (!filters.includeArchived) {
            query = query.is('archived_at', null);
        }

        // Exclude App Users from the CRM leads page
        query = query.neq('source', 'App User');

        // Apply filters
        if (filters.status && filters.status.length > 0) {
            query = query.in('status', filters.status);
        }

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

        if (filters.source && filters.source.length > 0) {
            query = query.in('source', filters.source);
        }

        if (filters.temperature && filters.temperature.length > 0) {
            query = query.in('temperature', filters.temperature);
        }

        if (filters.minDealValue !== undefined) {
            query = query.gte('deal_value', filters.minDealValue);
        }

        if (filters.maxDealValue !== undefined) {
            query = query.lte('deal_value', filters.maxDealValue);
        }

        if (filters.fromDate) {
            query = query.gte('created_at', filters.fromDate);
        }

        if (filters.toDate) {
            query = query.lte('created_at', filters.toDate);
        }

        if (filters.search) {
            const search = filters.search.trim().replace(/[%_]/g, '\\$&'); // Escape special chars
            query = query.or(`contact_name.ilike.%${search}%,title.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        // Sorting
        switch (filters.sort) {
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'recently_updated':
                query = query.order('updated_at', { ascending: false });
                break;
            case 'name_asc':
                query = query.order('contact_name', { ascending: true });
                break;
            case 'value_desc':
                query = query.order('deal_value', { ascending: false });
                break;
            case 'value_asc':
                query = query.order('deal_value', { ascending: true });
                break;
            case 'next_followup':
                query = query.order('next_followup_date', { ascending: true, nullsFirst: false });
                break;
            case 'newest':
            default:
                query = query.order('created_at', { ascending: false });
                break;
        }

        // Tie breaker
        query = query.order('id', { ascending: true });

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, count, error } = await query;

        if (error) {
            console.error('[API] CRM Leads Error:', error);
            return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
        }

        // Enrich with user profile names for assigned reps efficiently
        let enrichedData = data || [];
        const assigneeIds = [...new Set(enrichedData.map(l => l.assigned_to).filter(Boolean))];
        if (assigneeIds.length > 0) {
            const { data: repProfiles } = await adminClient
                .from('user_profiles')
                .select('id, full_name, role')
                .in('id', assigneeIds);
            
            const repMap = {};
            (repProfiles || []).forEach(r => repMap[r.id] = r);

            enrichedData = enrichedData.map(l => ({
                ...l,
                user_profiles: l.assigned_to ? repMap[l.assigned_to] : null
            }));
        }

        // We can optionally compute facets here or in a separate call if it's too slow.
        // For now, we will return basic pagination structure.
        return NextResponse.json({
            data: enrichedData,
            pagination: {
                page,
                pageSize: limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                hasNext: offset + limit < (count || 0),
                hasPrevious: page > 1,
            },
            appliedFilters: filters,
        });

    } catch (err) {
        console.error('[API] CRM Leads Unexpected Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
