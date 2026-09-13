import { createServerSupabaseClient } from '@/lib/supabaseServer';
import WishlistClient from './WishlistClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export const metadata = { title: 'My Wishlist — InTrust' };

export default async function WishlistPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let wishlistItems = [];

  // Primary fetch with relations
  try {
    const { data, error } = await supabase
      .from('user_wishlists')
      .select(`
        id, added_at, is_platform_item, inventory_id, variant_id, product_id, merchant_id,
        shopping_products ( id, slug, title, product_images, category, suggested_retail_price_paise, platform_price_paise, mrp_paise, admin_stock ),
        fashion_variants ( id, sku, size, color, fit, fabric, price_paise, compare_at_price_paise, inventory_quantity, is_active ),
        merchants ( id, business_name ),
        merchant_inventory ( retail_price_paise, stock_quantity, is_active )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.warn('Wishlist deep query error, falling back to base query:', error.message);
      // Fallback: Query base wishlists and fetch products directly
      const { data: baseWishlists } = await supabase
        .from('user_wishlists')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (baseWishlists && baseWishlists.length > 0) {
        const productIds = baseWishlists.map(w => w.product_id).filter(Boolean);
        const { data: prods } = await supabase
          .from('shopping_products')
          .select('id, slug, title, product_images, category, suggested_retail_price_paise, platform_price_paise, mrp_paise, admin_stock')
          .in('id', productIds);

        const prodMap = new Map((prods || []).map(p => [p.id, p]));
        wishlistItems = baseWishlists.map(w => ({
          ...w,
          shopping_products: prodMap.get(w.product_id) || null
        }));
      }
    } else {
      wishlistItems = data || [];
    }
  } catch (err) {
    console.error('Unexpected error fetching wishlist:', err);
  }

  return (
    <main className="w-full pb-20 md:pb-0">
      <WishlistClient userId={user.id} userEmail={user.email} initialItems={wishlistItems} />
    </main>
  );
}

