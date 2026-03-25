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
    <div className="min-h-screen">
      <Navbar />
      <CartClient userId={user.id} />
    </div>
  );
}
