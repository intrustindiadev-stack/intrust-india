import { createServerSupabaseClient } from '@/lib/supabaseServer';
import MerchantProductForm from './MerchantProductForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewMerchantProductPage() {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/merchant-status');

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto">
            <Link 
                href="/merchant/shopping/inventory"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest mb-8 transition-colors"
            >
                <ChevronLeft size={16} />
                Back to Shop
            </Link>

            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Add Custom Product</h1>
                <p className="text-slate-500 mt-2 font-medium">List a product that you source independently</p>
            </div>

            <MerchantProductForm merchantId={merchant.id} />
        </div>
    );
}
