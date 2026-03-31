import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { Tags, Plus, LayoutGrid, ChevronRight, Edit2 } from 'lucide-react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
    const supabase = await createServerSupabaseClient();
    
    const { data: categories, error } = await supabase
        .from('shopping_categories')
        .select('*')
        .order('display_order', { ascending: true });

    if (error) console.error('Error fetching categories:', error);

    const activeCount = categories?.filter(c => c.is_active).length || 0;

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto bg-[#f8f9fb] min-h-screen font-[family-name:var(--font-outfit)]">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <Tags size={12} className="text-blue-600" />
                        Platform Configuration
                    </div>
                    <h1 className="text-5xl font-black text-slate-950 tracking-tight leading-none font-[family-name:var(--font-outfit)]">
                        Category <span className="text-blue-600">Manager</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg max-w-md">
                        Control the catalog structure and storefront discovery experience.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Link 
                        href="/admin/shopping"
                        className="group flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 pl-4 pr-5 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        <div className="bg-slate-100 p-1.5 rounded-xl text-slate-500 group-hover:text-blue-600 transition-colors">
                            <ChevronRight size={18} className="rotate-180" />
                        </div>
                        <span>Back to Catalog</span>
                    </Link>

                    <Link 
                        href="/admin/shopping/categories/new"
                        className="group flex items-center gap-2 bg-slate-950 hover:bg-blue-600 text-white pl-5 pr-4 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-slate-950/10 active:scale-95"
                    >
                        <span>New Category</span>
                        <div className="bg-white/10 p-1.5 rounded-xl group-hover:rotate-90 transition-transform">
                            <Plus size={18} />
                        </div>
                    </Link>
                </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {categories?.length === 0 ? (
                    <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <LayoutGrid className="mx-auto text-slate-100 mb-4" size={64} />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No categories found</p>
                    </div>
                ) : (
                    categories?.map((cat) => {
                        return (
                            <Link 
                                href={`/admin/shopping/categories/edit/${cat.id}`}
                                key={cat.id} 
                                className="group relative bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-blue-600/5 transition-all flex flex-col items-center text-center overflow-hidden"
                            >
                                {/* Decorative Gradient Blobs */}
                                <div 
                                    className="absolute -top-10 -right-10 w-32 h-32 opacity-0 group-hover:opacity-10 transition-opacity duration-700 blur-2xl" 
                                    style={{ background: `linear-gradient(to bottom right, #3b82f6, #60a5fa)` }}
                                />
                                
                                <div className="absolute top-4 right-4 p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100">
                                    <Edit2 size={16} />
                                </div>

                                <div className="absolute top-4 left-4">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${cat.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {cat.is_active ? 'Active' : 'Hidden'}
                                    </span>
                                </div>

                                <div className={`w-20 h-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-900/5 group-hover:scale-110 transition-transform duration-500 mt-6 mb-4 relative z-10 border border-slate-100`}>
                                    {cat.image_url ? (
                                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div 
                                            className="w-full h-full opacity-30 bg-blue-500" 
                                        />
                                    )}
                                </div>
                                
                                <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">{cat.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 leading-tight uppercase tracking-widest opacity-80 mb-4">
                                    Order: {cat.display_order}
                                </p>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}
