import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Store, Tag, AlertCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import MerchantProductForm from '../../new/MerchantProductForm';

export const dynamic = 'force-dynamic';

export default async function MerchantEditProductPage({ params }) {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchant) {
        redirect('/merchant-status');
    }

    // Fetch the product to edit, ensuring it belongs to this merchant
    const { data: product, error: productError } = await supabase
        .from('shopping_products')
        .select(`
            *,
            merchant_inventory (*)
        `)
        .eq('id', id)
        .eq('submitted_by_merchant_id', merchant.id)
        .single();

    if (productError || !product) {
        console.error('Failed to load product or unauthorized', productError);
        redirect('/merchant/shopping/inventory');
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/5 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                        <Tag size={12} />
                        Custom Product
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-slate-100 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        Edit <span className="text-purple-600">Product</span>
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 font-medium text-sm max-w-md">
                        Update your custom product details and re-submit for approval.
                    </p>
                </div>
            </div>

            {product.approval_status === 'rejected' && product.rejection_reason && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-0.5" size={20} />
                    <div>
                        <h3 className="font-black text-red-800 text-sm mb-1 uppercase tracking-widest">Rejection Reason</h3>
                        <p className="text-red-700 text-sm font-medium">{product.rejection_reason}</p>
                        <p className="text-red-500 text-xs mt-2 font-bold">Please address the issues above and re-submit.</p>
                    </div>
                </div>
            )}

            <MerchantProductForm merchantId={merchant.id} editMode={true} existingProduct={product} />
        </div>
    );
}
