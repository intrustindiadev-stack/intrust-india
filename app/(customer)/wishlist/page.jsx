import { createServerSupabaseClient } from '@/lib/supabaseServer';
import WishlistClient from './WishlistClient';
import { redirect } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export const metadata = { title: 'My Wishlist — InTrust' };

export default async function WishlistPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: wishlistItems, error } = await supabase
    .from('user_wishlists')
    .select(`
      id, added_at, is_platform_item, inventory_id,
      shopping_products ( id, title, product_images, category, suggested_retail_price_paise, mrp_paise ),
      merchants ( id, business_name ),
      merchant_inventory ( retail_price_paise )
    `)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) console.error('Wishlist fetch error:', error);

  return (
    <main className="min-h-screen pb-20 md:pb-0 bg-[#f7f8fa]">
      <Navbar />
      <WishlistClient userId={user.id} initialItems={wishlistItems || []} />
      <CustomerBottomNav />
    </main>
  );
}
