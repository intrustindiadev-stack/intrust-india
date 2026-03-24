import { createServerSupabaseClient } from '@/lib/supabaseServer';
import ProductForm from '../../ProductForm';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }) {
    const supabase = await createServerSupabaseClient();
    const { id } = await params;

    const { data: product, error } = await supabase
        .from('shopping_products')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !product) {
        console.error('Error fetching product for edit:', error);
        notFound();
    }

    return (
        <div className="p-6 lg:p-10 max-w-5xl mx-auto">
            <Link 
                href="/admin/shopping"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-6 transition-colors"
            >
                <ChevronLeft size={16} />
                Back to Products
            </Link>

            <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Edit Product</h1>
                <p className="text-slate-500 mt-1 font-medium text-sm line-clamp-1">{product.title}</p>
            </div>

            <ProductForm initialData={product} />
        </div>
    );
}
