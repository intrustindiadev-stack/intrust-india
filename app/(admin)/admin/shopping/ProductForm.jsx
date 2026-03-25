'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Loader2, Plus, ArrowRight, Package, Upload, Save } from 'lucide-react';

export default function ProductForm({ initialData = null }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        wholesale_price_paise: initialData?.wholesale_price_paise ? (initialData.wholesale_price_paise / 100).toString() : '',
        suggested_retail_price_paise: initialData?.suggested_retail_price_paise ? (initialData.suggested_retail_price_paise / 100).toString() : '',
        mrp_paise: initialData?.mrp_paise ? (initialData.mrp_paise / 100).toString() : (initialData?.suggested_retail_price_paise ? (initialData.suggested_retail_price_paise / 100).toString() : ''),
        admin_stock: initialData?.admin_stock?.toString() || '0',
        gst_percentage: initialData?.gst_percentage?.toString() || '0',
        hsn_code: initialData?.hsn_code || '',
        image_url: initialData?.image_url || '',
        is_active: initialData?.is_active ?? true,
    });

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('shopping_categories')
                .select('id, name')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            if (!error && data) {
                setCategories(data);
            }
        };
        fetchCategories();
    }, []);

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
            // Find the selected category object from the categories array
            const selectedCategory = categories.find(cat => cat.name === formData.category);
            const categoryId = selectedCategory ? selectedCategory.id : null;

            const payload = {
                ...formData,
                wholesale_price_paise: Math.round(parseFloat(formData.wholesale_price_paise) * 100),
                suggested_retail_price_paise: Math.round(parseFloat(formData.suggested_retail_price_paise) * 100),
                mrp_paise: Math.round(parseFloat(formData.mrp_paise) * 100),
                admin_stock: parseInt(formData.admin_stock),
                gst_percentage: parseInt(formData.gst_percentage || 0),
                hsn_code: formData.hsn_code || null,
                category_id: categoryId, // Pass the category ID
            };

            let res;
            if (initialData?.id) {
                res = await fetch('/api/admin/shopping/products', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: initialData.id, ...payload }),
                });
            } else {
                res = await fetch('/api/admin/shopping/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to save product');

            toast.success(initialData?.id ? 'Product updated successfully' : 'Product added successfully');
            router.push('/admin/shopping');
            router.refresh();
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error(error.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Basic Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Basic Information</h3>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Title</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Premium Noise Cancelling Headphones"
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                            >
                                <option value="" disabled>Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Describe the product details..."
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Status & Visibility</h3>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div>
                                <p className="text-sm font-bold text-slate-900">Active Status</p>
                                <p className="text-xs text-slate-500">Visible to merchants in wholesale hub</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Pricing & Stock */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Wholesale & Stock</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Wholesale Price (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        name="wholesale_price_paise"
                                        value={formData.wholesale_price_paise}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Platform Stock</label>
                                <input
                                    type="number"
                                    name="admin_stock"
                                    value={formData.admin_stock}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Selling Price (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        name="suggested_retail_price_paise"
                                        value={formData.suggested_retail_price_paise}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Official MRP (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        name="mrp_paise"
                                        value={formData.mrp_paise}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-blue-600 bg-blue-50/30"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1 italic">Used for "DMart-style" discount display</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">GST Percentage (%)</label>
                                <select
                                    name="gst_percentage"
                                    value={formData.gst_percentage}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                                >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">HSN/SAC Code (Optional)</label>
                                <input
                                    type="text"
                                    name="hsn_code"
                                    value={formData.hsn_code}
                                    onChange={handleChange}
                                    placeholder="e.g. 123456"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Media</h3>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Image URL</label>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <input
                                        type="url"
                                        name="image_url"
                                        value={formData.image_url}
                                        onChange={handleChange}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="text-slate-400 w-5 h-5" />
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic font-medium">Please provide a direct link to an image (JPEG, PNG, WEBP)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-all border border-slate-200"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    <span>{initialData ? 'Update Product' : 'Create Product'}</span>
                </button>
            </div>
        </form>
    );
}
