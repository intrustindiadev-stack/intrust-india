import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Tags, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import CategoryForm from '../../CategoryForm';

export const dynamic = 'force-dynamic';

export default async function EditCategoryPage({ params }) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: category, error } = await supabase
        .from('shopping_categories')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !category) {
        return notFound();
    }

    return (
        <div className="p-8 lg:p-12 max-w-5xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">
            <div className="mb-12">
                <Link 
                    href="/admin/shopping/categories"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-colors mb-6"
                >
                    <ArrowLeft size={14} /> Back to Categories
                </Link>
                
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                        <Tags size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none mb-2">Edit Category</h1>
                        <p className="text-slate-500 font-medium tracking-tight truncate max-w-sm">Updating settings for "{category.name}"</p>
                    </div>
                </div>
            </div>

            <CategoryForm initialData={category} />
        </div>
    );
}
