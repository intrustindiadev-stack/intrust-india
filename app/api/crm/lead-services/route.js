import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { z } from 'zod';

const createServiceSchema = z.object({
    lead_id: z.string().uuid(),
    service_name: z.string().min(1),
    status: z.string().default('interested'),
});

const deleteServiceSchema = z.object({
    id: z.string().uuid(),
});

/**
 * POST /api/crm/lead-services
 * Create a new service for a lead
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

        const { data, error } = await supabase
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
 * DELETE /api/crm/lead-services?id=UUID
 * Delete a specific service
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

        const { error } = await supabase
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
