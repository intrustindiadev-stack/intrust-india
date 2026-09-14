import { createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import MerchantReviewsClient from "./MerchantReviewsClient";

export const dynamic = 'force-dynamic';

export default async function MerchantReviewsPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: merchant } = await supabase
        .from("merchants")
        .select("id, business_name, status, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (!merchant) redirect("/merchant-apply");

    if (merchant.status !== 'approved') {
        if (merchant.status === 'pending') redirect('/merchant-status/pending');
        if (merchant.status === 'rejected') redirect('/merchant-status/rejected');
        if (merchant.status === 'suspended') redirect('/merchant-status/suspended');
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            <MerchantReviewsClient merchant={merchant} user={user} />
        </div>
    );
}
