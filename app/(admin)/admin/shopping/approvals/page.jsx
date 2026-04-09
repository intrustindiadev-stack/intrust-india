import { createAdminClient } from '@/lib/supabaseServer';
import ApprovalQueueClient from './ApprovalQueueClient';

export const metadata = {
    title: 'Custom Product Approvals | InTrust Admin',
};

export default async function AdminProductApprovalsPage() {
    const supabase = createAdminClient();

    // Fetch products pending approval
    const { data: pendingProducts, error } = await supabase
        .from('shopping_products')
        .select(`
            *,
            merchant_inventory (
                id, stock_quantity, retail_price_paise,
                merchants (
                    id, business_name, user_id
                )
            )
        `)
        .eq('approval_status', 'pending_approval')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending products:', error);
    }

    return <ApprovalQueueClient initialProducts={pendingProducts || []} />;
}
