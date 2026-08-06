import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { z } from 'zod';

const createRemarkSchema = z.object({
    content: z.string().min(1).max(5000),
    is_internal: z.boolean().optional().default(false),
    follow_up_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const updateRemarkSchema = z.object({
    content: z.string().min(1).max(5000).optional(),
    is_internal: z.boolean().optional(),
    follow_up_at: z.string().datetime({ offset: true }).nullable().optional(),
    remark_id: z.string().uuid(),
});

/**
 * GET /api/crm/leads/[id]/remarks
 * List all remarks for a lead (ordered by created_at DESC)
 */
export async function GET(request, { params }) {
    try {
        const { id: leadId } = await params;
        const supabase = await createServerSupabaseClient();

        const { data, error } = await supabase
            .from('crm_lead_remarks')
            .select(`
                id,
                lead_id,
                author_id,
                content,
                is_internal,
                follow_up_at,
                edited_at,
                edit_history,
                created_at,
                updated_at,
                author:user_profiles!author_id (
                    id,
                    full_name,
                    role,
                    avatar_url
                )
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ remarks: data || [] });
    } catch (err) {
        console.error('[REMARKS GET]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/crm/leads/[id]/remarks
 * Create a new remark on a lead
 */
export async function POST(request, { params }) {
    try {
        const { id: leadId } = await params;
        const body = await request.json();
        const parsed = createRemarkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('crm_lead_remarks')
            .insert({
                lead_id: leadId,
                author_id: user.id,
                content: parsed.data.content,
                is_internal: parsed.data.is_internal,
                follow_up_at: parsed.data.follow_up_at || null,
            })
            .select(`
                id, lead_id, author_id, content, is_internal,
                follow_up_at, edited_at, created_at,
                author:user_profiles!author_id (id, full_name, role, avatar_url)
            `)
            .single();

        if (error) throw error;
        return NextResponse.json({ remark: data }, { status: 201 });
    } catch (err) {
        console.error('[REMARKS POST]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/crm/leads/[id]/remarks
 * Edit a remark (preserves edit history)
 */
export async function PATCH(request, { params }) {
    try {
        const { id: leadId } = await params;
        const body = await request.json();
        const parsed = updateRemarkSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch existing remark to build edit_history
        const { data: existing, error: fetchError } = await supabase
            .from('crm_lead_remarks')
            .select('id, content, edit_history, author_id')
            .eq('id', parsed.data.remark_id)
            .eq('lead_id', leadId)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Remark not found' }, { status: 404 });
        }

        // Build new edit history entry
        const editHistoryEntry = {
            content: existing.content,
            edited_at: new Date().toISOString(),
            edited_by: user.id,
        };

        const currentHistory = Array.isArray(existing.edit_history) ? existing.edit_history : [];

        const updatePayload = {};
        if (parsed.data.content !== undefined) {
            updatePayload.content = parsed.data.content;
            updatePayload.edited_at = new Date().toISOString();
            updatePayload.edit_history = [...currentHistory, editHistoryEntry];
        }
        if (parsed.data.is_internal !== undefined) updatePayload.is_internal = parsed.data.is_internal;
        if (parsed.data.follow_up_at !== undefined) updatePayload.follow_up_at = parsed.data.follow_up_at;

        const { data, error } = await supabase
            .from('crm_lead_remarks')
            .update(updatePayload)
            .eq('id', parsed.data.remark_id)
            .eq('lead_id', leadId)
            .select(`
                id, lead_id, author_id, content, is_internal,
                follow_up_at, edited_at, edit_history, created_at, updated_at,
                author:user_profiles!author_id (id, full_name, role, avatar_url)
            `)
            .single();

        if (error) throw error;
        return NextResponse.json({ remark: data });
    } catch (err) {
        console.error('[REMARKS PATCH]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/crm/leads/[id]/remarks?remark_id=UUID
 * Delete a specific remark
 */
export async function DELETE(request, { params }) {
    try {
        const { id: leadId } = await params;
        const url = new URL(request.url);
        const remarkId = url.searchParams.get('remark_id');
        if (!remarkId) {
            return NextResponse.json({ error: 'remark_id is required' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();

        const { error } = await supabase
            .from('crm_lead_remarks')
            .delete()
            .eq('id', remarkId)
            .eq('lead_id', leadId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[REMARKS DELETE]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
