import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { valid_assignments } = await request.json();

        if (!Array.isArray(valid_assignments) || valid_assignments.length === 0) {
            return NextResponse.json({ error: 'No valid assignments provided' }, { status: 400 });
        }

        // We group leads by newRepId to optimize calls to the RPC
        const assignMap = {};
        for (const a of valid_assignments) {
            if (!assignMap[a.newRepId]) assignMap[a.newRepId] = [];
            assignMap[a.newRepId].push(a.lead_id);
        }

        let totalAffected = 0;
        const failedRepBatches = [];

        for (const [newRepId, leadIds] of Object.entries(assignMap)) {
            // Chunk into 5000 max as required by the RPC
            for (let i = 0; i < leadIds.length; i += 5000) {
                const chunk = leadIds.slice(i, i + 5000);
                
                // RPC expects the authenticated client, so it can resolve auth.uid()
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('crm_bulk_assign_leads', {
                        p_lead_ids: chunk,
                        p_new_rep_id: newRepId,
                    });

                if (rpcError || !rpcData?.success) {
                    console.error('[Execute Assign] failed for rep', newRepId, rpcError || rpcData?.error);
                    failedRepBatches.push(`Failed assigning ${chunk.length} leads to ${newRepId}`);
                } else {
                    totalAffected += rpcData.affected_count;
                }
            }
        }

        return NextResponse.json({
            success: true,
            success_count: totalAffected,
            failed_batches: failedRepBatches
        });

    } catch (err) {
        console.error('[Bulk Assign Execute Error]', err);
        return NextResponse.json({ error: 'Failed to execute assignments' }, { status: 500 });
    }
}
