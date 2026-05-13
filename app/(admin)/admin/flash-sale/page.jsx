import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import FlashSaleManagerClient from './FlashSaleManagerClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Flash Sale — InTrust Admin',
    description: 'Manage flash sale items and discounts',
};

export default async function FlashSalePage() {
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) redirect('/login');

    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        redirect('/admin');
    }

    const { data: initialItems } = await adminSupabase
        .from('flash_sale_items')
        .select(`
            id, product_id, discount_percent, sale_price_paise, position,
            is_active, starts_at, ends_at, created_by, created_at, updated_at,
            shopping_products:product_id (
                id, slug, title, product_images,
                mrp_paise, suggested_retail_price_paise, admin_stock, is_active
            )
        `)
        .order('is_active', { ascending: false })
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <FlashSaleManagerClient initialItems={initialItems || []} />
        </div>
    );
}
