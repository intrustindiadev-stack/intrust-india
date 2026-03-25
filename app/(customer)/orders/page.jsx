import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import OrdersClient from "./OrdersClient";
import Navbar from "@/components/layout/Navbar";
import CustomerBottomNav from "@/components/layout/customer/CustomerBottomNav";
import Breadcrumbs from "@/components/giftcards/Breadcrumbs";

export default async function CustomerOrdersPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/orders");
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] dark:bg-[#080a10] font-[family-name:var(--font-outfit)] transition-colors">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-[12vh] sm:pt-[15vh] pb-24">
        <div className="mb-4 sm:mb-8">
            <Breadcrumbs items={[{ label: 'Orders' }]} />
        </div>
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-gray-100 mb-1 tracking-tight">Order History</h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-base">Track and manage your purchases.</p>
        </div>

        <OrdersClient userId={user.id} />
      </main>
      
      <CustomerBottomNav />
    </div>
  );
}
