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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Your Shopping Cart</h1>
          <p className="text-gray-400 max-w-2xl">Review your selections from our premium merchant network and proceed to a secure, wallet-integrated checkout.</p>
        </div>

        <CartClient userId={user.id} />
      </main>
    </div>
  );
}
