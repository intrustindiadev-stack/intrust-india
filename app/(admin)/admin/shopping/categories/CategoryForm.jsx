'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Loader2, Save, Tags, Palette, Eye, ArrowRight } from 'lucide-react';

// No longer using fixed gradients list

export default function CategoryForm({ initialData = null }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        description: initialData?.description || '',
        image_url: initialData?.image_url || '',
        color_primary: initialData?.color_primary || '#3b82f6',
        color_secondary: initialData?.color_secondary || '#4f46e5',
        display_order: initialData?.display_order?.toString() || '0',
        is_active: initialData?.is_active ?? true,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const displayOrder = parseInt(formData.display_order) || 0;
            const payload = { ...formData, display_order: displayOrder };

            if (initialData) {
                const { error } = await supabase
                    .from('shopping_categories')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
                toast.success('Category updated safely.');
            } else {
                const { error } = await supabase
                    .from('shopping_categories')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Category created elegantly.');
            }

            router.push('/admin/shopping/categories');
            router.refresh();
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error(error.message || 'Failed to gracefully execute operation');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${initialData.name}? Products in this category might need to be reassigned.`)) return;
        
        setLoading(true);
        try {
            const { error } = await supabase
                .from('shopping_categories')
                .delete()
                .eq('id', initialData.id);
            
            if (error) throw error;
            toast.success('Category deleted.');
            router.push('/admin/shopping/categories');
            router.refresh();
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error(error.message || 'Failed to delete category');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Visual Details */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Tags size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Category Identity</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Books"
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold placeholder:text-slate-300"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Brief description for subtitle..."
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium resize-none placeholder:text-slate-300"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Display Order</label>
                                <input
                                    type="number"
                                    name="display_order"
                                    value={formData.display_order}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                />
                                <p className="text-[10px] font-black text-slate-400 mt-2 px-1">Lower numbers appear first (e.g. 10, 20).</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aesthetic Selection */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Palette size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Aesthetics</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Image URL</label>
                                <input
                                    type="url"
                                    name="image_url"
                                    value={formData.image_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                />
                                {formData.image_url && (
                                    <div className="mt-4 w-16 h-16 rounded-2xl overflow-hidden border border-slate-200">
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Primary Color (Hex)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            name="color_primary"
                                            value={formData.color_primary}
                                            onChange={handleChange}
                                            className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            name="color_primary"
                                            value={formData.color_primary}
                                            onChange={handleChange}
                                            placeholder="#3b82f6"
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 font-mono text-xs uppercase"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Secondary Color (Hex)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            name="color_secondary"
                                            value={formData.color_secondary}
                                            onChange={handleChange}
                                            className="w-12 h-12 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            name="color_secondary"
                                            value={formData.color_secondary}
                                            onChange={handleChange}
                                            placeholder="#4f46e5"
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 font-mono text-xs uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Theme Preview</label>
                                <div 
                                    className="h-16 rounded-2xl w-full border border-slate-100 shadow-inner" 
                                    style={{ background: `linear-gradient(to right, ${formData.color_primary}, ${formData.color_secondary})` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Eye size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Visibility</h3>
                        </div>

                        <label className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <h4 className="font-bold text-slate-900">Active Category</h4>
                                <p className="text-xs font-bold text-slate-400">Available across the storefront</p>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-slate-100">
                {initialData ? (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-600 border border-red-100 transition-all disabled:opacity-50"
                    >
                        Delete Category
                    </button>
                ) : (
                    <div />
                )}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2c5282] text-white px-12 py-4 rounded-2xl font-black transition-all disabled:opacity-50 shadow-xl shadow-blue-900/20"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                        <span>{initialData ? 'Update Category' : 'Create Category'}</span>
                    </button>
                </div>
            </div>
        </form>
    );
}
