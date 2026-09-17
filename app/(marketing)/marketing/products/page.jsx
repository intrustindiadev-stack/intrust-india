import { createServerSupabaseClient } from '@/lib/supabaseServer';
import ProductMarketingClient from './ProductMarketingClient';

export default async function ProductMarketingPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check user profile & merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    let merchant = null;
    let merchantInventory = [];

    if (isMerchant) {
        const { data: m } = await supabase
            .from('merchants')
            .select('id, business_name')
            .eq('user_id', user.id)
            .maybeSingle();
        merchant = m;

        if (merchant?.id) {
            const { data: inv } = await supabase
                .from('merchant_inventory')
                .select('id, product_name, price, stock_quantity, image_url')
                .eq('merchant_id', merchant.id)
                .limit(50);
            merchantInventory = inv || [];
        }
    }

    // Fetch InTrust platform products
    const { data: platformProducts } = await supabase
        .from('shopping_products')
        .select('id, name, title, price, wholesale_price_paise, promo_cashback_paise, referral_cashback_paise, image_url, category_id, is_active')
        .eq('is_active', true)
        .limit(50);

    // Fetch rewards config
    const { data: settings } = await supabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'rewards_config')
        .maybeSingle();

    return (
        <ProductMarketingClient
            user={user}
            merchant={merchant}
            isMerchant={isMerchant}
            initialPlatformProducts={platformProducts || []}
            initialMerchantInventory={merchantInventory || []}
            rewardsConfig={settings?.value || {}}
        />
    );
}
