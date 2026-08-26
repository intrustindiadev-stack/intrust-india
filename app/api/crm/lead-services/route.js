import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { z } from 'zod';

const SERVICE_STATUSES = ['interested', 'pitched', 'negotiating', 'won', 'lost'];

const createServiceSchema = z.object({
    lead_id: z.string().uuid(),
    service_name: z.string().min(1).max(150),
    status: z.enum(SERVICE_STATUSES).default('interested'),
});

const updateServiceSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(SERVICE_STATUSES).optional(),
    deal_value: z.number().min(0).optional(),
});

/**
 * Helper: verify caller can access the lead associated with a service.
 * Returns the service row, or null if unauthorized.
 */
async function authorizeService(serviceId, userId, isManager, adminClient) {
    const { data: svc, error } = await adminClient
        .from('crm_lead_services')
        .select('id, lead_id, crm_leads!inner(assigned_to, created_by)')
        .eq('id', serviceId)
        .single();

    if (error || !svc) return null;
    if (isManager) return svc;

    const lead = svc.crm_leads;
    if (lead.assigned_to === userId || lead.created_by === userId) return svc;
    return null;
}

/**
 * GET /api/crm/lead-services?lead_id=UUID
 * Fetch all services for a given lead.
 */
export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const leadId = url.searchParams.get('lead_id');
        if (!leadId) {
            return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(profile?.role);

        // RBAC: verify caller can see this lead
        let leadQuery = adminClient
            .from('crm_leads')
            .select('id, assigned_to, created_by')
            .eq('id', leadId);

        if (!isManager) {
            leadQuery = leadQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }
        const { data: lead } = await leadQuery.single();
        if (!lead) {
            return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 403 });
        }

        const { data, error } = await adminClient
            .from('crm_lead_services')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ services: data || [] });
    } catch (err) {
        console.error('[LEAD SERVICES GET]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/crm/lead-services
 * Create a new service intent for a lead.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const parsed = createServiceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(profile?.role);

        // RBAC: verify the caller can write to this lead
        let leadQuery = adminClient
            .from('crm_leads')
            .select('id')
            .eq('id', parsed.data.lead_id);
        if (!isManager) {
            leadQuery = leadQuery.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
        }
        const { data: lead } = await leadQuery.single();
        if (!lead) {
            return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 403 });
        }

        // Prevent duplicate active services for the same lead
        const { data: existing } = await adminClient
            .from('crm_lead_services')
            .select('id')
            .eq('lead_id', parsed.data.lead_id)
            .ilike('service_name', parsed.data.service_name)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Service already added for this lead', serviceId: existing.id }, { status: 409 });
        }

        const { data, error } = await adminClient
            .from('crm_lead_services')
            .insert({
                lead_id: parsed.data.lead_id,
                service_name: parsed.data.service_name,
                status: parsed.data.status,
            })
            .select('*')
            .single();

        if (error) throw error;
        return NextResponse.json({ service: data }, { status: 201 });
    } catch (err) {
        console.error('[LEAD SERVICES POST]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/crm/lead-services
 * Update the status (and optionally deal_value) of a service intent.
 * Body: { id: UUID, status?: enum, deal_value?: number }
 */
export async function PATCH(request) {
    try {
        const body = await request.json();
        const parsed = updateServiceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
        }

        const { id, ...updates } = parsed.data;
        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(profile?.role);

        const svc = await authorizeService(id, user.id, isManager, adminClient);
        if (!svc) {
            return NextResponse.json({ error: 'Service not found or access denied' }, { status: 403 });
        }

        const { data, error } = await adminClient
            .from('crm_lead_services')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;
        return NextResponse.json({ service: data });
    } catch (err) {
        console.error('[LEAD SERVICES PATCH]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/crm/lead-services?id=UUID
 * Delete a specific service — with proper RBAC.
 */
export async function DELETE(request) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(profile?.role);

        const svc = await authorizeService(id, user.id, isManager, adminClient);
        if (!svc) {
            return NextResponse.json({ error: 'Service not found or access denied' }, { status: 403 });
        }

        const { error } = await adminClient
            .from('crm_lead_services')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[LEAD SERVICES DELETE]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
