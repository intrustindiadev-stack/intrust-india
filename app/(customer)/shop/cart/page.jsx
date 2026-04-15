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

  return (
    <div className="min-h-screen">
      <Navbar />
      <CartClient userId={user.id} initialPlatformStatus={platformStatus} />
    </div>
  );
}
