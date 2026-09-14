import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { z } from 'zod';
import { fireAndForgetEmail } from '@/lib/email/dispatch';
import { sendCRMAlert } from '@/lib/email';

const convertSchema = z.object({
    type:      z.enum(['customer', 'merchant']),
    target_id: z.string().uuid('target_id must be a valid UUID'),
    notes:     z.string().max(2000).nullable().optional(),
});

/**
 * POST /api/crm/leads/[id]/convert
 *
 * Body: { type: 'customer' | 'merchant', target_id: UUID, notes?: string }
 *
 * Calls the appropriate SECURITY DEFINER RPC which enforces:
 *   - Authentication
 *   - CRM role authorization (relationship_exec / relationship_manager / admin / super_admin)
 *   - RBAC scope (exec → own leads only; manager → team leads; admin → all)
 *   - Identity match between lead and target entity (phone or email)
 *   - Duplicate conversion prevention (DB-level unique index)
 *   - Activity logging
 *
 * Returns: { success: boolean, lead_id, user_id | merchant_id, lifecycle_status, message }
 *
 * Does NOT:
 *   - Create new auth accounts
 *   - Create user_profiles stubs
 *   - Approve merchants
 *   - Backfill historical leads
 */
export async function POST(request, { params }) {
    try {
        const { id: leadId } = await params;
        const body = await request.json();

        // Validate input shape
        const parsed = convertSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: parsed.error.format() },
                { status: 400 }
            );
        }

        const { type, target_id, notes } = parsed.data;

        const supabase = await createServerSupabaseClient();

        // Verify caller is authenticated (RPC also verifies, but fail fast)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Call the appropriate SECURITY DEFINER RPC
        let rpcResult;
        if (type === 'customer') {
            const { data, error } = await supabase.rpc('crm_convert_lead_to_customer', {
                p_lead_id: leadId,
                p_user_id: target_id,
                p_notes:   notes ?? null,
            });
            if (error) throw error;
            rpcResult = data;
        } else {
            const { data, error } = await supabase.rpc('crm_convert_lead_to_merchant', {
                p_lead_id:     leadId,
                p_merchant_id: target_id,
                p_notes:       notes ?? null,
            });
            if (error) throw error;
            rpcResult = data;
        }

        if (!rpcResult?.success) {
            // Determine appropriate HTTP status from error message
            const errorMsg = rpcResult?.error || 'Conversion failed';
            let status = 400;
            if (errorMsg.includes('Unauthorized')) status = 401;
            else if (errorMsg.includes('Forbidden')) status = 403;
            else if (errorMsg.includes('not found')) status = 404;

            return NextResponse.json({ error: errorMsg }, { status });
        }

        // Fire-and-forget email alert to rep
        fireAndForgetEmail(async () => {
            const { data: lead } = await supabase
                .from('crm_leads')
                .select('contact_name, full_name, assigned_to')
                .eq('id', leadId)
                .maybeSingle();

            const leadName = lead?.contact_name || lead?.full_name || 'Lead';
            const repUserId = lead?.assigned_to || user.id;

            const { data: repProf } = await supabase
                .from('user_profiles')
                .select('email, full_name')
                .eq('id', repUserId)
                .maybeSingle();

            if (repProf?.email) {
                await sendCRMAlert({
                    type: 'lead_converted',
                    to: repProf.email,
                    data: {
                        repName: repProf.full_name || 'Representative',
                        leadName,
                        type,
                    },
                    actorId: user.id,
                    metadata: { leadId, type, target_id },
                });
            }
        }, { category: 'crm_lead', entityId: leadId });

        return NextResponse.json(rpcResult, { status: 200 });
    } catch (err) {
        console.error('[CONVERT]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
