import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import CartClient from "./CartClient";
import Navbar from "@/components/layout/Navbar";

export default async function CartPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/shop/cart");
  }

  // Fetch Platform Store status
  const { data: platformSettings } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'platform_store')
    .single();

  let platformStatus = { is_open: true };
  if (platformSettings?.value) {
    try { platformStatus = JSON.parse(platformSettings.value); } catch(e) {}
  }

  const { data: deliveryFeeSetting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_fee_paise').single();
  const { data: minOrderSetting }    = await supabase.from('platform_settings').select('value').eq('key', 'min_order_value_paise').single();

  const deliveryFeePaise = deliveryFeeSetting?.value ? parseInt(deliveryFeeSetting.value, 10) : 9900;
  const minOrderValuePaise = minOrderSetting?.value ? parseInt(minOrderSetting.value, 10) : 49900;

  return (
    <div className="min-h-screen">
      <Navbar />
      <CartClient 
        userId={user.id} 
        initialPlatformStatus={platformStatus} 
        deliveryFeePaise={deliveryFeePaise}
        minOrderValuePaise={minOrderValuePaise}
      />
    </div>
  );
}
