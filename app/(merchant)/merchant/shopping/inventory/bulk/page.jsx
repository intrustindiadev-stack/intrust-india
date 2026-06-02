import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import BulkProductPage from './BulkProductPage';

export const dynamic = 'force-dynamic';

export default async function BulkAddProductsPage() {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant } = await supabase
        .from('merchants')
        .select('id, subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/merchant-status');

    // Compute subscription state to gate the bulk feature on the client
    const now = new Date();
    const isSubscribed =
        merchant.subscription_status === 'active' &&
        merchant.subscription_expires_at &&
        new Date(merchant.subscription_expires_at) > now;

    return <BulkProductPage merchantId={merchant.id} isSubscribed={isSubscribed} />;
}
