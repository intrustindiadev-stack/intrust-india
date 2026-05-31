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
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/merchant-status');

    return <BulkProductPage merchantId={merchant.id} />;
}
