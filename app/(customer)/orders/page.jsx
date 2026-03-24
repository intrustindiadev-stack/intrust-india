import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import OrdersClient from "./OrdersClient";
import Navbar from "@/components/layout/Navbar";

export default async function CustomerOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/orders");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-2">Order History</h1>
          <p className="text-gray-400">Track and manage your premium purchases from InTrust merchants.</p>
        </div>

        <OrdersClient userId={user.id} />
      </main>
    </div>
  );
}
