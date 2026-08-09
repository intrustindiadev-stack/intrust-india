import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

/**
 * GET /api/crm/leads/[id]/conversion-check?type=customer|merchant
 *
 * Server-side duplicate check. Calls the appropriate SECURITY DEFINER RPC
 * to find a matching customer or merchant for this lead based on phone/email.
 *
 * Returns:
 *   { found: boolean, entity: {...} | null, message?: string, already_claimed?: boolean }
 *
 * This route does NOT mutate any data.
 */
export async function GET(request, { params }) {
    try {
        const { id: leadId } = await params;
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        if (!type || !['customer', 'merchant'].includes(type)) {
            return NextResponse.json(
                { error: 'Missing or invalid ?type= parameter. Expected: customer | merchant' },
                { status: 400 }
            );
        }

        const supabase = await createServerSupabaseClient();

        // Verify caller is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Call the appropriate SECURITY DEFINER RPC
        const rpcName = type === 'customer'
            ? 'crm_check_customer_for_lead'
            : 'crm_check_merchant_for_lead';

        const { data: result, error: rpcError } = await supabase
            .rpc(rpcName, { p_lead_id: leadId });

        if (rpcError) {
            console.error(`[CONVERSION-CHECK][${type}]`, rpcError);
            return NextResponse.json({ error: rpcError.message }, { status: 500 });
        }

        if (result?.error) {
            // RPC returned a business logic error
            const status = result.error.includes('Unauthorized') || result.error.includes('Forbidden') ? 403 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        // Normalise response shape
        const response = {
            found: result?.found ?? false,
            existing_leads_info: result?.existing_leads_info ?? null,
            message: result?.message ?? null,
        };

        if (type === 'customer' && result?.user) {
            response.entity = result.user;
        } else if (type === 'merchant' && result?.merchant) {
            response.entity = result.merchant;
        } else {
            response.entity = null;
        }

        return NextResponse.json(response);
    } catch (err) {
        console.error('[CONVERSION-CHECK]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
